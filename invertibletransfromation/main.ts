import type { NumericArrayType, NumericType, Optional } from "./deps.ts"
import { concatBytes, decode_cstr, decode_number, decode_number_array, decode_str, encode_cstr, encode_number, encode_number_array, encode_str } from "./deps.ts"

const enum COMPILATION_MODE {
	DEBUG,
	PRODUCTION,
	MINIFY,
}
const compilation_mode: COMPILATION_MODE = COMPILATION_MODE.DEBUG as const


/** a single step consists a froward transformation {@link FROM | from a type} to a {@link TO | different type},
 * and a backward transfromation that does the reverse.
*/
abstract class Step<FROM, TO, LOST = any> {
	/** information lost in the forward transformation should be stored here.
	 * the lost information may be needed for the backward transformation.
	*/
	protected abstract lost: LOST

	/** the forward transformation function */
	abstract forward(input: FROM): TO

	/** the reverse transformation function */
	abstract backward(input: TO): FROM
}

/** a pure step never loses any data. this formally provides us with two great benefits:
 * - we may utilize the {@link backward | `backward`} method before ever using the {@link forward | `forward`} method prior.
 * - we may reuse the same instance of a pure step for many forward and backward transformations, however many times we want, in any order we want.
*/
abstract class PureStep<FROM, TO> extends Step<FROM, TO, never> {
	protected abstract lost: never
}


interface BinaryInput<ARGS = any> {
	/** input binary data */
	bin: Uint8Array
	/** byte offet */
	pos: number
	/** args */
	args: ARGS
}
interface BinaryOutput<T> {
	/** decoded output value */
	val: T
	/** bytelength occupied by the value when it was decoded */
	len: number
}
abstract class BinaryStep<
	OUT,
	ARGS = any,
	LOST = any
> extends Step<BinaryInput<ARGS>, BinaryOutput<OUT>, LOST> {
	abstract backward(input: Omit<BinaryOutput<OUT>, "len">): BinaryInput<ARGS>
}
abstract class BinaryPureStep<OUT, ARGS = any> extends PureStep<BinaryInput<ARGS>, BinaryOutput<OUT>> implements BinaryStep<OUT, ARGS, never>{
	protected abstract lost: never
	abstract backward(input: Omit<BinaryOutput<OUT>, "len">): BinaryInput<ARGS>
}
type LengthedArgs = { length: number }
abstract class BinaryLengthedDataStep<OUT, LOST = any> extends BinaryStep<OUT, LengthedArgs, LOST> { }
abstract class BinaryLengthedDataPureStep<OUT> extends BinaryPureStep<OUT, LengthedArgs> implements BinaryLengthedDataStep<OUT, never> { }



// TODO: cleanup the following type sanity check:
// type A<T, V> = BinaryPureStep<T, V> extends PureStep<BinaryInput<V>, BinaryOutput<T>> ? true : false
// type B<T, V> = BinaryPureStep<T, V> extends BinaryStep<T, V, never> ? true : false
// type C<T, V> = BinaryLengthedDataPureStep<T> extends BinaryStep<T, LengthedArgs, never> ? true : false
// type D<T, V> = BinaryLengthedDataPureStep<T> extends BinaryLengthedDataStep<T, never> ? true : false
// Both `A` and `B` are ALWAYS true, otherwise, we must've messed up in our implementation


class BinaryStringStep extends BinaryLengthedDataPureStep<string> {
	protected lost!: never
	forward(input: BinaryInput<LengthedArgs>): BinaryOutput<string> {
		const
			{ bin, pos, args: { length: str_lenth } } = input,
			[str, bytelength] = decode_str(bin, pos, str_lenth)
		return { val: str, len: bytelength }
	}
	backward(input: Omit<BinaryOutput<string>, "len">): BinaryInput<LengthedArgs> {
		const
			bin = encode_str(input.val),
			str_lenth = bin.length
		return { bin, pos: 0, args: { length: str_lenth } }
	}
}

