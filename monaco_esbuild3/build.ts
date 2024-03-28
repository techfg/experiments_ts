import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { cssPlugin } from "jsr:@oazmi/esbuild-plugin-css@0.1.1"
import { ensureFile } from "jsr:@std/fs"
import { extname } from "jsr:@std/path"
// import { cssPlugin } from "file:///D:/My works/2024/esbuild-plugin-css/src/mod.ts"

// NOTICE: notice that we are effectively wanting to compile our worker files and our `editor_base` together, with the only difference being that
// we wish for `editor_base` to be built as "esm", whereas the workers need to be built as "iife".
// consequently, we have to carry two separate compilations, which means duplication of shared code among `editor_base` and the workers,
// which may lead to issues if non-duplicable structures or side-effects are used (such as symbols).
// the following stackoverflow question wanted to do the same as me: compile every thing as "iife" except for one file as "esm":
// https://stackoverflow.com/questions/76428650/esbuild-hybrid-plugin-to-bundle-multiple-files-iife-and-single-esm-bundle
// unfortunately, he figured another way of doing it by changing his source code for adaptation. but I can't do that with monaco-editor.
// so one possibility is for me to write a plugin which wraps over the output js content in an "iife" if the path's name ends with regex /.worker.(j|t)sx?$/ .
// this way, the worker will technically be an esm, but won't export anything.
// potential issues: if the worker does export something, then it will be a javascript syntax error to have and export declaration inside of a function.
// alternative:
// the plugin should use `build.esbuild.transform` to transform the worker (if the name matches the regex) into "iife", and then we'll just return the
// resulting transformed js contnets with the js loader (during the build.onLoad step).


const iifePlugin = ({ filters }: {
	filters: Array<RegExp>
}): esbuild.Plugin => {
	return {
		name: "iife-plugin",
		setup: (build) => {
			if (build.initialOptions.splitting) {
				console.warn(
					"[iife-plugin]: WARNING: splitting will probably lead to faulty code!",
					"\n\tthis is because esbuild replaces static `import` with `require(...)` instead of dynamic `await import(...)`",
					"\n\tand `require` is not available anywhere besides Node"
				)
			}

			build.onEnd(async (result: esbuild.BuildResult) => {
				const
					files_to_preserve: esbuild.OutputFile[] = [],
					files_to_convert_to_iife = result.outputFiles!.filter((output_file) => {
						const
							{ path, hash } = output_file,
							ext = extname(path),
							hashless_path = path.replace(RegExp("-" + hash + ext + "$"), ext)
						// console.log(path, hash, ext, hashless_path)
						// NOTICE: the `hash` is actually different from the optional hash applied to the path names, unlike what I thought.
						for (const filter of filters) {
							if (filter.test(hashless_path)) {
								return true
							}
						}
						files_to_preserve.push(output_file)
						return false
					}),
					iife_files = await Promise.all(files_to_convert_to_iife.map(async (output_file) => {
						const { path, hash, contents } = output_file
						let { code } = await build.esbuild.transform(contents, {
							format: "iife",
							platform: "browser",
							// do not treeshake, as there is very likely going to be code that relies on side-effects when dynamic imports are used.
							treeShaking: false,
						})
						if (build.initialOptions.splitting) {
							// if splitting was enabled, our static imports will have unavoidably transformed into `require(...)`.
							// thus we run a silly regex to replace all `require(...)` with `await import(...)`.
							// additionally, we transform the top level iife function into async if it is not already an async function.
							code = code
								.replaceAll(/(?<![a-zA-Z0-9_$])require\(/g, "await import(")
								.replace(/^\(\s*\(/, "(async (")
						}
						return {
							path,
							hash,
							contents: new TextEncoder().encode(code),
							text: code
						} as esbuild.OutputFile
					}))
				result.outputFiles!.splice(0)
				result.outputFiles!.push(...files_to_preserve, ...iife_files)
				return
			})
		}
	}
}


const css_mode: "bundle" | "inject" = "bundle"
// write MUST BE FALSE for outputFiles to exist, and for the plugin to work
const write: boolean = false

const workers = {
	editor: "npm:monaco-editor/esm/vs/editor/editor.worker.js",
	json: "npm:monaco-editor/esm/vs/language/json/json.worker.js",
	css: "npm:monaco-editor/esm/vs/language/css/css.worker.js",
	html: "npm:monaco-editor/esm/vs/language/html/html.worker.js",
	ts: "npm:monaco-editor/esm/vs/language/typescript/ts.worker.js",
}
const editor_base = "npm:monaco-editor/esm/vs/editor/editor.main.js"

const result1 = await esbuild.build({
	plugins: [cssPlugin({ mode: css_mode }), ...denoPlugins(), iifePlugin({ filters: [/\.worker\.js$/,] })],
	entryPoints: [
		editor_base,
		workers.editor,
		workers.json,
		workers.css,
		workers.html,
		workers.ts,
	],
	outdir: "./dist/",
	// the "npm:" (with the colon) transforms into "npm_"
	outbase: "npm_monaco-editor/esm/vs/",
	// workers should not export anything. they behave like iife more or less
	format: "esm",
	minify: false,
	treeShaking: true,
	bundle: true,
	// the `iifePlugin` does not work with splitting, because static `import` gets transformed into `require(...)` instead of dynamic `await import(...)`
	// splitting: true,
	platform: "browser",
	write,
})

await Promise.all(result1.outputFiles.map(async (output_file) => {
	const { path, contents } = output_file
	await ensureFile(path)
	await Deno.writeFile(path, contents)
}))


if (write === false) {
	console.log(result1.outputFiles.map((v) => v.path))
}

