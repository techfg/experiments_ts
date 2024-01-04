/* typescript lexing example */

import { LexerContext, LexerFactory, pattern_tokenizer_generator, patternLexer_FactoryFactory, Token, TokenKind } from "./lexer.ts"


const
	lexerFactory_Identifier = patternLexer_FactoryFactory(Symbol("tk:identifier"), new RegExp("^[a-zA-Z_]\\w*"), "end"), // any identifier (whether a variable, function, or a type)
	lexerFactory_NullLiteralUndefined = patternLexer_FactoryFactory(Symbol("tk:null"), "undefined", "end", [lexerFactory_Identifier]),
	lexerFactory_NullLiteralNull = patternLexer_FactoryFactory(lexerFactory_NullLiteralUndefined, "null"),
	lexerFactory_BooleanLiteralTrue = patternLexer_FactoryFactory(Symbol("tk:boolean"), "true", "end", [lexerFactory_NullLiteralNull]),
	lexerFactory_BooleanLiteralFalse = patternLexer_FactoryFactory(lexerFactory_BooleanLiteralTrue, "false"),
	lexerFactory_StringLiteral = patternLexer_FactoryFactory(Symbol("tk:string"), new RegExp("^\"(?:[^\"\\\\]|\\\\.)*\""), "end", [lexerFactory_BooleanLiteralFalse]), // double quoted string literal which does not prematurely stop at escaped quotation marks `\"`,
	lexerFactory_NumberLiteral = patternLexer_FactoryFactory(Symbol("tk:number"), new RegExp("^\\d+(\\.\\d*)?"), "end", [lexerFactory_StringLiteral]), // number literal
	lexerFactory_LineComment = patternLexer_FactoryFactory(Symbol("tk:comment"), new RegExp("^\\/\\/.*"), "end", [lexerFactory_NumberLiteral]), // line comment
	lexerFactory_MultilineComment = patternLexer_FactoryFactory(lexerFactory_LineComment, new RegExp("^\\/\\*[\\s\\S]*?\\*\\/")) // multiline comment



const lex = new LexerContext()
lex.addLexer(lexerFactory_MultilineComment)
console.log(lex.exec(`
/* crucial
 * function docs
*/
function fib
	num fib num 1 num 2 true
	let str string "kill \\"ya selfu" // tells people that they should kill themseves
`))

