import * as monaco from "monaco-editor"
import EditorReact, { loader, type EditorProps} from "@monaco-editor/react"

loader.config({ monaco })

export const Editor = (props: EditorProps) => {
	const defaultValue = [
		`import { joinPaths } from "https://jsr.io/@oazmi/kitchensink/0.9.7/src/pathman.ts"`,
		`import _ from "https://cdn.jsdelivr.net/npm/lodash-es/lodash.js"`,
		"",
		`console.log(_.camelCase("Hello World"))`,
		"const a = 55",
		"const b: string = `SHEESH-KEBABS`",
		`joinPaths(b, "snek_kebebs")`,
		"",
	].join("\n")
	const defaultLanguage = "typescript"
	const theme = "vs-dark"
	return <EditorReact className="Editor" defaultValue={defaultValue} defaultLanguage={defaultLanguage} theme={theme} />
}
