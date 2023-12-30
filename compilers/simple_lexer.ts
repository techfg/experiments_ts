export type TokenKind = symbol

export const
	Comment: TokenKind = Symbol("comment"),
	Keyword: TokenKind = Symbol("keyword"),
	Assignment: TokenKind = Symbol("assignment"),
	Operator: TokenKind = Symbol("operator"),
	Rune: TokenKind = Symbol("rune"),
	NumberLiteral: TokenKind = Symbol("number"),
	StringLiteral: TokenKind = Symbol("string"),
	BooleanLiteral: TokenKind = Symbol("boolean"),
	NullLiteral: TokenKind = Symbol("null"),
	Identifier: TokenKind = Symbol("identifier"),
	Uncaught: TokenKind = Symbol("uncaught"),
	/** token kinds in the order of their precedence */
	token_kind_precedence: TokenKind[] = [
		Uncaught, Identifier, NullLiteral,
		BooleanLiteral, StringLiteral, NumberLiteral,
		Rune, Operator, Assignment,
		Keyword, Comment,
	]

export interface Token {
	kind: TokenKind
	value: string
	cursor: number
}

export const
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


/** represents a sorted array of items `T`, that is sorted in accordance to each item's associated order key `K`.
 * items with the same order are kept together, and sorted in their insertion order.
 * 
 * @typeParam T the type of items stored in the sorted array.
 * @typeParam K the type of the order key associated with each item.
*/
export class SortedArray<T, K extends any = number> {
	private sort_fn: ((a: [K, T[]], b: [K, T[]]) => number)
	private map: Map<K, T[]>
	private dirty = false
	private items: Array<T> = []

	/**
	 * @param initial_items an array of 2-tuple,  where each tuple contains items and their associated order key.
	 * @param sort_fn a function used for sorting the array based on order keys `K`. see {@link Array.sort | builtin Array sort method}
	*/
	constructor(
		initial_items: Array<[items: T | T[], order: K]> = [],
		sort_fn: ((a: [K, T[]], b: [K, T[]]) => number) = ((a, b) => ((a[0] as number) - (b[0] as number)))
	) {
		this.map = new Map<K, T[]>(initial_items.map(
			([items, order]) => [order, isArray(items) ? items : [items]]
		))
		this.sort_fn = sort_fn
	}

	/** inserts an item with the specified order key into the sorted array.
	 *
	 * @param item the item to insert into the sorted array.
	 * @param order the order key associated with the item.
	*/
	insert(item: T, order: K): void {
		if (!this.map.has(order)) {
			this.map.set(order, [])
		}
		this.map.get(order)!.push(item)
		this.dirty = true
	}

	/** deletes an item with the specified order key from the sorted array.
	 *
	 * @param item the item to delete from the sorted array.
	 * @param order the order key associated with the item.
	*/
	delete(item: T, order: K): void {
		const items_in_the_order = this.map.get(order)
		if (items_in_the_order) {
			this.dirty ||= array_delete_item(items_in_the_order, item)
			if (isEmpty(items_in_the_order)) {
				this.map.delete(order)
			}
		}
	}

	/** updates the internal array by sorting it based on order keys. */
	update(): void {
		this.items = [...this.map]
			.sort(this.sort_fn)
			.flatMap((entry) => entry[1])
		this.dirty = false
	}

	/** gets an array containing all the items in the sorted array.
	 * If the array is dirty (i.e., items have been inserted or deleted), it will be updated before retrieval.
	 *
	 * @returns An array containing all the items in the sorted array.
	*/
	getItems(): Array<T> {
		if (this.dirty) { this.update() }
		return this.items
	}
}


/** a `Tokenizer` is a function, specific to a certain kind of token, which can basically tokenize an input text, starting from a specific cursor position.
 * if it fails to tokenize, it should return `undefined`
*/
export type Tokenizer = (cursor: number, input: string) => Token | undefined

export class LexerContext {
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

export const lex = new LexerContext()
lex.addRule(Comment, new RegExp("^\\/\\/.*")) // line comment
lex.addRule(Comment, new RegExp("^\\/\\*[\\s\\S]*?\\*\\/")) // multiline comment
lex.addRule(StringLiteral, new RegExp("^\"(?:[^\"\\\\]|\\\\.)*\"")) // double quoted string literal which does not prematurely stop at escaped quotation marks `\"`
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

const assignments: string[] = [
	"**=", "+=", "-=", "*=", "/=", "%="
]
assignments.forEach((eq) => { lex.addRule(Assignment, eq) })
lex.addRule(Assignment, new RegExp("^=(?!=)")) //do not capture equals signs that are followed by another equals sign

const operators: string[] = [
	"===", "==", "!==", "!=", "<=", ">=",
	"**", "+", "-", "*", "/", "%",
	"&&", "||", "!",
	"&", "|", "^", "~", ">>>", "<<", ">>",
	"<", ">", "??", "?.", "...", "."
]
operators.forEach((op) => { lex.addRule(Operator, op) })

const runes: string[] = [
	"$(", ")$", "(", ")",
	"{", "}", "[", "]",
	",", ":", ";",
]
runes.forEach((rn) => { lex.addRule(Rune, rn) })


// run test
console.log(lex.exec("let abcd: string = \"somebullshit\" ;"))
console.log(lex.exec(`
function fib$(T extends number)$(num: T, xyz: string): void {
	num = fib((num - 1), (num - 2)) || true;
	num += 55;
	let str: string = "kill \\"ya selfu";
	return "lukemia".length >= str.length ?? {
		k: 42,
		y: false === true,
		s: "kys",
	}
};
`))


// combinator and dynamic parsers
type ParseKind = symbol
type ParseTree = ParseTreeComposite | ParseTreeAtomic<any>

interface ParseTreeAtomic<T> {
	kind: ParseKind
	value: T
	cursor: number
}

interface ParseTreeComposite {
	kind: ParseKind
	value: ParseTree[]
	cursor: number
}

type ParseFunction<P extends ParseTree> = (cursor: number, input: Token[]) => Iterable<P | undefined>

interface ParserZ<P extends ParseTree> {
	parsers: SortedArray<ParseFunction<P>>
}

const number_tree = {}


abstract class Parser<P extends ParseTree> {
	abstract parse(cursor: number, input: Token[]): Iterable<P | undefined>

