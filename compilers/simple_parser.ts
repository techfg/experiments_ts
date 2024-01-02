import { Token, TokenKind } from "./simple_lexer.ts"
import { number_MAX_SAFE_INTEGER, typeofExtended } from "./utilities.ts"

export type ParseKind = symbol

export interface ParseTree<T> {
	kind: ParseKind
	value: T
	cursor: number
}

export type ParseFunction<P extends ParseTree<any>> = (cursor: number, input: Token[]) => P | undefined

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

export type ParserConfig_Match = ParserConfig_MatchToken<any> | ParserConfig_MatchTree<any>

export const default_transform = (token: Token) => (token.value)
export const transform_parser_kind = (parser_kind: ParseKind, parser: ParseFunction<any>): typeof parser => {
	return (cursor, input) => {
		const output = parser(cursor, input)
		if (output) { output.kind = parser_kind }
		return output
	}
}

export class ParserContext {
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

	parseMultiple(match: ParserConfig_Match, min: number = 0, max: number = number_MAX_SAFE_INTEGER): ParseFunction<any> {
		return (cursor: number, input: Token[]) => {
			const
				output = { value: [] as Array<any>, cursor: cursor },
				{ kind, pattern, keep, transform } = match,
				input_len = input.length
			let i = 0
			for (; i < max && cursor < input_len; i++) {
				let current_token = input[cursor++]
				if (kind && (kind !== current_token.kind)) { break }
				if (pattern) {
					const typeof_pattern = typeofExtended(pattern)
					if (typeof_pattern === "string") {
						if ((pattern as string) !== current_token.value) { break }
					} else if (typeof_pattern === "regex") {
						if (!(pattern as RegExp).test(current_token.value)) { break }
					} else {
						const parsed_pattern = (typeof_pattern === "symbol" ?
							this.parsers.get(pattern as symbol)! :
							pattern as ParseFunction<any>
						)(cursor - 1, input)
						if (parsed_pattern === undefined) { break }
						cursor = parsed_pattern.cursor
						current_token = parsed_pattern
					}
				}
				if (keep) {
					output.value.push((transform ?? default_transform)(current_token))
				}
			}
			output.cursor = cursor
			return i >= min ? output : undefined
		}
	}

	parseZeroOrOnce(match: ParserConfig_Match): ParseFunction<any> {
		return this.parseMultiple(match, 0, 1)
	}

	parseZeroOrMore(match: ParserConfig_Match): ParseFunction<any> {
		return this.parseMultiple(match, 0)
	}

	parseOnceOrMore(match: ParserConfig_Match): ParseFunction<any> {
		return this.parseMultiple(match, 1)
	}

	// TODO
	toRailroadGraph() { }
}
