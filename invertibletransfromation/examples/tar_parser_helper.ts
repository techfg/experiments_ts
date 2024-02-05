import { SequentialSteps } from "../binary_composition_steps.ts"
import { BinaryOutputUnwrapStep, BinaryOutputWrapStep } from "../binary_primitive_steps.ts"
import { concatBytes, decode_str, encode_str, number_isFinite, number_parseInt } from "../deps.ts"
import { BinaryInput, BinaryOutput, BinaryPureStep, PureStep } from "../typedefs.ts"

const trimStart = (txt: string, padding_char: string = "\x00"): string => {
	let start = 0
	while (txt[start] === padding_char) { start++ }
	return txt.slice(start)
}

const trimEnd = (txt: string, padding_char: string = "\x00"): string => {
	let end = txt.length - 1
	while (txt[end] === padding_char) { end-- }
	return txt.slice(0, end + 1)
}

export class FixedLengthString_Step extends BinaryPureStep<string> {
	protected lost!: never

	constructor(
		protected readonly length: number,
		protected readonly padding_char: string = "\x00",
		protected readonly padding_pos: "start" | "end" = "end",
	) { super() }
	private trim(txt: string): string {
		return this.padding_pos === "start" ? trimStart(txt, this.padding_char) : trimEnd(txt, this.padding_char)
	}
	private pad_and_encode(txt: string): Uint8Array {
		const
			padding_byte = this.padding_char.charCodeAt(0),
			padding_pos = this.padding_pos,
			len = this.length,
			bin = encode_str(txt.substring(0, len)).subarray(0, len),
			padding_bytes = new Uint8Array(len - bin.byteLength).fill(padding_byte)
		return padding_pos === "start" ? concatBytes(padding_bytes, bin) : concatBytes(bin, padding_bytes)
	}
	forward(input: BinaryInput): BinaryOutput<string> {
		const
			{ bin, pos } = input,
			[str, bytelength] = decode_str(bin, pos, this.length)
		return { val: this.trim(str), len: bytelength }
	}
	backward(input: Omit<BinaryOutput<string>, "len">): BinaryInput {
		return { bin: this.pad_and_encode(input.val), pos: 0 } as any
	}
}

export class IntegerString_Step extends PureStep<string, number> {
	protected lost!: never

	constructor(protected readonly radix: number = 10) { super() }
	forward(input: string): number {
		const value = number_parseInt(trimEnd(input, "\x00"), this.radix)
		return number_isFinite(value) ? value : 0
	}
	backward(input: number): string {
		return (input | 0).toString(this.radix) + "\x00"
	}
}

export class IntegerFixedLengthString_Step extends SequentialSteps<BinaryInput, BinaryOutput<number>> {
	constructor(string_length: number, radix?: number) {
		super(
			new FixedLengthString_Step(string_length, "0", "start"),
			new BinaryOutputUnwrapStep(),
			new IntegerString_Step(radix),
			new BinaryOutputWrapStep(),
		)
	}
	forward(input: BinaryInput<any>): BinaryOutput<number> {
		input = this.next_forward(input, 0)
		const bytelength = (input as unknown as BinaryOutput<string>).len
		input = this.next_forward(input, 1)
		input = this.next_forward(input, 2)
		const output = this.next_forward(input, 3) as BinaryOutput<number>
		output.len = bytelength
		return output
	}
}
