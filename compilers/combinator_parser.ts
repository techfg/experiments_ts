const
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


class BST<T> {
	private map = new Map<number, T[]>()
	private dirty = false
	private items: Array<T> = []

	constructor(bst_items?: Array<[items: T | T[], precedence: number]>) {
		this.map = new Map<number, T[]>(bst_items?.map(
			([items, precedence]) => [precedence, isArray(items) ? items : [items]]
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
			this.dirty ||= array_delete_item(items_in_presedence, item)
			if (isEmpty(items_in_presedence)) {
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

type ParserReturn<T> = undefined | Array<[unconsumed_input: string, output: T]>
type Parser<T> = (input: string) => ParserReturn<T>
type UnfailingParser<T> = (input: string) => NonNullable<ParserReturn<T>>

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

		} while (!isEmpty(result))


		while (true) {
			const result = base_parser(input)

		}
	}
}


abstract class Feature {
	// static rules: BST<Feature>
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


