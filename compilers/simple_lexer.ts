import { SortedArray, skip_whitespace } from "./utilities.ts"

export type TokenKind = symbol

export interface Token {
	kind: TokenKind
	value: string
	cursor: number
}

const
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
	}

/** a `Tokenizer` is a function, specific to a certain kind of token, which can basically tokenize an input text, starting from a specific cursor position.
 * if it fails to tokenize, it should return `undefined`
*/
export type Tokenizer = (cursor: number, input: string) => Token | undefined
export const Uncaught: TokenKind = Symbol("tk:uncaught")
export class LexerContext {
	private rules = new SortedArray<Tokenizer, number>([], (a, b) => (b[0] - a[0]))
	private precedence: Array<TokenKind>

	constructor(precedence: Array<TokenKind>) {
		precedence.unshift(Uncaught)
		this.rules.insert((cursor: number, input: string) => {
			new Error("uncaught substring starting at" + cursor + "\n\t" + input.substring(cursor, cursor + 100))
			return undefined
		}, precedence.indexOf(Uncaught))
		this.precedence = precedence
	}

	addRule(kind: TokenKind, pattern: string | RegExp) {
		const tokenizer = typeof pattern === "string" ?
			match_pattern_literal.bind(undefined, kind, pattern) :
			match_pattern_regex.bind(undefined, kind, pattern)
		this.rules.insert(tokenizer, this.precedence.indexOf(kind))
	}

	// TODO: implement `delRule` for deleting existing rules. the issue would be how to reference the added rule?
	// maybe `addRule` should either return a unique_id that references the newly added rule,
	// or it should return a function that when called, results in the rule being deleted.

	exec(input: string): Token[] {
		const
			tokenizers = this.rules.getItems(),
			tokens: Token[] = [],
			input_len = input.length
		let
			cursor = 0,
			prev_token: Token = { kind: undefined as any, value: "", cursor: 0 },
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

