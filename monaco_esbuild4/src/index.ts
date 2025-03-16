import { demoWorker, monacoEditor, monacoEnvironment, monacoLanguages } from "./monaco_loader.ts"

import "./style.css"


monacoLanguages.typescript.typescriptDefaults.setCompilerOptions({
	...monacoLanguages.typescript.typescriptDefaults.getCompilerOptions(),
	target: monacoLanguages.typescript.ScriptTarget.ESNext,
	module: monacoLanguages.typescript.ModuleKind.ESNext,
	moduleResolution: monacoLanguages.typescript.ModuleResolutionKind.NodeJs,
	// noEmit: true,
	// allowJs: true,
	checkJs: true,
	isolatedModules: true,
	moduleDetection: "force",
	esModuleInterop: true,
	allowImportingTsExtensions: true,
	allowNonTsExtensions: true,
	alwaysStrict: true,
	baseUrl: "./",
})

monacoLanguages.typescript.typescriptDefaults.setDiagnosticsOptions({
	...monacoLanguages.typescript.typescriptDefaults.getDiagnosticsOptions(),
	noSemanticValidation: true,
	noSyntaxValidation: false,
})

export const editor = monacoEditor.create(document.getElementById("monaco-editor")!, {
	value: [
		`import { joinPaths } from "https://jsr.io/@oazmi/kitchensink/0.9.7/src/pathman.ts"`,
		`import _ from "https://cdn.jsdelivr.net/npm/lodash-es/lodash.js"`,
		"",
		`console.log(_.camelCase("Hello World"))`,
		"const a = 55",
		"const b: string = `SHEESH-KEBABS`",
		`joinPaths(b, "snek_kebebs")`,
		"",
	].join("\n"),
	language: "typescript",
	theme: "vs-dark",
})

demoWorker.onmessage = (event) => {
	console.log(event.data)
}
// the worker will now respond with a hello world in your console every second
setInterval(() => (demoWorker.postMessage("Say Hi!")), 1000)

// we assign some variables to the global scope, so that they can be accessed from the dev-console in the browser.
Object.assign(globalThis, { monacoEditor, monacoEnvironment, monacoLanguages, demoWorker })
