export type { StaticImplements } from "https://deno.land/x/kitchensink_ts@v0.7.3/typedefs.ts"

export const
	number_MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER,
	symbol_iterator = Symbol.iterator

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
	array_deleteItem = <T>(arr: Array<T>, item: T): boolean => {
		const index = arr.indexOf(item)
		if (index >= 0) {
			arr.splice(index, 1)
			return true
		}
		return false
	},
	array_insertItem = <T>(arr: Array<T>, index: "start" | "end" | number, item: T): void => {
		index = index === "start" ? 0 : index === "end" ? arr.length : index
		arr.splice(index, 0, item)
	},
	array_isEmpty = (arr: Array<any>) => (arr.length === 0),
	array_isArray = Array.isArray,
	object_isIterable = <T = any>(obj: any): obj is Iterable<T> => {
		return typeof obj === "object" && obj != null && symbol_iterator in obj
	}

/** represents a sorted array of items `T`, that is sorted in accordance to each item's associated order key `K`.
 * items with the same order are kept together, and sorted in their insertion order.
 * 
 * @typeParam T the type of items stored in the sorted array.
 * @typeParam K the type of the order key associated with each item.
*/
export class SortedArray<T, K extends any = number> {
	private sort_fn: ((a: [K, Set<T>], b: [K, Set<T>]) => number)
	private map: Map<K, Set<T>>
	private dirty = false
	private items: Array<T> = []

	/**
	 * @param initial_items an array of 2-tuple,  where each tuple contains items and their associated order key.
	 * @param sort_fn a function used for sorting the array based on order keys `K`. see {@link Array.sort | builtin Array sort method}
	*/
	constructor(
		initial_items: Array<[items: T | Iterable<T>, order: K]> = [],
		sort_fn: ((a: [K, Set<T>], b: [K, Set<T>]) => number) = ((a, b) => ((a[0] as number) - (b[0] as number)))
	) {
		this.map = new Map<K, Set<T>>(initial_items.map(
			([items, order]) => [order, new Set(object_isIterable(items) ? items : [items])]
		))
		this.sort_fn = sort_fn
	}

	/** inserts an item with the specified order key into the sorted array.
	 *
	 * @param item the item to insert into the sorted array.
	 * @param order the order key associated with the item.
	 * @returns returns `true` if the added item is new, else a `false` is returned if the exact `item` existed at the exact `oreder`
	*/
	insert(item: T, order: K): boolean {
		if (!this.map.has(order)) {
			this.map.set(order, new Set())
		}
		const
			items_in_the_order = this.map.get(order)!,
			item_didnot_exist = !items_in_the_order.has(item)
		if (item_didnot_exist) {
			items_in_the_order.add(item)
			this.dirty = true
		}
		return item_didnot_exist
	}

	/** deletes an item with the specified order key from the sorted array.
	 *
	 * @param item the item to delete from the sorted array.
	 * @param order the order key associated with the item.
	 * @returns returns `true` if the deleted item had existed prior, else a `false` is returned
	*/
	delete(item: T, order: K): boolean {
		const items_in_the_order = this.map.get(order)
		if (items_in_the_order) {
			const item_deleted = items_in_the_order.delete(item)
			this.dirty ||= item_deleted
			if (items_in_the_order.size === 0) {
				this.map.delete(order)
			}
			return item_deleted
		}
		return false
	}

	/** updates the internal array by sorting it based on order keys. */
	update(): void {
		this.items = [...this.map]
			.sort(this.sort_fn)
			.flatMap((entry) => [...entry[1]])
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

export type TypeofValueExtended<T> =
	T extends string ? "string" :
	T extends number ? "number" :
	T extends bigint ? "bigint" :
	T extends boolean ? "boolean" :
	T extends symbol ? "symbol" :
	T extends Function ? "function" :
	T extends undefined ? "undefined" :
	T extends RegExp ? "regex" :
	T extends Array<any> ? "array" :
	T extends Set<any> ? "set" :
	T extends Map<any, any> ? "map" :
	T extends WeakSet<any> ? "weakset" :
	T extends WeakMap<any, any> ? "weakmap" :
	T extends WeakRef<any> ? "weakref" :
	T extends Promise<any> ? "promise" :
	T extends null ? "null" :
	T extends object ? "object" : "unknown"

export const typeofExtended = <T>(param: T): TypeofValueExtended<T> => {
	let typeof_param: string = typeof param
	if (typeof_param === "object") {
		typeof_param =
			param instanceof RegExp ? "regex" :
				param instanceof Array ? "array" :
					param instanceof Set ? "set" :
						param instanceof Map ? "map" :
							param instanceof WeakSet ? "weakset" :
								param instanceof WeakMap ? "weakmap" :
									param instanceof WeakRef ? "weakref" :
										param instanceof Promise ? "promise" :
											param === null ? "null" : typeof_param
	}
	return typeof_param as TypeofValueExtended<T>
}
