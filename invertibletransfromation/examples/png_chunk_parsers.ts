import { BinaryArrayStep, BinaryRecordStep } from "../binary_composition_steps.ts"
import { BinaryBytesStep, BinaryCStringStep, BinaryDefaultArgs, BinaryNumberArrayStep, BinaryNumberStep, BinaryStringStep } from "../binary_primitive_steps.ts"
import { BinaryInput, BinaryOutput } from "../typedefs.ts"

export type ChunkData_schema =
	| IDAT_schema | IHDR_schema | PLTE_schema | cHRM_schema | gAMA_schema
	| hIST_schema | pHYs_schema | tEXt_schema | tIME_schema | zTXt_schema

export type IDAT_schema = Uint8Array

export type IHDR_schema = {
	width: number
	height: number
	bitdepth: number
	colortype: number
	compression: number
	filter: number
	interlace: number
}
export const IHDR_step = new BinaryRecordStep<IHDR_schema>([
	["width", new BinaryNumberStep("i4b")],
	["height", new BinaryNumberStep("i4b")],
	["bitdepth", new BinaryNumberStep("u1")],
	["colortype", new BinaryNumberStep("u1")],
	["compression", new BinaryNumberStep("u1")],
	["filter", new BinaryNumberStep("u1")],
	["interlace", new BinaryNumberStep("u1")],
])

export type PLTE_schema = Array<[red: number, green: number, blue: number]>
export const PLTE_step = new BinaryArrayStep(new BinaryDefaultArgs(
	new BinaryNumberArrayStep("u1"), { length: 3 }
))

class PNGFloat_NumberStep extends BinaryNumberStep<"i4b"> {
	constructor() { super("i4b") }
	forward(input: BinaryInput<never>): BinaryOutput<number> {
		const { val, len } = super.forward(input)
		return {
			val: (val / 100000),
			len
		}
	}
	backward(input: Omit<BinaryOutput<number>, "len">): BinaryInput<never> {
		input.val = (input.val * 100000) | 0
		return super.backward(input)
	}
}

export type cHRM_schema = {
	whiteX: number
	whiteY: number
	redX: number
	redY: number
	greenX: number
	greenY: number
	blueX: number
	blueY: number
}
export const cHRM_step = new BinaryRecordStep<cHRM_schema>([
	["whiteX", new PNGFloat_NumberStep()],
	["whiteY", new PNGFloat_NumberStep()],
	["redX", new PNGFloat_NumberStep()],
	["redY", new PNGFloat_NumberStep()],
	["greenX", new PNGFloat_NumberStep()],
	["greenY", new PNGFloat_NumberStep()],
	["blueX", new PNGFloat_NumberStep()],
	["blueY", new PNGFloat_NumberStep()],
])

export type gAMA_schema = number
export const gAMA_step = new PNGFloat_NumberStep()

export type hIST_schema = Array<[color_index: number, count_fraction: number]>
export const hIST_step = new BinaryArrayStep(new BinaryDefaultArgs(
	new BinaryNumberArrayStep("u2b"), { length: 2 }
))

export type pHYs_schema = {
	x: number
	y: number
	unit: 0 | 1
}
export const pHYs_step = new BinaryRecordStep<pHYs_schema>([
	["x", new BinaryNumberStep("u4b")],
	["y", new BinaryNumberStep("u4b")],
	["unit", new BinaryNumberStep("u1") as any],
])

export type tEXt_schema = {
	field: string
	text: string
}
export const tEXt_step = new BinaryRecordStep<tEXt_schema>([
	["field", new BinaryCStringStep()],
	["text", new BinaryStringStep()],
])

export type tIME_schema = {
	year: number
	month: number
	day: number
	hour: number
	minute: number
	second: number
}
export const tIME_step = new BinaryRecordStep<tIME_schema>([
	["year", new BinaryNumberStep("u2b")],
	["month", new BinaryNumberStep("u1")],
	["day", new BinaryNumberStep("u1")],
	["hour", new BinaryNumberStep("u1")],
	["minute", new BinaryNumberStep("u1")],
	["second", new BinaryNumberStep("u1")],
])

export type zTXt_schema = {
	field: string
	method: 0
	data: Uint8Array
}
export const zTXt_step = new BinaryRecordStep<zTXt_schema>([
	["field", new BinaryCStringStep()],
	["method", new BinaryNumberStep("u1") as any],
	["data", new BinaryBytesStep()],
])