class BinaryCStringStep extends BinaryPureStep<string, never> {
	protected lost!: never
	forward(input: BinaryInput<never>): BinaryOutput<string> {
		const
			{ bin, pos } = input,
			[str, bytelength] = decode_cstr(bin, pos)
		return { val: str, len: bytelength }
	}
	backward(input: Omit<BinaryOutput<string>, "len">): BinaryInput<never> {
		const bin = encode_cstr(input.val)
		return { bin, pos: 0 } as any
	}
}

class BinaryNumberStep<ENCODING extends NumericType> extends BinaryPureStep<number, never> {
	// TODO: later on, add support for the variable sized numeric types `"iv"` and `"uv"`
	protected readonly kind: ENCODING
	protected lost!: never
	constructor(kind: ENCODING) {
		super()
		this.kind = kind
	}
	forward(input: BinaryInput<never>): BinaryOutput<number> {
		const
			{ bin, pos } = input,
			[num, bytelength] = decode_number(bin, pos, this.kind)
		return { val: num, len: bytelength }
	}
	backward(input: Omit<BinaryOutput<number>, "len">): BinaryInput<never> {
		const bin = encode_number(input.val, this.kind)
		return { bin, pos: 0 } as any
	}
}

class BinaryNumberArrayStep<ENCODING extends NumericType> extends BinaryLengthedDataPureStep<number[]> {
	// TODO: later on, add support for the variable sized numeric types `"iv"` and `"uv"`
	protected readonly kind: ENCODING
	protected lost!: never
	constructor(kind: ENCODING) {
		super()
		this.kind = kind
	}
	forward(input: BinaryInput<LengthedArgs>): BinaryOutput<number[]> {
		const
			{ bin, pos, args: { length } } = input,
			[arr, bytelength] = decode_number_array(bin, pos, this.kind + "[]" as NumericArrayType, length)
		return { val: arr, len: bytelength }
	}
	backward(input: Omit<BinaryOutput<number[]>, "len">): BinaryInput<LengthedArgs> {
		const
			val = input.val,
			arr_len = val.length,
			bin = encode_number_array(val, this.kind + "[]" as NumericArrayType)
		return { bin, pos: 0, args: { length: arr_len } }
	}
}

interface ArrayArgs<ITEM_ARGS> extends LengthedArgs {
	item_args: ITEM_ARGS
}
class BinaryArrayStep<
	ITEM_STEP extends BinaryPureStep<any, any>,
	OUT_ITEM = (ITEM_STEP extends BinaryPureStep<infer T, unknown> ? T : never),
	ITEM_ARGS extends Record<string, any> = (ITEM_STEP extends BinaryPureStep<OUT_ITEM, infer T> ? T : never)
> extends BinaryPureStep<OUT_ITEM[], ArrayArgs<ITEM_ARGS>> {
	protected readonly item_step: ITEM_STEP
	protected lost!: never
	constructor(item_step: ITEM_STEP) {
		super()
		this.item_step = item_step
	}
	forward(input: BinaryInput<ArrayArgs<ITEM_ARGS>>): BinaryOutput<OUT_ITEM[]> {
		const
			{ bin, pos, args: { length, item_args } } = input,
			item_step = this.item_step,
			out_arr: OUT_ITEM[] = []
		let bytelength = 0
		for (let i = 0; i < length; i++) {
			const { val, len } = item_step.forward({
				bin,
				pos: pos + bytelength,
				args: item_args
			})
			bytelength += len
			out_arr.push(val)
		}
		return { val: out_arr, len: bytelength }
	}
	backward(input: Omit<BinaryOutput<OUT_ITEM[]>, "len">): BinaryInput<ArrayArgs<ITEM_ARGS>> {
		const
			item_step = this.item_step,
			out_bins: Uint8Array[] = [],
			val = input.val
		let item_args: ITEM_ARGS
		for (const item of val) {
			const { bin, args } = item_step.backward({ val: item })
			out_bins.push(bin)
			item_args ??= args
			if (compilation_mode === COMPILATION_MODE.DEBUG) {
				for (const key in args) {
					console.assert(
						item_args[key] === args[key],
						"`item_args` key's value mismatches with the current encoded item's `args`.",
						"\n\t a key-value pair mismatch should not occur between each element of the array, otherwise it is not invertible in theory.",
						"\n\t`key`:", key,
						"\n\t`item_args[key]`:", item_args[key],
						"\n\t`args[key]`:", args[key],
					)
				}
			}
		}
		return {
			bin: concatBytes(...out_bins),
			pos: 0,
			args: {
				length: out_bins.length,
				item_args: item_args!
			}
		}
	}
}

