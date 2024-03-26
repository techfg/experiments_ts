import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"

const result = await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: ["./index.ts"],
	outdir: "./out/",
	format: "esm",
	bundle: true,
})

