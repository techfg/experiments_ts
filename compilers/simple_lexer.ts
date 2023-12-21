/** token kinds in the order of their precedence */
type TokenKind = symbol

const
	Comment: TokenKind = Symbol("comment"),
	Keyword: TokenKind = Symbol("keyword"),
	Operator: TokenKind = Symbol("operator"),
	Rune: TokenKind = Symbol("rune"),
	NumberLiteral: TokenKind = Symbol("number"),
	StringLiteral: TokenKind = Symbol("string"),
	BooleanLiteral: TokenKind = Symbol("boolean"),
	NullLiteral: TokenKind = Symbol("null"),
	Identifier: TokenKind = Symbol("identifier"),
	Uncaught: TokenKind = Symbol("uncaught"),
	token_kind_precedence: TokenKind[] = [
		Uncaught, Identifier, NullLiteral,
		BooleanLiteral, StringLiteral, NumberLiteral,
		Rune, Operator, Keyword, Comment,
	]

interface Token {
	kind: TokenKind
	value: string
	cursor: number
}

const
	whitespace_chars = [" ".charCodeAt(0), "\t".charCodeAt(0), "\n".charCodeAt(0), "\r".charCodeAt(0)],
	/** check if the cursor is on a whitespace character. */
	is_whitespace = (cursor: number, input_text: string): boolean => {
		return whitespace_chars.includes(input_text.charCodeAt(cursor))
	},
	/* move the cursor to the next non-whitespace position. */
	skip_whitespace = (cursor: number, input_text: string): number => {
		while (is_whitespace(cursor, input_text)) { cursor += 1 }
		return cursor
	},
	/** find the cursor position of the next whitespace character. */
	find_next_whitespace = (cursor: number, input_text: string): number => {
		while (!is_whitespace(cursor, input_text)) { cursor += 1 }
		return cursor
	},
	match_pattern_literal = <T extends TokenKind>(token_kind: T, pattern: string, cursor: number, input: string): Token | undefined => {
		return input.substring(cursor, cursor + pattern.length) === pattern ?
			{ cursor: cursor + pattern.length, kind: token_kind, value: pattern } as Token :
			undefined
	},
	match_pattern_regex = <T extends TokenKind>(token_kind: T, pattern: RegExp, cursor: number, input: string): Token | undefined => {
		const
			match = pattern.exec(input.substring(cursor)),
			value = match?.[0],
			index = match?.index
		return index === 0 && value ?
			{ cursor: cursor + value.length, kind: token_kind, value } as Token :
			undefined
	},
	isArray = Array.isArray,
	array_delete_item = <T>(arr: Array<T>, item: T): boolean => {
		const idx = arr.indexOf(item)
		if (idx >= 0) {
			arr.splice(idx, 1)
			return true
		}
		return false
	},
	isEmpty = (arr: Array<any>) => (arr.length === 0)


class SortedArray<T, K extends any> {
	private sort_fn: ((a: [K, T[]], b: [K, T[]]) => number)
	private map = new Map<K, T[]>()
	private dirty = false
	private items: Array<T> = []

	constructor(
		initial_items: Array<[items: T | T[], order: K]> = [],
		sort_fn: ((a: [K, T[]], b: [K, T[]]) => number) = ((a, b) => ((a[0] as number) - (b[0] as number)))
	) {
		this.map = new Map<K, T[]>(initial_items.map(
			([items, order]) => [order, isArray(items) ? items : [items]]
		))
		this.sort_fn = sort_fn
	}

	insert(item: T, order: K): void {
		if (!this.map.has(order)) {
			this.map.set(order, [])
		}
		this.map.get(order)!.push(item)
		this.dirty = true
	}

	delete(item: T, order: K): void {
		const items_in_presedence = this.map.get(order)
		if (items_in_presedence) {
			this.dirty ||= array_delete_item(items_in_presedence, item)
			if (isEmpty(items_in_presedence)) {
				this.map.delete(order)
			}
		}
	}

	update(): void {
		this.items = [...this.map]
			.sort(this.sort_fn)
			.flatMap((entry) => entry[1])
		this.dirty = false
	}

