import { SortedArray, Token, Keyword, Identifier, Assignment, Rune, isEmpty, NumberLiteral, lex, StringLiteral, BooleanLiteral, TokenKind } from "./simple_lexer.ts"

type TypeofValueExtended<T> =
	T extends string ? "string" :
	T extends number ? "number" :
	T extends bigint ? "bigint" :
	T extends boolean ? "boolean" :
	T extends symbol ? "symbol" :
	T extends Function ? "function" :
	T extends undefined ? "undefined" :
	T extends RegExp ? "regex" :
	T extends Array<any> ? "array" :
	T extends Promise<any> ? "promise" :
	T extends null ? "null" :
	T extends object ? "object" : "unknown"

function typeofExtended<T>(param: T): TypeofValueExtended<T> {
	let typeof_param: string = typeof param
	if (typeof_param === "object") {
		typeof_param =
			param instanceof RegExp ? "regex" :
				param instanceof Array ? "array" :
					param instanceof Promise ? "promise" :
						param === null ? "null" : typeof_param
	}
	return typeof_param as TypeofValueExtended<T>
}


type ParseKind = symbol

interface ParseTree<T> {
	kind: ParseKind
	value: T
	cursor: number
}

type ParseFunction<P extends ParseTree<any>> = (cursor: number, input: Token[]) => P | undefined

interface Parser<P extends ParseTree<any>> {
	parse: ParseFunction<P>
}

interface ParserConfig_MatchToken<T extends Token> {
	kind?: T["kind"]
	pattern?: string | RegExp
	keep?: boolean
	transform?: (token: T) => any
}

interface ParserConfig_MatchTree<P extends ParseTree<any>> {
	kind?: TokenKind
	pattern?: P["kind"] | ParseFunction<P>
	keep?: boolean
	transform?: (parse_tree: ParseTree<P>) => any
}

type ParserConfig_Match = ParserConfig_MatchToken<any> | ParserConfig_MatchTree<any>

const default_transform = (token: Token) => (token.value)

class ParserContext {
	private parsers: Map<ParseKind, ParseFunction<any>> = new Map()

	addParser(kind: ParseKind, parser_fn: ParseFunction<any>) {
		this.parsers.set(kind, parser_fn)
	}

	getParser(kind: ParseKind): ParseFunction<any> {
		return this.parsers.get(kind)!
	}

	/** generate a sequence parser. useful for keeping things short, declarative, and nonredundant. */
	parseSequence(...matches: ParserConfig_Match[]): ParseFunction<any> {
		return (cursor: number, input: Token[]) => {
			const output = { value: [] as Array<any>, cursor: cursor }
			for (const { kind, pattern, keep, transform } of matches) {
				let current_token = input[cursor++]
				if (kind && (kind !== current_token.kind)) { return }
				if (pattern) {
					const typeof_pattern = typeofExtended(pattern)
					if (typeof_pattern === "string") {
						if ((pattern as string) !== current_token.value) { return }
					} else if (typeof_pattern === "regex") {
						if (!(pattern as RegExp).test(current_token.value)) { return }
					} else {
						const parsed_pattern = (typeof_pattern === "symbol" ?
							this.parsers.get(pattern as symbol)! :
							pattern as ParseFunction<any>
						)(cursor - 1, input)
						if (parsed_pattern === undefined) { return }
						cursor = parsed_pattern.cursor
						current_token = parsed_pattern
					}
				}
				if (keep) {
					output.value.push((transform ?? default_transform)(current_token))
				}
			}
			output.cursor = cursor
			return output
		}
	}

	/** generate an ordered alternative parser. useful for keeping things short, declarative, and nonredundant. */
	parseOneof(...choices: ParserConfig_Match[]): ParseFunction<any> {
		return (cursor: number, input: Token[]) => {
			const
				output = { value: undefined, cursor: cursor },
				current_token = input[cursor++]
			let matched = false
			for (const { kind, pattern, keep, transform } of choices) {
				if (kind && (kind !== current_token.kind)) { continue }
				if (pattern) {
					const typeof_pattern = typeofExtended(pattern)
					if (typeof_pattern === "string") {
						if ((pattern as string) !== current_token.value) { continue }
					} else if (typeof_pattern === "regex") {
						if (!(pattern as RegExp).test(current_token.value)) { continue }
					} else {
						const parsed_pattern = (typeof_pattern === "symbol" ?
							this.parsers.get(pattern as symbol)! :
							pattern as ParseFunction<any>
						)(cursor - 1, input)
						if (parsed_pattern === undefined) { continue }
						cursor = parsed_pattern.cursor
					}
				}
				if (keep) {
					output.value = (transform ?? default_transform)(current_token)
				}
				matched = true
				break
			}
			output.cursor = cursor
			return matched ? output : undefined
		}
	}
}


type ParseTree_LetStatement = ParseTree<[id: string, type_id: string, expression: any]>

const parser_ctx = new ParserContext()
const parse_kind_terminal_expression: ParseKind = Symbol("terminal expression")
const parse_terminal_expression = parser_ctx.parseOneof(
	{ kind: NumberLiteral, keep: true },
	{ kind: StringLiteral, keep: true },
	{ kind: BooleanLiteral, keep: true },
)
parser_ctx.addParser(
	parse_kind_terminal_expression,
	(cursor, input) => {
		const output = parse_terminal_expression(cursor, input)
		if (output) { output.kind = parse_kind_terminal_expression }
		return output
	}
)

const parse_kind_let_statement: ParseKind = Symbol("let statement")
const parse_let_statement_subparser = parser_ctx.parseSequence(
	{ kind: Keyword, pattern: "let", keep: false },
	{ kind: Identifier, keep: true },
	{ kind: Rune, pattern: ":", keep: false },
	{ kind: Identifier, keep: true },
	{ kind: Assignment, pattern: "=", keep: false },
	{ pattern: parse_kind_terminal_expression, keep: true, transform: (ptree: ReturnType<typeof parse_terminal_expression>) => (ptree) },
	{ kind: Rune, pattern: ";", keep: false },
)
parser_ctx.addParser(
	parse_kind_let_statement,
	(cursor, input) => {
		const output = parse_let_statement_subparser(cursor, input)
		if (output) { output.kind = parse_kind_let_statement }
		return output
	}
)

parser_ctx.getParser(parse_kind_let_statement)(0, lex.exec("let abc_d: string = 33;"))

