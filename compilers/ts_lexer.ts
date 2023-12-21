import { Lexer, inline_next_token } from "./incremental_lexer.ts"

/** TASK:
 * parse simple typescript code:
 * 
 * program => statement_list
 * scope => "{" statement_list "}"
 * 
 * statement_list => statement (inline)statement_list
 * statement_list => statement
 * 
 * variable_assign => identifier "=" expression
 * statement => variable_assign ";"
 * 
 * variable_declaration> => "let" identifier ":" type "=" expression
 * statement => variable_declaration ";"
 * 
 * parameter_list> => parameter "," (inline)parameter_list
 * parameter_list> => parameter
 * parameter => identifier ":" type
 * function_declaration> => "function" identifier "(" parameter_list ")" ":" type scope
 * statement => function_declaration ";"
 * call_parameter_list> => expression "," (inline)call_parameter_list
 * call_parameter_list> => expression
 * expression => identifier "(" call_parameter_list ")"
 * 
 * expression => (inline)expression "+" (inline)expression
 * expression => (inline)expression "-" (inline)expression
 * expression => (inline)expression "*" (inline)expression
 * expression => (inline)expression "/" (inline)expression
 * 
 * identifier => regex("[a-zA-Z_]\w*")
 * expression => identifier
 * 
 * number => integer
 * number => float
 * integer => regex("\d+")
 * float => regex("\d*\.\d*")
 * expression => number
 * 
 * string => regex("\"\.*?\"")
 * expression => string
 * 
 * boolean => "true"
 * boolean => "false"
 * expression => boolean
 * 
 * undefined => "undefined"
 * expression => undefined
 * 
 * type => "number"
 * type => "string"
 * type => "boolean"
 * type => "undefined"
 * type => type_identifier
 * type_identifier => regex("[a-zA-Z_]\w*")
 * 
 * comment => regex("\/\/.*") ;
 * statement => comment
 * 
 * multiline_comment => regex("\/\*.*?\*\/") ;
 * statement => multiline_comment
*/

const lex = new Lexer()

const
	program_token_kind = Symbol("program"),
	scope_token_kind = Symbol("scope"),
	statement_token_kind = Symbol("statement"),
	statement_list_token_kind = Symbol("statement_list"),
	variable_assign_token_kind = Symbol("variable_assign"),
	variable_declaration_token_kind = Symbol("variable_declaration"),
	parameter_token_kind = Symbol("parameter"),
	parameter_list_token_kind = Symbol("parameter_list"),
	call_parameter_list_token_kind = Symbol("call_parameter_list"),
	function_declaration_token_kind = Symbol("function_declaration"),
	expression_token_kind = Symbol("expression"),
	operator_token_kind = Symbol("operator"),
	identifier_token_kind = Symbol("identifier"),
	string_token_kind = Symbol("string"),
	boolean_token_kind = Symbol("boolean"),
	undefined_token_kind = Symbol("undefined"),
	number_token_kind = Symbol("number"),
	integer_token_kind = Symbol("integer"),
	float_token_kind = Symbol("float"),
	type_token_kind = Symbol("type"),
	// type_identifier_token_kind = Symbol("type_identifier"),
	comment_token_kind = Symbol("comment"),
	multiline_comment_token_kind = Symbol("multiline_comment")

lex.addRule(program_token_kind, [statement_list_token_kind])
lex.addRule(scope_token_kind, ["{", statement_list_token_kind, "}"])
lex.addRule(statement_list_token_kind, [statement_token_kind, inline_next_token, statement_list_token_kind])
lex.addRule(statement_list_token_kind, [statement_token_kind], 1)

lex.addRule(variable_assign_token_kind, [identifier_token_kind, "=", expression_token_kind])
lex.addRule(statement_token_kind, [variable_assign_token_kind, ";"])

lex.addRule(variable_declaration_token_kind, [new RegExp("^let\\s"), identifier_token_kind, ":", type_token_kind, "=", expression_token_kind])
lex.addRule(statement_token_kind, [variable_declaration_token_kind, ";"])

