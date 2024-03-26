import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"

export const inlineImportPlugin: esbuild.Plugin = {
	name: "inline_import_plugin",
	setup(build) {
		build.onLoad({ filter: /.*/ }, async (args: esbuild.OnLoadArgs): Promise<esbuild.OnLoadResult | null> => {
			if (args.with?.type === "inline-url") {
				const bundled_contents = (await build.esbuild.build({
					plugins: [inlineImportPlugin],
					entryPoints: [args.path],
					format: "esm",
					bundle: true,
					minify: true,
					write: false
				})).outputFiles.pop()!
				const
					contents_as_quoted_string = JSON.stringify(bundled_contents),
					mime = args.with.mime ?? "text/plain",
					js_text = `
const blob = new Blob([${contents_as_quoted_string}], { type: "${mime}" })
const url = URL.createObjectURL(blob)
export default url
`
				return { loader: "js", contents: js_text }
			}
			return null
		})
	}
}

import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { cssPlugin } from "jsr:@oazmi/esbuild-plugin-css"

const result = await esbuild.build({
	plugins: [cssPlugin(), inlineImportPlugin, ...denoPlugins()],
	entryPoints: ["./index.ts"],
	outdir: "./out/",
	format: "esm",
	bundle: true,
})

