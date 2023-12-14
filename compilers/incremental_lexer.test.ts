import { Lexer, inline_next_token } from "./incremental_lexer.ts"

/* TASK:
 * parse the following BNF grammar in a modular incremental manner:
 * 
 * breakfast => protein "with" (inline)breakfast "on the side" ;
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
 * statements => statement (inline)statements ;
 * statements => statement ;
 * 
 * statement => menu;
*/

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

lex.addRule(breakfast_token_kind, [protein_token_kind, "with", inline_next_token, breakfast_token_kind, "on-the-side"], -1)

lex.addRule(protein_token_kind, [crispiness_token_kind, "crispy", "bacon"])
lex.addRule(protein_token_kind, [cooked_token_kind, "eggs"])
lex.addRule(protein_token_kind, "sausage")
lex.addRule(breakfast_token_kind, [protein_token_kind], 1)

lex.addRule(bread_token_kind, "toast")
lex.addRule(bread_token_kind, "biscuits")
lex.addRule(bread_token_kind, "english-muffin")
lex.addRule(breakfast_token_kind, [bread_token_kind], 1)

lex.addRule(menu_token_kind, ["{", statements_token_kind, "}"])
lex.addRule(statements_token_kind, [statement_token_kind, inline_next_token, statements_token_kind])
lex.addRule(statements_token_kind, [statement_token_kind], 1)

lex.addRule(statement_token_kind, [breakfast_token_kind, ";"])


const token_tree1 = lex.matchRule(breakfast_token_kind, 0, "sausage with sausage on-the-side") // breakfast=>[ (protein="sausage"), (protein="sausage") ]
const token_tree2 = lex.matchRule(breakfast_token_kind, 0, "sausage with toast on-the-side") // breakfast=>[ (protein="sausage"), (bread="toast") ]
const token_tree3 = lex.matchRule(breakfast_token_kind, 0, "sausage with really really really crispy bacon with toast on-the-side on-the-side") // breakfast=>[ (protein="sausage"), protein=>[ crispiness=>[ crispiness=>[ (crispiness="really") ] ] ], (bread="toast") ]
const token_tree4 = lex.matchRule(menu_token_kind, 0, "{sausage with really really really crispy bacon with toast on-the-side on-the-side;}") // menu=>[ statements=>[ statement=>[ breakfast=>[ (protein="sausage"), protein=>[ crispiness=>[ crispiness=>[ (crispiness="really") ] ] ], (bread="toast") ] ] ] ]
const token_tree5 = lex.matchRule(
	menu_token_kind, 0,
	`{
		sausage with toast on-the-side;
		really really crispy bacon with poached eggs with biscuits on-the-side on-the-side;
		english-muffin;
	}`
)
/*
menu=>[ statements=>[
	statement=>[breakfast=>[ (protein="sausage"), (bread="toast") ] ],
	statement=>[ breakfast=>[ protein=>[ crispiness=>[ (crispiness="really") ] ], protein=>[ (cooked="poached") ], (bread="biscuits") ] ],
	statement=>[ breakfast=>[ (bread="english-muffin") ] ]
] ]
*/

// declare that every menu is also a statement. this will allow nested menu
lex.addRule(statement_token_kind, [menu_token_kind], -1)

const token_tree6 = lex.matchRule(
	menu_token_kind, 0,
	`{{
		sausage;
		really crispy bacon with poached eggs with biscuits on-the-side on-the-side;
		{english-muffin;}
		{
			really crispy bacon;
			toast;
		}
	}}`
)
/*
menu=>[ statements=>[ statement=>[ menu=>[ statements=>[
	statement=>[ breakfast=>[ (protein="sausage") ] ],
	statement=>[ breakfast=>[ protein=>[ (crispiness="really") ], protein=>[ (cooked="poached") ], (bread="biscuits") ] ],
	statement=>[ menu=>[ statements=>[
		statement=>[ breakfast=>[ (bread="english-muffin") ] ]
	] ] ],
	statement=>[ menu=>[ statements=>[
		statement=>[ breakfast=>[ protein=>[ (crispiness="really") ] ] ],
		statement=>[ breakfast=>[ (bread="toast") ] ]
	] ] ]
] ] ] ] ]
*/
Lexer.tokenTreeToString(token_tree6)
