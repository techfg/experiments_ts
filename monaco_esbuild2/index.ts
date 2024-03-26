import loader from "npm:@monaco-editor/loader"

let editor
loader.init().then(monaco => {
	editor = monaco.editor.create(document.getElementById("monaco-editor")!, {
		// model: monacoEditor.createModel("const a = 55\n\n", "typescript"),
		value: [
			"const a = 55",
			"const b: string = `SHEESH-KEBABS!`",
		].join("\n"),
		language: "typescript",
		theme: "vs-dark",
	})
})

// export const ctx = new Context()

