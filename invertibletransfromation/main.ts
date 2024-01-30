import { decode_str, encode_str, pack, unpack, EmptyObj, decode_cstr, encode_cstr, NumericType, decode_number, encode_number, decode_number_array, NumericArrayType, encode_number_array } from "./deps.ts"

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
type LengthedArgs = { length: number }
abstract class BinaryLengthedDataStep<OUT, LOST = any> extends BinaryStep<OUT, LengthedArgs, LOST> { }


class BinaryStringStep extends BinaryLengthedDataStep<string> {
	protected lost: undefined
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

class BinaryCStringStep extends BinaryStep<string, never> {
	protected lost: undefined
	forward(input: BinaryInput): BinaryOutput<string> {
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

class BinaryNumberStep<ENCODING extends NumericType> extends BinaryStep<number, never> {
	// TODO: later on, add support for the variable sized numeric types `"iv"` and `"uv"`
	protected readonly kind: ENCODING
	protected lost!: undefined
	constructor(kind: ENCODING) {
		super()
		this.kind = kind
	}
	forward(input: BinaryInput<{ kind: NumericType }>): BinaryOutput<number> {
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

class BinaryNumberArrayStep<ENCODING extends NumericType> extends BinaryLengthedDataStep<number[]> {
	// TODO: later on, add support for the variable sized numeric types `"iv"` and `"uv"`
	protected readonly kind: ENCODING
	protected lost: undefined
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

class BinaryArrayStep<OUT_ITEM, ITEM_STEP extends typeof BinaryStep<OUT_ITEM, never>> extends BinaryLengthedDataStep<OUT_ITEM[]> {
	protected readonly base_class: ITEM_STEP
	protected lost: any
	constructor(base_class: ITEM_STEP) {
		super()
		this.base_class = base_class
	}
	forward(input: BinaryInput<LengthedArgs>): BinaryOutput<OUT_ITEM[]> {
		const
			{ bin, pos, args: { length } } = input,
			base_class = this.base_class,
			out_arr: OUT_ITEM[] = []
		for (const iterator of object) {
			base_class.forward({ bin, pos } as any)
		}
		[arr, bytelength] = decode_number_array(bin, pos, this.kind + "[]" as NumericArrayType, length)
		return { val: arr, len: bytelength }

		throw new Error("Method not implemented.")
	}
	backward(input: Omit<BinaryOutput<OUT_ITEM[]>, "len">): BinaryInput<LengthedArgs> {


		throw new Error("Method not implemented.")
	}
}


const b = new BinaryStringStep()
b.backward({ val: "aaaa" })