lex.addRule(parameter_list_token_kind, [parameter_token_kind, ",", inline_next_token, parameter_list_token_kind])
lex.addRule(parameter_list_token_kind, [parameter_token_kind], 1)
lex.addRule(parameter_token_kind, [identifier_token_kind, ":", type_token_kind])
lex.addRule(function_declaration_token_kind, [new RegExp("^function\\s"), identifier_token_kind, "(", parameter_list_token_kind, ")", ":", type_token_kind, scope_token_kind])
lex.addRule(statement_token_kind, [function_declaration_token_kind, ";"])

lex.addRule(call_parameter_list_token_kind, [expression_token_kind, ",", inline_next_token, call_parameter_list_token_kind])
lex.addRule(call_parameter_list_token_kind, [expression_token_kind], 1)
lex.addRule(expression_token_kind, [identifier_token_kind, "(", call_parameter_list_token_kind, ")"])

lex.addRule(operator_token_kind, "+")
lex.addRule(operator_token_kind, "-")
lex.addRule(operator_token_kind, "*")
lex.addRule(operator_token_kind, "/")

lex.addRule(expression_token_kind, [
	"(",
	inline_next_token, expression_token_kind,
	operator_token_kind,
	inline_next_token, expression_token_kind,
	")"
])

lex.addRule(type_token_kind, new RegExp("^[a-zA-Z_]\\w*"))
lex.addRule(identifier_token_kind, new RegExp("^[a-zA-Z_]\\w*"))
lex.addRule(expression_token_kind, [identifier_token_kind], 1)

lex.addRule(number_token_kind, [integer_token_kind])
lex.addRule(number_token_kind, [float_token_kind])
lex.addRule(integer_token_kind, new RegExp("^\\d+"))
lex.addRule(float_token_kind, new RegExp("^\\d*\\.\\d*"))
lex.addRule(expression_token_kind, [inline_next_token, number_token_kind], 1)

lex.addRule(string_token_kind, new RegExp("^\"\.*?\""))
lex.addRule(expression_token_kind, [string_token_kind], 1)

lex.addRule(boolean_token_kind, "true")
lex.addRule(boolean_token_kind, "false")
lex.addRule(expression_token_kind, [boolean_token_kind], 1)

lex.addRule(undefined_token_kind, "undefined")
lex.addRule(expression_token_kind, [undefined_token_kind], 1)

lex.addRule(comment_token_kind, new RegExp("^\\/\\/.*"))
lex.addRule(statement_token_kind, [comment_token_kind], 1)

lex.addRule(multiline_comment_token_kind, new RegExp("^\\/\\*[\\s\\S]*?\\*\\/"))
lex.addRule(statement_token_kind, [multiline_comment_token_kind], 1)





const token_tree1 = lex.matchRule(program_token_kind, 0, "let abc: number = 5;")
console.assert(Lexer.tokenTreeToString(token_tree1) === `program=>[ statement_list=>[ statement=>[ variable_declaration=>[ (identifier="abc"), (type="number"), expression=>[ (integer="5") ] ] ] ] ]`)
const token_tree2 = lex.matchRule(program_token_kind, 0, `
function fib(num: number, xyz: string): void {
	num = fib((num - 1), (num - 2));
	let str: string = "kill ya selfu";
};
`)
console.assert(Lexer.tokenTreeToString(token_tree2) === `
program=>[ statement_list=>[
	statement=>[ function_declaration=>[
		(identifier="fib"),
		parameter_list=>[
			parameter=>[ (identifier="num"), (type="number") ],
			parameter=>[ (identifier="xyz"), (type="string") ]
		],
		(type="void"),
		scope=>[ statement_list=>[
			statement=>[ variable_assign=>[
				(identifier="num"),
				expression=>[ (identifier="fib"), call_parameter_list=>[
					expression=>[ (identifier="num"), (operator="-"), (integer="1") ],
					expression=>[ (identifier="num"), (operator="-"), (integer="2") ]
				] ]
			] ],
			statement=>[ variable_declaration=>[
				(identifier="str"),
				(type="string"),
				expression=>[ (string="\"kill ya selfu\"") ]
			] ]
		] ]
	] ]
] ]
`.replaceAll(/[\r\n\f\v]\t*/gm, " ").replaceAll("\\n", "\n").replaceAll("\\t", "\t").trim())

Lexer.tokenTreeToString(token_tree2)
