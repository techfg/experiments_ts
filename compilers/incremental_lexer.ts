

/* parse the following BNF grammar in a modular incremental manner:
 * 
 * breakfast => protein "with" breakfast "on the side" ;
 * breakfast => protein ;
 * breakfast => bread ;
 * 
 * protein => crispiness "crispy" "bacon" ;
 * protein => "sausage" ;
 * protein => cooked "eggs" ;
 * 
 * crispiness => "really" crispiness ;
 * crispiness => "really" ;
 * 
 * cooked => "scrambled" ;
 * cooked => "poached" ;
 * cooked => "fried" ;
 * 
 * bread => "toast" ;
 * bread => "biscuits" ;
 * bread => "english muffin" ;
 * 
 * menu => "{" statements "}" ;
 * statement => breakfast ";" ;
 * statements => statement statements ;
 * statements => statement ;
*/

/*
This will be a chat on attempting to structure and build a Lexer + Parser + AST in Typescript, in a modular plugin style way.

The first part will only focus on tackling Lexing to create tokens.
To give an illustration of how the tokens should behave, first consider the following BNF grammar:
```txt
breakfast => protein "with" breakfast "on-the-side" ;
breakfast => protein ;
breakfast => bread ;

protein => crispiness "crispy" "bacon" ;
protein => "sausage" ;
protein => cooked "eggs" ;

crispiness => "really" ;
crispiness => "really" crispiness ;

cooked => "scrambled" ;
cooked => "poached" ;
cooked => "fried" ;

bread => "toast" ;
bread => "biscuits" ;
bread => "english-muffin" ;
```

A token will be an object that also contains information about possible children tokens (`this.value`) which it could be composed of (think of it as a parse tree). here is what a token is defined as:
```ts
interface TokenTree {
	// the position of the cursor (in the input text) AFTER this token has been identified
	cursor: number
	// specify the kind of token. for example: is it a "breakfast" token, or a "crispiness" token
	kind: string
	// the token's value specifies either its string-literal representation (atomic token), or can be composed of smaller tokens (composite token)
	value?: string | TokenTree[]
}
```

a `Tokenizer` is a function, specific to a certain kind of token, which can basically tokenize an input text, starting from a specific cursor position
```ts
type Tokenizer = (cursor: number, input: string) => TokenTree
```

if a `Tokenizer` should fail at matching the input, it should return a `NullToken`, with its `cursor` property dictating how far the cursor had reached before failing all possible match patterns. Note that it will be up to the caller of the Tokenizer function (which could be recursive as well) to deside what to do with the return `cursor` position propoerty of a possible `NullToken`, but generally it will be ignored because the caller will probably want to call other `Tokenizer` functions that may match the input, should the first `Tokenizer` return a `NullToken`.
```ts
interface NullToken extends TokenTree {
	kind: "null"
	value: never
}
```

our goal is to add BNF-like rules to the system so that it can be step-by-step (or rule-by-rule to be more precise). this would allow one to add new grammar onto existing grammar. for example, we might later wish to include the following pattern for breakfast as well: `breakfast => breakfast "and" juice`, when we add a new definition for a `JuiceToken` later.
note that the grammar will NEVER depend on left recursion.
moreover, assume there are the following helper function for understanding whitespaces:
- `is_whitespace(cursor: number, input_text: string): boolean` is the cursor on a whitespace?
- `skip_whitespace(cursor: number, input_text: string): number` find the cursor position of the next non-whitespace. if `cursor` was already on a non-whitespace, then the same value of the cursor will be returned
- `find_next_whitespace(cursor: number, input_text: string): number` find next cursor position of a whitespace. if cursor is already at a whitespace, the very same value will be returned.

here is a general layout for how function/method calls will be made to create a tokenization ruleset for the grammar in the example:
- define Breakfast
- define Cooked
- define Crispiness
- define Bread
- define Protein
- addRule(Crispiness, "really")
- addRule(Crispiness, ["really", Crispiness])
- addRule(Cooked, "scrambled")
- addRule(Cooked, "poached")
- addRule(Cooked, "fried")
- addRule(Bread, "toast")
- addRule(Bread, "biscuits")
- addRule(Bread, "english-muffin")
- addRule(Breakfast, [Bread])
- addRule(Protein, "sausage")
- addRule(Protein, [Cooked, "eggs"])
- addRule(Protein, [Crispiness, "crispy", "bacon"])
- addRule(Breakfast, [Protein])
- addRule(Breakfast, [Protein, "with", Breakfast "on-the-side"])
*/