	// helper function for OR combinator
	or(...parsers: ParseFunction<P>[]): ParseFunction<P> {
		return function* (cursor: number, input: Token[]): Iterable<P | undefined> {
			for (const parser of parsers) {
				yield* parser(cursor, input)
			}
		}
	}

	// Helper function for OPTIONAL combinator
	optional(parser: ParseFunction<P>): ParseFunction<P> {
		return function* (cursor: number, input: Token[]): Iterable<P | undefined> {
			yield* parser(cursor, input)
			yield { kind: parserSymbol, value: undefined, cursor } as P
		}
	}

	// Helper function for REPEAT_ONE_OR_MORE combinator
	repeatOneOrMore(parser: ParseFunction<P>): ParseFunction<P> {
		return function* (cursor: number, input: Token[]): Iterable<P | undefined> {
			let result: P | undefined
			let currentCursor = cursor

			do {
				result = undefined
				for (const item of parser(currentCursor, input)) {
					if (item) {
						result = item
						currentCursor = item.cursor
						yield item
						break
					}
				}
			} while (result)

			if (!result) {
				yield undefined
			}
		}
	}

	// Helper function for REPEAT_ZERO_OR_MORE combinator
	repeatZeroOrMore(parser: ParseFunction<P>): ParseFunction<P> {
		return function* (cursor: number, input: Token[]): Iterable<P | undefined> {
			let result: P | undefined
			let currentCursor = cursor

			do {
				result = undefined
				for (const item of parser(currentCursor, input)) {
					if (item) {
						result = item
						currentCursor = item.cursor
						yield item
						break
					}
				}
			} while (result)

			yield { kind: parserSymbol, value: undefined, cursor: currentCursor } as P
		}
	}
}




// combinator and dynamic parsers
/*

type ParseKind = symbol

interface ParseTree<T> {
	kind: ParseKind
	value: T
	cursor: number
}

type ParseTreeAtomic<T> = T extends Array<ParseTree<any>> ? never : ParseTree<T>
type ParseTreeComposite<T extends Array<ParseTree<any>>> = ParseTree<T>
type Parser<P extends ParseTree<T>, T = any> = (cursor: number, input: Array<Token>) => undefined | P
type ParseFunction<P extends ParseTree<T>, T = any> = (cursor: number, input: Array<Token>) => Iterable<P>

interface FeatureClass<P extends ParseTree<any>> {
	parsers: SortedArray<Parser<P>, number>
	parse: (cursor: number, input: Array<Token>) => Iterable<P>
}

const OR = function* <P extends ParseTree<any>>(this: FeatureClass<P>, cursor: number, input: Token[]): Iterable<P> {
	const parsers = this.parsers.getItems()
	let parsed_item = undefined
	for (const parser of parsers) {
		parsed_item = parser(cursor, input)
		if (parsed_item !== undefined) { yield parsed_item }
	}
	return undefined
}


class Expression {
	static kind: ParseKind = Symbol("expression")
	static parsers = new SortedArray<Parser<any>, number>([], (a, b) => (b[0] - a[0]))
	static parse: (cursor: number, input: Array<Token>) => Iterable<any> = OR.bind(this)
}

class Number {
	static kind: ParseKind = Symbol("number")
	static parsers = new SortedArray<Parser<any, number>, number>([], (a, b) => (b[0] - a[0]))
	static parse: (cursor: number, input: Array<Token>) => Iterable<ParseTree<number>> = OR.bind(this)
	static {
		this.parsers.insert((cursor, input) => {
			const token = input[cursor]
			return token.kind === NumberLiteral ?
				{ kind: this.kind, value: token.value, cursor: cursor + 1 } :
				undefined
		}, 0)

		Expression.parsers.insert(this)
	}
}

*/

/*
abstract class Feature {
	// pre_parsing
	// post_parsing // recognize the structures/objects inside of the tree that correspond to this feature and mutate accordingly. this mutation will then benefit and get consumed by the language specific unparser
	// unparse // implement target langauge specific unparsing
	// toGraph // convert the parsing rules into a railway directed dependency representation graph
	// static rules: BST<Feature>
	private static parsers: SortedArray<Feature>
	static parse<F extends Feature>(this: new (...args: any[]) => F): Iterable<F> {

	}
}

class Expression extends Feature {

	static parsers: Parser<Feature>[] = []
}

class Number extends Expression {
	static {
		super.parsers.push()
	}

	static parsers = []
}

*/

