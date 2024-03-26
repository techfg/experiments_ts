// import { Context } from "npm:@oazmi/tsignal"
import { editor as monacoEditor } from "npm:monaco-editor/esm/vs/editor/editor.api"
import "./worker.ts"

export const editor = monacoEditor.create(document.getElementById("monaco-editor")!, {
	// model: monacoEditor.createModel("const a = 55\n\n", "typescript"),
	value: [
		"const a = 55",
		"const b: string = `SHEESH-KEBABS!`",
	].join("\n"),
	language: "typescript",
	theme: "vs-dark",
})


// export const ctx = new Context()