// const BreakfastTokenKind = Symbol("breakfast")

type TokenKind = symbol

interface TokenTree {
	cursor: number
	kind: TokenKind
	value?: string | TokenTree[]
}

interface CompositeToken extends TokenTree {
	cursor: number
	value: TokenTree[]
}

interface AtomicToken extends TokenTree {
	cursor: number
	value: string
}

const null_token_kind = Symbol("null")
interface NullToken extends TokenTree {
	kind: typeof null_token_kind
	value: never
}

type Tokenizer = (cursor: number, input: string) => TokenTree

const
	whitespace_chars = [" ".charCodeAt(0), "\t".charCodeAt(0), "\n".charCodeAt(0), "\r".charCodeAt(0)],
	is_whitespace = (cursor: number, input_text: string): boolean => {
		return whitespace_chars.includes(input_text.charCodeAt(cursor))
	},
	skip_whitespace = (cursor: number, input_text: string): number => {
		while (is_whitespace(cursor, input_text)) { cursor += 1 }
		return cursor
	},
	find_next_whitespace = (cursor: number, input_text: string): number => {
		while (!is_whitespace(cursor, input_text)) { cursor += 1 }
		return cursor
	}

const TokenTree_toString = (token: TokenTree): string => {
	const { kind, value } = token
	return value === undefined ? "" :
		typeof value === "string" ?
			"(" + kind.description + "=\"" + value + "\")" :
			kind.description + "=>" + "[ " + value.map(TokenTree_toString).join(", ") + " ]"
	// return value === undefined ? "" :
	// 	typeof value === "string" ?
	// 		"[ " + kind.description + "=\"" + value + "\" ]" :
	// 		"[ " + kind.description + ": " + value.map(TokenTree_toString).join(", ") + " ]"
}

class Lexer {
	private rules: Map<TokenKind, Tokenizer[]> = new Map()

	constructor() { }

	addRule<T extends AtomicToken>(kind: T["kind"], pattern: string, precedence?: -1 | 1): void
	addRule<T extends CompositeToken>(kind: T["kind"], pattern: (string | TokenKind)[], precedence?: -1 | 1): void
	addRule<T extends AtomicToken | CompositeToken>(
		kind: T["kind"],
		pattern: string | (string | TokenKind)[],
		precedence?: -1 | 1,
	): void {
		if (!this.rules.has(kind)) { this.rules.set(kind, []) }
		console.debug("adding rule: ", kind, " => ", pattern)
		return typeof pattern === "string" ?
			this.addRuleAtomic(kind, pattern, precedence ?? 1) :
			this.addRuleComposite(kind, pattern, precedence ?? -1)
	}

	private addRuleAtomic<T extends AtomicToken>(kind: T["kind"], pattern: string, precedence: -1 | 1): void {
		const tokenizers = this.rules.get(kind)!
		const new_tokenizer = (cursor: number, input: string): T | NullToken => {
			const value = input.slice(cursor, cursor + pattern.length)
			return value === pattern ?
				{ cursor: cursor + pattern.length, kind, value } as T :
				{ cursor, kind: null_token_kind } as NullToken
		}
		precedence > 0 ?
			tokenizers.push(new_tokenizer) :
			tokenizers.unshift(new_tokenizer)
	}

	private addRuleComposite<T extends CompositeToken>(kind: T["kind"], pattern: (string | TokenKind)[], precedence: -1 | 1): void {
		const tokenizers = this.rules.get(kind)!
		const new_tokenizer = (cursor: number, input: string): T | NullToken => {
			const value: TokenTree[] = []
			for (const sub_pattern of pattern) {
				cursor = skip_whitespace(cursor, input)
				if (typeof sub_pattern === "string") {
					const sub_pattern_len = sub_pattern.length
					if (input.substring(cursor, cursor + sub_pattern_len) !== sub_pattern) {
						return { cursor, kind: null_token_kind } as NullToken
					}
					cursor += sub_pattern_len
				} else {
					const token = this.matchRule<T>(sub_pattern, cursor, input)
					if (token.kind === null_token_kind) {
						return { cursor, kind: null_token_kind } as NullToken
					}
					value.push(token)
					cursor = token.cursor
				}
			}
			return { cursor, kind, value } as T
		}
		precedence > 0 ?
			tokenizers.push(new_tokenizer) :
			tokenizers.unshift(new_tokenizer)
	}