	getItems(): Array<T> {
		if (this.dirty) { this.update() }
		return this.items
	}
}


/** a `Tokenizer` is a function, specific to a certain kind of token, which can basically tokenize an input text, starting from a specific cursor position.
 * if it fails to tokenize, it should return `undefined`
*/
type Tokenizer = (cursor: number, input: string) => Token | undefined

class Lexer {
	private rules = new SortedArray<Tokenizer, number>([], (a, b) => (b[0] - a[0]))

	constructor() {
		this.rules.insert((cursor: number, input: string) => {
			new Error("uncaught substring starting at" + cursor + "\n\t" + input.substring(cursor, cursor + 100))
			return undefined
		}, token_kind_precedence.indexOf(Uncaught))
	}

	addRule(kind: TokenKind, pattern: string | RegExp) {
		const tokenizer = typeof pattern === "string" ?
			match_pattern_literal.bind(undefined, kind, pattern) :
			match_pattern_regex.bind(undefined, kind, pattern)
		this.rules.insert(tokenizer, token_kind_precedence.indexOf(kind))
	}

	exec(input: string): Token[] {
		const
			tokenizers = this.rules.getItems(),
			tokens: Token[] = [],
			input_len = input.length
		let
			cursor = 0,
			prev_token: Token = { kind: Comment, value: "", cursor: 0 },
			success: Token | undefined = undefined
		while (cursor < input_len && prev_token.kind !== Uncaught) {
			success = undefined
			cursor = skip_whitespace(cursor, input)
			for (const tokenizer of tokenizers) {
				success = tokenizer(cursor, input)
				if (success) {
					tokens.push(success)
					prev_token = success
					cursor = success.cursor
					break
				}
			}
			if (success === undefined) { break }
		}
		return tokens
	}
}


// typescript lexing example

const lex = new Lexer()
lex.addRule(Comment, new RegExp("^\\/\\/.*")) // line comment
lex.addRule(Comment, new RegExp("^\\/\\*[\\s\\S]*?\\*\\/")) // multiline comment
lex.addRule(StringLiteral, new RegExp("^\"(?:[^\"\\\\]|\\\\.)*\"")) // double quoted string literal which does prematurely stop at escaped quotation marks `\"`
// lex.addRule(StringLiteral, new RegExp("^\"\.*?\"")) // double quoted string literal
lex.addRule(NumberLiteral, new RegExp("^\\d+(\\.\\d*)?")) // number literal
lex.addRule(Identifier, new RegExp("^[a-zA-Z_]\\w*")) // any identifier (whether a variable, function, or a type)
lex.addRule(BooleanLiteral, "true")
lex.addRule(BooleanLiteral, "false")
lex.addRule(NullLiteral, "undefined")
lex.addRule(NullLiteral, "null")

const keywords: string[] = [
	"import", "export",
	"let", "const", "function", "class", "enum",
	"new", "extends", "implements",
	"typeof", "instanceof", "type", "interface",
	"for", "while", "of", "in", "break", "continue",
	"if", "else if", "else",
	"switch", "case", "default",
	"try", "catch", "finally",
	"return", "yield", "delete",
]
keywords.forEach((kw) => { lex.addRule(Keyword, kw) })

const operators: string[] = [
	"===", "==", "!==", "!=", "<=", ">=",
	"**", "+", "-", "*", "/", "%",
	"&&", "||", "!",
	"&", "|", "^", "~", ">>>", "<<", ">>",
	"<", ">", "??", "?.", "...", "."
]
operators.forEach((op) => { lex.addRule(Operator, op) })

const runes: string[] = [
	"(", ")", "{", "}", "[<", ">]", "[", "]",
	",", ":", ";",
	"=", "**=", "+=", "-=", "*=", "/=", "%="
]
runes.forEach((rn) => { lex.addRule(Rune, rn) })


// run test
console.log(lex.exec("let abcd: string = \"somebullshit\" ;"))
console.log(lex.exec(`
function fib(num: number, xyz: string): void {
	num = fib((num - 1), (num - 2));
	let str: string = "kill \\"ya selfu";
};
`))

