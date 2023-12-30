/* typescript lexing example */

import { LexerContext, TokenKind } from "./simple_lexer.ts"
import { ParseKind, ParseTree, ParserContext, transform_parser_kind } from "./simple_parser.ts"

const
	Comment: TokenKind = Symbol("tk:comment"),
	Keyword: TokenKind = Symbol("tk:keyword"),
	Assignment: TokenKind = Symbol("tk:assignment"),
	Operator: TokenKind = Symbol("tk:operator"),
	Rune: TokenKind = Symbol("tk:rune"),
	NumberLiteral: TokenKind = Symbol("tk:number"),
	StringLiteral: TokenKind = Symbol("tk:string"),
	BooleanLiteral: TokenKind = Symbol("tk:boolean"),
	NullLiteral: TokenKind = Symbol("tk:null"),
	Identifier: TokenKind = Symbol("tk:identifier"),
	/** token kinds in the order of their precedence */
	token_kind_precedence: TokenKind[] = [
		Identifier, NullLiteral,
		BooleanLiteral, StringLiteral, NumberLiteral,
		Rune, Operator, Assignment,
		Keyword, Comment,
	]


const lex = new LexerContext(token_kind_precedence)
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



// parsing portion

type ParseTree_LetStatement = ParseTree<[id: string, type_id: string, expression: any]>

const parser_ctx = new ParserContext()
const parse_kind_terminal_expression: ParseKind = Symbol("pk:terminal expression")
const parse_terminal_expression = transform_parser_kind(parse_kind_terminal_expression, parser_ctx.parseOneof(
	{ kind: NumberLiteral, keep: true },
	{ kind: StringLiteral, keep: true },
	{ kind: BooleanLiteral, keep: true },
))
parser_ctx.addParser(parse_kind_terminal_expression, parse_terminal_expression)

const parse_kind_let_statement: ParseKind = Symbol("pk:let statement")
const parse_let_statement_subparser = transform_parser_kind(parse_kind_let_statement, parser_ctx.parseSequence(
	{ kind: Keyword, pattern: "let", keep: false },
	{ kind: Identifier, keep: true },
	{ kind: Rune, pattern: ":", keep: false },
	{ kind: Identifier, keep: true },
	{ kind: Assignment, pattern: "=", keep: false },
	{ pattern: parse_kind_terminal_expression, keep: true, transform: (ptree: ReturnType<typeof parse_terminal_expression>) => (ptree) },
	{ kind: Rune, pattern: ";", keep: false },
))
parser_ctx.addParser(parse_kind_let_statement, parse_let_statement_subparser)

parser_ctx.getParser(parse_kind_let_statement)(0, lex.exec("let abc_d: string = 33;"))