	matchRule<T extends AtomicToken | CompositeToken>(kind: T["kind"], cursor: number, input: string): T | NullToken {
		const tokenizers = this.rules.get(kind)!
		for (const tokenizer of tokenizers) {
			const token = tokenizer(cursor, input)
			if (token.kind !== null_token_kind) { return token as T }
		}
		return { cursor, kind: null_token_kind } as NullToken
	}
}



const lex = new Lexer()

const
	breakfast_token_kind = Symbol("breakfast"),
	cooked_token_kind = Symbol("cooked"),
	crispiness_token_kind = Symbol("crispiness"),
	bread_token_kind = Symbol("bread"),
	protein_token_kind = Symbol("protein"),
	statement_token_kind = Symbol("statement"),
	statements_token_kind = Symbol("statements"),
	menu_token_kind = Symbol("menu")

lex.addRule(crispiness_token_kind, "really")
lex.addRule(crispiness_token_kind, ["really", crispiness_token_kind]) //auto-precedence (which will be -1) will put it at the top of the pattern match list (first pattern to get checked)
lex.addRule(cooked_token_kind, "scrambled")
lex.addRule(cooked_token_kind, "poached")
lex.addRule(cooked_token_kind, "fried")

lex.addRule(breakfast_token_kind, [protein_token_kind, "with", breakfast_token_kind, "on-the-side"], -1)

lex.addRule(protein_token_kind, [crispiness_token_kind, "crispy", "bacon"])
lex.addRule(protein_token_kind, [cooked_token_kind, "eggs"])
lex.addRule(protein_token_kind, "sausage")
lex.addRule(breakfast_token_kind, [protein_token_kind], 1)

lex.addRule(bread_token_kind, "toast")
lex.addRule(bread_token_kind, "biscuits")
lex.addRule(bread_token_kind, "english-muffin")
lex.addRule(breakfast_token_kind, [bread_token_kind], 1)

lex.addRule(menu_token_kind, ["{", statements_token_kind, "}"])
lex.addRule(statements_token_kind, [statement_token_kind, statements_token_kind])
lex.addRule(statements_token_kind, [statement_token_kind], 1)

lex.addRule(statement_token_kind, [breakfast_token_kind, ";"])


const token_tree1 = lex.matchRule(breakfast_token_kind, 0, "sausage with sausage on-the-side") // breakfast=>[ (protein="sausage"), breakfast=>[ (protein="sausage") ] ]
const token_tree2 = lex.matchRule(breakfast_token_kind, 0, "sausage with toast on-the-side") // breakfast=>[ (protein="sausage"), breakfast=>[ (bread="toast") ] ]
const token_tree3 = lex.matchRule(breakfast_token_kind, 0, "sausage with really really really crispy bacon with toast on-the-side on-the-side") // breakfast=>[ (protein="sausage"), breakfast=>[ protein=>[ crispiness=>[ crispiness=>[ (crispiness="really") ] ] ], breakfast=>[ (bread="toast") ] ] ]
const token_tree4 = lex.matchRule(menu_token_kind, 0, "{sausage with really really really crispy bacon with toast on-the-side on-the-side;}") // menu=>[ statements=>[ statement=>[ breakfast=>[ (protein="sausage"), breakfast=>[ protein=>[ crispiness=>[ crispiness=>[ (crispiness="really") ] ] ], breakfast=>[ (bread="toast") ] ] ] ] ] ]
const token_tree5 = lex.matchRule(
	menu_token_kind, 0,
	`{
		sausage with toast on-the-side;
		really really crispy bacon with poached eggs with biscuits on-the-side on-the-side;
		english-muffin;
	}`
) // menu=>[ statements=>[ statement=>[ breakfast=>[ (protein="sausage"), breakfast=>[ (bread="toast") ] ] ], statements=>[ statement=>[ breakfast=>[ protein=>[ crispiness=>[ (crispiness="really") ] ], breakfast=>[ protein=>[ (cooked="poached") ], breakfast=>[ (bread="biscuits") ] ] ] ], statements=>[ statement=>[ breakfast=>[ (bread="english-muffin") ] ] ] ] ] ]
TokenTree_toString(token_tree5)

