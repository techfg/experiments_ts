/** this library provides a modular lexer with a plugin-style approach for tokenization. <br>
 * it allows the incremental addition of tokenization rules and supports features like inlining, repetitions, and regex pattern matching for atomic tokens.
 * 
 * TODO:
 * - add dedicated feature for repetitions so that we don't get an N-nested token tree for an N-repetition of a certain token
 * - add `precedence === 0` implying auto placement of match rule based on the composite rule's array size (longest ones come first, shortest come later, atomic literals come last)
 * - [DONE but needs documentation on caveats] add regex pattern matching for atomic tokens. this will let you to define identifiers, string-literals, numbers, comments, and multi-line comments
 * - [DONE but not tested yet] add regex pattern matching for composite tokens.
 * - test when two or more `inline_next_token` composite tokens are used in succession. do they collect n-deep children values as intended?
 * - figure out how this lexer will integrate with plugin-style compiler features pattern
 * 
 * @module
*/

import { array_isArray, skip_whitespace } from "./utilities.ts"

/** represents the type for token kinds in the lexer. each unique token kind is represented by a distinct symbol. */
export type TokenKind = symbol
/** represents a control token, which is a specialized form of a token kind.
 * these are used for specifying a certain rule for the upcoming token(s)
*/
export type ControlToken = TokenKind
export const
	null_token_kind: TokenKind = Symbol("null"),
	any_token_kind: TokenKind = Symbol("any"),
	/** use inlining with caution as it changes the structure of the resulting tree. the new tree would no longer correctly represent the flow of the recursive parsing */
	inline_next_token: ControlToken = Symbol("inline next token"),
	repeat_zero_or_once: ControlToken = Symbol("repeat next token zero or one times"),
	repeat_zero_or_more: ControlToken = Symbol("repeat next token zero or more times"),
	repeat_once_or_more: ControlToken = Symbol("repeat next token once or more times"),
	control_symbols: Set<ControlToken> = new Set([null_token_kind, inline_next_token, repeat_zero_or_once, repeat_zero_or_more, repeat_once_or_more,])

/** a token is an object representing a parse tree.
 * it contains information about possible children tokens (`this.value`) which it could be composed of,
 * or just a string-literal from the input text that's being tokenized.
*/
export interface TokenTree {
	/** the position of the cursor (in the input text) AFTER this token has been identified */
	cursor: number
	/** specify the kind of token. for example: is it a "breakfast" token, or a "crispiness" token ? */
	kind: TokenKind
	/** the token's value specifies either its string-literal representation (atomic token), or can be composed of smaller tokens (composite token) */
	value?: string | TokenTree[]
}

export interface CompositeToken extends TokenTree {
	cursor: number
	value: TokenTree[]
}

export interface AtomicToken extends TokenTree {
	cursor: number
	value: string
}

/** if a `Tokenizer` should fail at matching the input, it should return a `NullToken`, with its `cursor` property dictating how far the cursor had reached before failing all possible match patterns.
 * note that it will be up to the caller of the `Tokenizer` function (which could be recursive as well) to decide what to do with the return `cursor` position property of a possible `NullToken`.
 * but generally it will be ignored because the caller will probably want to call other remaining `Tokenizer` functions that may match the input, should the first `Tokenizer` return a `NullToken`.
*/
export interface NullToken extends TokenTree {
	kind: typeof null_token_kind
	value: never
}

/** a `Tokenizer` is a function, specific to a certain kind of token, which can basically tokenize an input text, starting from a specific cursor position. */
export type Tokenizer = (cursor: number, input: string) => TokenTree

/** collect tokens at a certain depth in the token tree.
 * leaf nodes/endpoints that exist before the depth is reached, will not be collected.
 * @param node the current token tree node.
 * @param depth the depth at which tokens should be collected.
 * @param collection an array to store the collected tokens.
 * @returns the array of collected tokens.
*/
const collect_at_depth = (node: TokenTree, depth: number, collection: TokenTree[] = []): TokenTree[] => {
	const value = node.value
	// base case: if depth is 0, return the node itself wrapped around the return array
	if (depth <= 0) { collection.push(node) }
	// intermediate children that turn out to be leaf nodes become excluded
	else if (array_isArray(value)) {
		for (const child of value) {
			collect_at_depth(child, depth - 1, collection)
		}
	}
	return collection
}

const
	match_pattern_literal = <T extends AtomicToken>(token_kind: T["kind"], pattern: string, cursor: number, input: string): T | NullToken => {
		return input.substring(cursor, cursor + pattern.length) === pattern ?
			{ cursor: cursor + pattern.length, kind: token_kind, value: pattern } as T :
			{ cursor, kind: null_token_kind } as NullToken
	},
	match_pattern_regex = <T extends AtomicToken>(token_kind: T["kind"], pattern: RegExp, cursor: number, input: string): T | NullToken => {
		const
			match = pattern.exec(input.substring(cursor)),
			value = match?.[0],
			index = match?.index
		return index === 0 && value ?
			{ cursor: cursor + value.length, kind: token_kind, value } as T :
			{ cursor, kind: null_token_kind } as NullToken
	}


/** the Lexer class manages tokenization rules and provides a method for adding rules. */
export class Lexer {
	private rules: Map<TokenKind, Tokenizer[]> = new Map()

	constructor() { }

