import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { cssPlugin } from "jsr:@oazmi/esbuild-plugin-css@0.1.1"
// import { cssPlugin } from "file:///D:/My works/2024/esbuild-plugin-css/src/mod.ts"

const css_mode: "bundle" | "inject" = "bundle"

const workers = {
	base: "npm:monaco-editor/esm/vs/editor/editor.main.js",
	editor: "npm:monaco-editor/esm/vs/editor/editor.worker.js",
	json: "npm:monaco-editor/esm/vs/language/json/json.worker.js",
	css: "npm:monaco-editor/esm/vs/language/css/css.worker.js",
	html: "npm:monaco-editor/esm/vs/language/html/html.worker.js",
	ts: "npm:monaco-editor/esm/vs/language/typescript/ts.worker.js",
}

const result1 = await esbuild.build({
	plugins: [cssPlugin({ mode: css_mode }), ...denoPlugins()],
	entryPoints: [
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
	format: "iife",
	minify: false,
	treeShaking: true,
	bundle: true,
	// write: false,
})

const result2 = await esbuild.build({
	plugins: [cssPlugin({ mode: css_mode }), ...denoPlugins()],
	entryPoints: [
		workers.base,
		// "npm:monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles.js"
	],
	outdir: "./dist/",
	// the "npm:" (with the colon) transforms into "npm_"
	outbase: "npm_monaco-editor/esm/vs/",
	// this is what we will import into our main script
	format: "esm",
	minify: false,
	treeShaking: true,
	bundle: true,
	// write: false,
})

// const res = await esbuild.build({
// 	plugins: [{
// 		name: "temp",
// 		setup: (build) => {
// 			build.onResolve({ filter: /.ttf$/ }, async (args) => {
// 				const { path, importer, kind } = args
// 				console.log("css url preserve import resolving:", path)
// 				return { path, pluginData: { importer }, namespace: "ttf-bitch" }
// 			})

// 			build.onLoad({ filter: /.ttf$/ }, async (args) => {
// 				console.log(args)
// 				const resource_path_url = resolveAsUrl(args.path, args.pluginData.importer)
// 				console.log("css url preserve import loading:", resource_path_url)
// 				return { loader: "copy", contents: new Uint8Array(await (await fetch(resource_path_url)).arrayBuffer()) }
// 				// return { loader: "copy", contents: new Uint8Array(await (await fetch(args.path)).arrayBuffer()) }
// 			})
// 		}
// 	}],
// 	entryPoints: [
// 		"./temp.ts",
// 		"./temp.css"
// 	],
// 	outdir: "./temp/",
// 	// the "npm:" (with the colon) transforms into "npm_"
// 	// this is what we will import into our main script
// 	format: "esm",
// 	// loader: { ".ttf": "copy" },
// 	minify: false,
// 	treeShaking: true,
// 	bundle: true,
// 	// write: false
// })

// console.log(result1.outputFiles.map((v) => v.path))
// console.log(result2.outputFiles.map((v) => v.path))

