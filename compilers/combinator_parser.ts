import { array_deleteItem, array_isArray, array_isEmpty } from "./utilities.ts"

type ParserReturn<T> = undefined | Array<[unconsumed_input: string, output: T]>
type Parser<T> = (input: string) => ParserReturn<T>
type UnfailingParser<T> = (input: string) => NonNullable<ParserReturn<T>>

class BST<T> {
	private map = new Map<number, T[]>()
	private dirty = false
	private items: Array<T> = []

	constructor(bst_items?: Array<[items: T | T[], precedence: number]>) {
		this.map = new Map<number, T[]>(bst_items?.map(
			([items, precedence]) => [precedence, array_isArray(items) ? items : [items]]
		))
	}

	insert(item: T, precedence: number): void {
		if (!this.map.has(precedence)) {
			this.map.set(precedence, [])
		}
		this.map.get(precedence)!.push(item)
		this.dirty = true
	}

	delete(item: T, precedence: number): void {
		const items_in_presedence = this.map.get(precedence)
		if (items_in_presedence) {
			this.dirty ||= array_deleteItem(items_in_presedence, item)
			if (array_isEmpty(items_in_presedence)) {
				this.map.delete(precedence)
			}
		}
	}

	update(): void {
		this.items = [...this.map]
			.sort((a, b) => a[0] - b[0])
			.flatMap((entry) => entry[1])
		this.dirty = false
	}

	getItems(): Array<T> {
		if (this.dirty) { this.update() }
		return this.items
	}
}

/** the `optional` version of a `base_parser` never fails (never returns `undefined`).
 * its purpose is to match 0 or 1 occurrences of `base_parser`.
*/
const optional = <T>(base_parser: Parser<T>): UnfailingParser<T> => {
	return (input: string) => {
		return base_parser(input) ?? []
	}
}

/** the `some` version of a `base_parser` matches 1 or more sequential occurrences of a `base_parser` */
const some = <T>(base_parser: Parser<T>): Parser<T[]> => {
	return (input: string) => {



		const output: T[] = []
		let result: ParserReturn<T> = []
		do {
			result = base_parser(input)
			output.push()

		} while (!array_isEmpty(result))


		while (true) {
			const result = base_parser(input)

		}
	}
}


abstract class Feature {
	static rules: BST<Feature>
	static parsers: Parser<Feature>[]
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
