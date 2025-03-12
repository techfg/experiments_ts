import esbuild from "esbuild"
import fs from "node:fs/promises"


interface WorkerPluginSetupConfig {
	/** the path-name filters which should be used for capturing worker scripts.
	 * 
	 * @defaultValue `[/\.worker(\.[cm]?[jt][sx])?$/, /\?worker$/]` (captures ".worker" js/ts files, and paths ending with the "?worker" suffix)
	*/
	filters: RegExp[]

	/** in addition to the path-name filters, you can inspect the `"with"` import attributes of the incoming resource,
	 * to decide if it should be processed by this plugin.
	 * 
	 * @defaultValue `() => true` (no filteration occurs, and all resources pass though)
	*/
	withFilter: (with_attributes: Record<string, string>) => boolean

	/** add an additional filter which ensures that only desired `namespace`s are processed.
	 * esbuild's default namespaces are `""` and `"file"`.
	 * 
	 * @defaultValue `() => true` (no filteration occurs, and resources from all `namespace`s pass though)
	*/
	namespaceFilter: (namespace: string) => boolean

	/** rename the path string of the incoming resource.
	 * this could be useful for stripping away suffixes, such as the conventional `"?worker"` suffix used by some popular bundlers.
	 * 
	 * @defaultValue `(path) => path.replace(/\?worker$/, "")` (strips away any "?worker" suffix)
	*/
	rename: (path: string) => string
}

const defaultWorkerPluginSetupConfig: WorkerPluginSetupConfig = {
	filters: [/\.worker(\.[cm]?[jt][sx])?$/, /\?worker$/],
	withFilter: (() => true),
	namespaceFilter: (() => true),
	rename: ((path) => path.replace(/\?worker$/, "")),
}

const workerPluginSetup = (config: Partial<WorkerPluginSetupConfig>) => {
	const
		{ filters, withFilter, namespaceFilter, rename } = { ...defaultWorkerPluginSetupConfig, ...config },
		ALREADY_CAPTURED = Symbol("[workerPluginSetup]: already captured by resolver."),
		plugin_ns = "oazmi-worker"

	return async (build: esbuild.PluginBuild): Promise<void> => {
		const
			{ plugins: _0, entryPoints: _1, ...rest_initial_options } = build.initialOptions

		filters.forEach((filter) => {
			build.onResolve({ filter }, async (args): Promise<esbuild.OnResolveResult | undefined> => {
				const
					{ path, pluginData = {}, ...rest_args } = args,
					{ with: with_arg, namespace } = rest_args
				// see the note that follow, which explains why we terminate early if this symbol is discovered.
				if (pluginData[ALREADY_CAPTURED]) { return undefined }
				if (!(withFilter(with_arg) && namespaceFilter(namespace))) { return undefined }
				const renamed_path = rename(path)

				// now, we let esbuild and its other plugins take care of the full path resolution.
				// but since we don't want this resolver to re-process this resource (causing an infinite recursion),
				// we have inserted a the `ALREADY_CAPTURED` symbol into the plugin data to terminate processing it again.
				const { path: resolved_path, pluginData: resolved_plugin_data } = (await build.resolve(renamed_path, {
					...rest_args,
					pluginData: { ...pluginData, [ALREADY_CAPTURED]: true },
				}))
				// if the `resolved_path` is `undefined` or an empty string (thereby falsy),
				// then we'll give up trying to process this file.
				if (!resolved_path) { return undefined }

				return {
					path: resolved_path,
					namespace: plugin_ns,
					pluginData: resolved_plugin_data
						? resolved_plugin_data
						: { ...pluginData, [ALREADY_CAPTURED]: false }
				}
			})
		})

		build.onLoad({ filter: /.*/, namespace: plugin_ns }, async (args): Promise<esbuild.OnLoadResult> => {
			const { path, pluginData } = args
			// here, we bundle the captured worker separately, as a single file,
			// then, with the "file" loader, we inform esbuild to swap out the import-statement in the dependent(s) of this worker,
			// with a variable pertaining to the relative path to the bundled worker file.
			const result = await build.esbuild.build({
				...rest_initial_options,
				entryPoints: [path],
				format: "esm",
				bundle: true,
				splitting: false,
				minify: true,
				write: false,
			})
			const contents = result.outputFiles.at(0)!.contents
			return { contents, loader: "file", pluginData }
		})
	}
}

const workerPlugin = (config?: Partial<WorkerPluginSetupConfig>): esbuild.Plugin => {
	const self_plugin: esbuild.Plugin = {
		name: "oazmi-worker",
		setup: workerPluginSetup({ ...config }),
	}
	return self_plugin
}

const emptyDir = async (dir_path: string): Promise<void> => {
	try {
		const dir_exists = (await fs.stat(dir_path)).isDirectory()
		if (dir_exists) { await fs.rm(dir_path, { recursive: true }) }
	} catch (error: any) { }
	await fs.mkdir(dir_path)
}

const dist_dir = "./dist/"
await emptyDir(dist_dir)
await esbuild.build({
	entryPoints: [
		"./src/index.ts",
		"./src/index.html",
	],
	plugins: [workerPlugin({
		filters: [/.*/],
		// below, we specify that only `import ... from "..." with { type: "monaco-worker" }` should be processed.
		withFilter: (with_arg) => (with_arg.type === "monaco-worker"),
	})],
	loader: {
		".ttf": "copy", // <-- this loader-rule is crucial for bundling the monaco-editor.
		".html": "copy", // <-- this allows us to copy the "./src/index.html" file as is.
	},
	outdir: dist_dir,
	format: "esm",
	bundle: true,
	splitting: false,
	minifySyntax: true,
	platform: "browser",
})

console.log("bundled your monaco-editor page successfully!")
console.log("you may now run a local server to check it out:")
console.log("\t>> npm run serve")
