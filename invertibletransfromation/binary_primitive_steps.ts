import { NumericArrayType, NumericType, decode_bytes, decode_cstr, decode_number, decode_number_array, decode_str, encode_bytes, encode_cstr, encode_number, encode_number_array, encode_str } from "./deps.ts"
import { BinaryInput, BinaryLengthedDataPureStep, BinaryOutput, BinaryPureStep, LengthedArgs, PureStep, SubtractSubset } from "./typedefs.ts"


export class BinaryCStringStep extends BinaryPureStep<string, never> {
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


export class BinaryNumberStep<ENCODING extends NumericType> extends BinaryPureStep<number, never> {
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


export class BinaryStringStep extends BinaryLengthedDataPureStep<string> {
	protected lost!: never
	forward(input: BinaryInput<LengthedArgs>): BinaryOutput<string> {
		const
			{ bin, pos, args: { length: str_length } } = input,
			[str, bytelength] = decode_str(bin, pos, str_length)
		return { val: str, len: bytelength }
	}
	backward(input: Omit<BinaryOutput<string>, "len">): BinaryInput<LengthedArgs> {
		const
			bin = encode_str(input.val),
			str_length = bin.length
		return { bin, pos: 0, args: { length: str_length } }
	}
}


export class BinaryNumberArrayStep<ENCODING extends NumericType> extends BinaryLengthedDataPureStep<number[]> {
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


export class BinaryBytesStep extends BinaryLengthedDataPureStep<Uint8Array> {
	protected lost!: never
	forward(input: BinaryInput<LengthedArgs>): BinaryOutput<Uint8Array> {
		const
			{ bin, pos, args: { length: bytes_length } } = input,
			[bytes, bytelength] = decode_bytes(bin, pos, bytes_length)
		return { val: bytes, len: bytelength }
	}
	backward(input: Omit<BinaryOutput<Uint8Array>, "len">): BinaryInput<LengthedArgs> {
		const
			bin = encode_bytes(input.val),
			length = bin.length
		return { bin, pos: 0, args: { length } }
	}
}


export class BinaryDefaultArgs<
	STEP extends BinaryPureStep<any>,
	OUT extends (STEP extends BinaryPureStep<infer T> ? T : unknown) = (STEP extends BinaryPureStep<infer T> ? T : unknown),
	ARGS extends (STEP extends BinaryPureStep<OUT, infer T> ? T : unknown) = (STEP extends BinaryPureStep<OUT, infer T> ? T : unknown),
	DEFAULT_ARGS extends Partial<ARGS> = Partial<ARGS>,
	REQUIRED_ARGS extends SubtractSubset<DEFAULT_ARGS, ARGS> = SubtractSubset<DEFAULT_ARGS, ARGS>
> extends BinaryPureStep<OUT, ARGS> {
	protected readonly step: STEP
	protected readonly args: DEFAULT_ARGS
	protected readonly priority: -1 | 1
	protected lost!: never

	constructor(step: STEP, default_args: DEFAULT_ARGS, priority: -1 | 1 = 1) {
		super()
		this.step = step
		this.args = default_args
		this.priority = priority
	}
	forward(input: BinaryInput<REQUIRED_ARGS & Partial<DEFAULT_ARGS>>): BinaryOutput<OUT> {
		const
			{ bin, pos, args = {} as REQUIRED_ARGS } = input,
			step = this.step,
			default_args = this.args,
			priority = this.priority,
			overridden_args = priority > 0 ? { ...args, ...default_args } : { ...default_args, ...args }
		return step.forward({ bin, pos, args: overridden_args })
	}
	backward(input: Omit<BinaryOutput<OUT>, "len">): BinaryInput<ARGS> {
		return this.step.backward(input)
	}
}


export class BinaryOutputUnwrapStep<T> extends PureStep<Omit<BinaryOutput<T>, "len">, T> {
	protected lost!: never
	forward(input: BinaryOutput<T>): T { return input.val }
	backward(input: T): Omit<BinaryOutput<T>, "len"> { return { val: input } }
}


// TODO: add a warning about forward method's `output.len === undefined`, as it might ruin accumulated
// size computation, and will be hard to debug and come across this as being the culprit
export class BinaryOutputWrapStep<T> extends PureStep<T, BinaryOutput<T>> {
	protected lost!: never
	forward(input: T): BinaryOutput<T> { return { val: input, len: undefined as any } }
	backward(input: BinaryOutput<T>): T { return input.val }
}


export class BinaryInputUnwrapStep extends PureStep<BinaryInput, Uint8Array> {
	protected lost!: never
	forward(input: BinaryInput): Uint8Array { return input.bin }
	backward(input: Uint8Array): BinaryInput { return { bin: input, pos: 0, args: undefined } }
}


export class BinaryInputWrapStep extends PureStep<Uint8Array, BinaryInput> {
	protected lost!: never
	forward(input: Uint8Array): BinaryInput { return { bin: input, pos: 0, args: undefined } }
	backward(input: BinaryInput): Uint8Array { return input.bin }
}
