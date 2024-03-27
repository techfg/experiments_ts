import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { cssPlugin } from "jsr:@oazmi/esbuild-plugin-css@0.1.1"
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


const css_mode: "bundle" | "inject" = "bundle"
const write = true

const workers = {
	editor: "npm:monaco-editor/esm/vs/editor/editor.worker.js",
	json: "npm:monaco-editor/esm/vs/language/json/json.worker.js",
	css: "npm:monaco-editor/esm/vs/language/css/css.worker.js",
	html: "npm:monaco-editor/esm/vs/language/html/html.worker.js",
	ts: "npm:monaco-editor/esm/vs/language/typescript/ts.worker.js",
}
const editor_base = "npm:monaco-editor/esm/vs/editor/editor.main.js"

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
	write
})

const result2 = await esbuild.build({
	plugins: [cssPlugin({ mode: css_mode }), ...denoPlugins()],
	entryPoints: [
		editor_base,
	],
	outdir: "./dist/",
	// the "npm:" (with the colon) transforms into "npm_"
	outbase: "npm_monaco-editor/esm/vs/",
	// this is what we will import into our main script
	format: "esm",
	minify: false,
	treeShaking: true,
	bundle: true,
	write
})

if(write === false) {
	console.log(result1.outputFiles.map((v) => v.path))
	console.log(result2.outputFiles.map((v) => v.path))
}

