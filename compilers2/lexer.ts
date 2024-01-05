import { SortedArray, array_insertItem, skip_whitespace } from "./deps.ts"

export type TokenKind = symbol
export interface Token {
	kind: TokenKind
	value: string
	cursor: number
}

/** a `TokenizerFunction` is a function, specific to a certain {@link TokenKind | kind of token},
 * which can generate a single {@link Token} from an input text, starting from the specific `cursor` position.
 * if it fails to tokenize, it should return `undefined`
*/
export type TokenizerFunction<T extends Token = any> = (cursor: number, input: string) => T | undefined

// provided by the `Lexer`
export type UnTokenizerFunction<T extends Token = any> = (input: T) => string | undefined

interface Lexer<T extends Token = any> {
	/** you must specify the precedence if the {@link kind} does not already exist within the {@link LexerContext.precedence | LexerContext} */
	precedence?: "start" | "end" | number
	kind: T["kind"]
	tokenize: TokenizerFunction<T>
	untokenize: UnTokenizerFunction<T>
}

// a factory function for producing a lexer
export type LexerFactory<T extends Token = any> = (ctx: LexerContext) => Lexer<T>

export const Uncaught: TokenKind = Symbol("tk:uncaught")
export const uncaughtLexer_Factory: LexerFactory = (ctx: LexerContext) => {
	return {
		precedence: "start",
		kind: Uncaught,
		tokenize: (cursor: number, input: string) => {
			throw Error("uncaught substring starting at " + cursor + "\n\t" + input.substring(cursor, cursor + 100))
		},
		untokenize: (input: Token): string => {
			throw Error("uncaught token cannot be converted source string")
		}
	}
}

const
	match_pattern_literal = <T extends Token = any>(token_kind: T["kind"], pattern: string, cursor: number, input: string): T | undefined => {
		return input.substring(cursor, cursor + pattern.length) === pattern ?
			{ cursor: cursor + pattern.length, kind: token_kind, value: pattern } as T :
			undefined
	},
	match_pattern_regex = <T extends Token = any>(token_kind: T["kind"], pattern: RegExp, cursor: number, input: string): T | undefined => {
		const
			match = pattern.exec(input.substring(cursor)),
			value = match?.[0],
			index = match?.index
		return index === 0 && value ?
			{ cursor: cursor + value.length, kind: token_kind, value } as T :
			undefined
	}

export const pattern_tokenizer_generator = <T extends Token = any>(kind: T["kind"], pattern: string | RegExp): TokenizerFunction<T> => {
	return (typeof pattern === "string" ?
		match_pattern_literal.bind(undefined, kind, pattern) :
		match_pattern_regex.bind(undefined, kind, pattern)
	) as TokenizerFunction<T>
}

export const patternLexer_FactoryGenerator = <T extends Token = any>(
	kind: T["kind"] | LexerFactory,
	pattern: string | RegExp,
	precedence?: "end" | "start" | number | undefined,
	import_preceeding_factories: Array<LexerFactory> = [],
): LexerFactory<T> => {
	return (ctx: LexerContext) => {
		for (const lexer_factory of import_preceeding_factories) {
			ctx.getLexer(lexer_factory)
		}
		kind = typeof kind === "function" ?
			ctx.getLexer(kind).kind as T["kind"] :
			kind
		return {
			precedence, kind,
			tokenize: pattern_tokenizer_generator(kind, pattern),
			untokenize: (input: Token): string => {
				throw Error("not implemented yet")
			}
		}
	}
}

export class LexerContext {
	/** a memorized collection of all regiestered lexers plugged into the current context */
	private collection: Map<LexerFactory, Lexer> = new Map()
	private tokenizers = new SortedArray<TokenizerFunction, number>([], (a, b) => (b[0] - a[0]))
	// TODO: think how it should be implemented. should it even be a SortedArray?
	private untokenizers = new SortedArray<UnTokenizerFunction, number>([], (a, b) => (b[0] - a[0]))
	private precedence: Array<TokenKind> = []

	constructor() {
		this.addLexer(uncaughtLexer_Factory)
	}

	addLexer<T extends Token = any>(lexer_factory: LexerFactory<T>): ReturnType<typeof lexer_factory> {
		const
			this_precedence = this.precedence,
			lex = lexer_factory(this),
			{ kind, precedence, tokenize, untokenize } = lex
		if (!this_precedence.includes(kind)) {
			if (precedence === undefined) { throw Error("`Lexer.precedence` must be specified when adding a lexer with a new `Lexer.kind`") }
			array_insertItem(this_precedence, precedence, kind)
		}
		this.collection.set(lexer_factory, lex)
		this.tokenizers.insert(tokenize, this_precedence.indexOf(kind))
		return lex
	}

	getLexer<T extends Token = any>(lexer_factory: LexerFactory<T>): ReturnType<typeof lexer_factory> {
		return this.collection.has(lexer_factory) ?
			this.collection.get(lexer_factory)! :
			this.addLexer(lexer_factory)
	}

	// TODO: implement `delLexer` for deleting existing lexers, but it should also delete all of its dependencies if it's the only one using it. think of DAG leaf node deletion

	exec(input: string): Token[] {
		const
			tokenizers = this.tokenizers.getItems(),
			tokens: Token[] = [],
			input_len = input.length
		let
			cursor = 0,
			prev_token: Token = { kind: undefined as any, value: "", cursor: 0 },
			success: Token | undefined = undefined
		while (prev_token.kind !== Uncaught) {
			success = undefined
			cursor = skip_whitespace(cursor, input)
			if (cursor >= input_len) { break }
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

	// TODO
	unexec(input: Token[]): string {
		return ""
	}
}
