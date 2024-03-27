// import { Context } from "npm:@oazmi/tsignal"
// import * as monaco from "npm:monaco-editor"
// import { editor as monacoEditor, } from "npm:monaco-editor/esm/vs/editor/editor.api"
import { editor as monacoEditor } from "./dist/editor/editor.main.js"

interface IMonacoEnvironment {
	getWorkerUrl?: (moduleId: string, label: string) => string
	getWorker?: (moduleId: string, label: string) => Worker
}
const monaco_env = ((globalThis as any).MonacoEnvironment ??= {}) as IMonacoEnvironment
monaco_env.getWorkerUrl = (moduleId: string, label: string): string => {
	console.log("getWorkerUrl", moduleId, label)
	if (label === "typescript" || label === "javascript") {
		return "./dist/language/typescript/ts.worker.js"
	}
	return "./dist/editor/editor.worker.js"
}

const editor = monacoEditor.create(document.getElementById("monaco-editor")!, {
	// model: monacoEditor.createModel("const a = 55\n\n", "typescript"),
	value: [
		"const a = 55",
		"const b: string = `SHEESH-KEBABS!`",
	].join("\n"),
	language: "typescript",
	theme: "vs-dark",
})

export { }

// export const ctx = new Context()