type NeverKeys<T> = { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
type RemoveNeverKeys<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] }
type OptionalNeverKeys<T> = RemoveNeverKeys<T> & Partial<T>


interface HeaderLengthedArgs<HEAD_ARGS, BODY_ARGS extends LengthedArgs> {
	head: HEAD_ARGS
	// do not include the `length` key in your body, for it will be inserted by forward step automatically
	body: Exclude<BODY_ARGS, LengthedArgs>
}
class BinaryHeaderLengthedStep<
	HEAD_STEP extends BinaryPureStep<number>,
	BODY_STEP extends BinaryPureStep<any, LengthedArgs>,
	HEAD_ARGS extends Record<string, any> = (HEAD_STEP extends BinaryPureStep<number, infer T> ? T : never),
	BODY_ARGS extends LengthedArgs = (BODY_STEP extends BinaryPureStep<any, infer T> ? T : never),
> extends BinaryPureStep<
	BODY_STEP extends BinaryPureStep<infer T, BODY_ARGS> ? T : never,
	OptionalNeverKeys<HeaderLengthedArgs<HEAD_ARGS, BODY_ARGS>>
> {
	protected readonly head_step: HEAD_STEP
	protected readonly body_step: BODY_STEP
	protected lost!: never
	constructor(head_step: HEAD_STEP, body_step: BODY_STEP) {
		super()
		this.head_step = head_step
		this.body_step = body_step
	}
	forward(input: BinaryInput<OptionalNeverKeys<HeaderLengthedArgs<HEAD_ARGS, BODY_ARGS>>>): BinaryOutput<BODY_STEP extends BinaryPureStep<infer T, BODY_ARGS> ? T : never> {
		const
			{ bin, pos, args: { head: head_args, body: body_args } = {} } = input,
			head_step = this.head_step,
			body_step = this.body_step,
			{ val: length, len: head_bytelength } = head_step.forward({ bin, pos, args: head_args })
		return body_step.forward({ bin, pos: pos + head_bytelength, args: { length, ...body_args } })
	}
	backward(input: Omit<BinaryOutput<BODY_STEP extends BinaryPureStep<infer T, BODY_ARGS> ? T : never>, "len">): BinaryInput<OptionalNeverKeys<HeaderLengthedArgs<HEAD_ARGS, BODY_ARGS>>> {
		const
			{ bin: body_bin, args: all_body_args } = this.body_step.backward(input),
			{ length, ...body_args } = all_body_args,
			{ bin: head_bin, args: head_args } = this.head_step.backward({ val: length })
		return {
			bin: concatBytes(head_bin, body_bin),
			pos: 0,
			args: {
				head: head_args,
				body: body_args,
			} as any
		}
	}
}


// const b = new BinaryStringStep()
// b.forward(b.backward({ val: "aaaa" }))
// b.backward(b.forward({ bin: Uint8Array.of(), pos: 0, args: { length: 5 } }))

const c = new BinaryArrayStep(new BinaryNumberArrayStep("u1"))
const c_out = c.forward({ bin: Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), pos: 0, args: { length: 5, item_args: { length: 2 } } })
const c_in = c.backward(c_out)
console.log(c_out)
console.log(c_in)

const d = new BinaryHeaderLengthedStep(new BinaryNumberStep("u1"), new BinaryNumberArrayStep("u4b"))
const d_out = d.forward({ bin: Uint8Array.of(3, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3), pos: 0, args: {} })
const d_in = d.backward(d_out)
console.log(d_out)
console.log(d_in)