	/** add a tokenization rule for an atomic token.
	 * @param kind the kind of token to be matched.
	 * @param pattern the pattern to be matched (string or regex).
	 * @param precedence precedence of the rule. `1` places the rule at the end, `-1` place it at the beginning.
	*/
	addRule<T extends AtomicToken>(kind: T["kind"], pattern: string, precedence?: -1 | 1): void
	addRule<T extends AtomicToken>(kind: T["kind"], pattern: RegExp, precedence?: -1 | 1): void
	/** add a tokenization rule for a composite token.
	 * @param kind the kind of token to be matched.
	 * @param pattern an array of other tokens, strings, or regex to match. composite tokens will be resolved recursively, by matching using their own rule set.
	 * @param precedence precedence of the rule. `1` places the rule at the end, `-1` place it at the beginning.
	*/
	addRule<T extends CompositeToken>(kind: T["kind"], pattern: (string | RegExp | TokenKind)[], precedence?: -1 | 1): void
	addRule<T extends AtomicToken | CompositeToken>(
		kind: T["kind"],
		pattern: string | RegExp | (string | RegExp | TokenKind)[],
		precedence?: -1 | 1,
	): void {
		if (!this.rules.has(kind)) { this.rules.set(kind, []) }
		console.debug("adding rule: ", kind, " => ", pattern)
		switch (true) {
			case typeof pattern === "string":
				return this.addRuleAtomicKeyword(kind, pattern as string, precedence ?? 1)
			case pattern instanceof RegExp:
				return this.addRuleAtomicRegex(kind, pattern as RegExp, precedence ?? 1)
			case pattern instanceof Array:
				return this.addRuleComposite(kind, pattern as (string | RegExp | TokenKind)[], precedence ?? -1)
			default:
				Error("invalid type of rule. rule must be one of:\n - string\n - RegExp\n - Array")
		}
	}

	private addRuleAtomicKeyword<T extends AtomicToken>(kind: T["kind"], pattern: string, precedence: -1 | 1): void {
		const
			tokenizers = this.rules.get(kind)!,
			new_tokenizer = match_pattern_literal.bind(undefined, kind, pattern)
		precedence > 0 ?
			tokenizers.push(new_tokenizer) :
			tokenizers.unshift(new_tokenizer)
	}

	private addRuleAtomicRegex<T extends AtomicToken>(kind: T["kind"], pattern: RegExp, precedence: -1 | 1): void {
		const
			tokenizers = this.rules.get(kind)!,
			new_tokenizer = match_pattern_regex.bind(undefined, kind, pattern)
		precedence > 0 ?
			tokenizers.push(new_tokenizer) :
			tokenizers.unshift(new_tokenizer)
	}

	private addRuleComposite<T extends CompositeToken>(kind: T["kind"], pattern: (string | RegExp | TokenKind)[], precedence: -1 | 1): void {
		const tokenizers = this.rules.get(kind)!
		const new_tokenizer = (cursor: number, input: string): T | NullToken => {
			let inline_depth = 0 // this number indicates how many `inline_next_token` tokens are being used in succession
			const value: TokenTree[] = []
			for (const sub_pattern of pattern) {
				cursor = skip_whitespace(cursor, input)
				if (typeof sub_pattern === "string") {
					const token = match_pattern_literal(any_token_kind, sub_pattern, cursor, input)
					if (token.kind === null_token_kind) { return token as NullToken }
					cursor = token.cursor // equivalent to `cursor += sub_pattern.length`
				} else if (sub_pattern instanceof RegExp) {
					const token = match_pattern_regex(any_token_kind, sub_pattern, cursor, input)
					if (token.kind === null_token_kind) { return token as NullToken }
					cursor = token.cursor
				} else if (control_symbols.has(sub_pattern)) {
					// TODO remaining control tokens
					switch (sub_pattern) {
						case inline_next_token: {
							inline_depth += 1
							break
						}
						case repeat_zero_or_once: { }
						case repeat_zero_or_more: { }
						case repeat_once_or_more: { }
					}
				} else {
					const token = this.matchRule<T>(sub_pattern, cursor, input)
					if (token.kind === null_token_kind) {
						return { cursor, kind: null_token_kind } as NullToken
					}
					cursor = token.cursor
					value.push(...collect_at_depth(token, inline_depth))
					inline_depth = 0
				}
			}
			return { cursor, kind, value } as T
		}
		precedence > 0 ?
			tokenizers.push(new_tokenizer) :
			tokenizers.unshift(new_tokenizer)
	}

	/** match a rule for a given token kind.
	 * @param kind the kind of token to match.
	 * @param cursor the current cursor position. use `0` for starting from the beginning.
	 * @param input the input text being tokenized.
	 * @returns the matched token, or a {@link NullToken | null token} if no match is found.
	*/
	matchRule<T extends AtomicToken | CompositeToken>(kind: T["kind"], cursor: number, input: string): T | NullToken {
		cursor = skip_whitespace(cursor, input)
		const tokenizers = this.rules.get(kind)!
		for (const tokenizer of tokenizers) {
			const token = tokenizer(cursor, input)
			if (token.kind !== null_token_kind) { return token as T }
		}
		return { cursor, kind: null_token_kind } as NullToken
	}

	/** convert a token tree to a string representation. <br>
	 * - composite tokens are represented as `the_token_kind=>[ first_subtoken_kind, second_subtoken_kind, ... ]` <br>
	 * - atomic tokens are represented as `(the_token_kind="its_literal_value")`
	 * @param token the token tree to convert to a string.
	 * @returns the string representation of the token tree.
	*/
	static tokenTreeToString = (token: TokenTree): string => {
		const { kind, value } = token
		return value === undefined ? "" :
			typeof value === "string" ?
				"(" + kind.description + "=\"" + value + "\")" :
				kind.description + "=>" + "[ " + value.map(this.tokenTreeToString).join(", ") + " ]"
	}
}
