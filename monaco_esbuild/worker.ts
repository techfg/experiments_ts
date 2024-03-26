import editor_worker_url from "npm:monaco-editor/esm/vs/editor/editor.worker.js" with { type: "inline-url", mime: "text/javascript" }
import ts_worker_url from "npm:monaco-editor/esm/vs/language/typescript/ts.worker.js" with { type: "inline-url", mime: "text/javascript" }

interface IMonacoEnvironment {
	getWorkerUrl?: (moduleId: string, label: string) => string
}

const monaco_env = ((globalThis as any).MonacoEnvironment ??= {}) as IMonacoEnvironment
monaco_env.getWorkerUrl = (moduleId: string, label: string): string => {
	if (label === "typescript" || label === "javascript") {
		return ts_worker_url
	}
	return editor_worker_url
}

export { }

