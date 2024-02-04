import { FileParser } from "https://deno.land/x/kitchensink_ts@v0.7.3/devdebug.ts"
import { ArrayArgs, BinaryArrayStep, BinaryRecordStep } from "../binary_composition_steps.ts"
import { BinaryBytesStep, BinaryDefaultArgs, BinaryNumberStep, BinaryStringStep } from "../binary_primitive_steps.ts"
import { Crc32, concatBytes } from "../deps.ts"
import { BinaryInput, BinaryOutput, PureStep } from "../typedefs.ts"
import { ChunkData_schema, IHDR_step, PLTE_schema, PLTE_step, cHRM_step, gAMA_step, hIST_schema, hIST_step, pHYs_step, tEXt_step, tIME_step, zTXt_step } from "./png_chunk_parsers.ts"


type Chunk_schema = {
	byteLength: number,
	kind:
	| string | "PLTE" | "IHDR" | "IEND" | "pHYs" | "bKGD" | "cHRM"
	| "gAMA" | "hIST" | "sBIT" | "tEXt" | "tIME" | "tRNS" | "zTXt",
	data: Uint8Array,
	crc: number,
}

class Chunk_Step extends BinaryRecordStep<Chunk_schema> {
	constructor() {
		super([
			["byteLength", new BinaryNumberStep("u4b")],
			["kind", new BinaryDefaultArgs(new BinaryStringStep(), { length: 4 }, 1)],
			["data", new BinaryBytesStep()],
			["crc", new BinaryNumberStep("u4b")],
		])
	}
	forward(input: BinaryInput<Record<any, never>>): BinaryOutput<Chunk_schema> {
		const { bin, pos } = input,
			{ val: val_a, len: len_a } = this.partial_forward(bin, pos, {}, 0, 2),
			args_b = { data: { length: val_a.byteLength } },
			{ val: val_b, len: len_b } = this.partial_forward(bin, pos + len_a, args_b, 2)
		return {
			val: { ...val_a, ...val_b } as any,
			len: len_a + len_b,
		}
	}
	backward(input: Omit<BinaryOutput<Chunk_schema>, "len">): BinaryInput<Record<any, never>> {
		const val = input.val
		val.byteLength = val.data.byteLength
		const
			bins_a = this.partial_backward(val, 0, 3).bins,
			crc = Crc32(bins_a[2], Crc32(bins_a[1])),
			bins_b = this.partial_backward({ crc }, 3).bins
		return {
			bin: concatBytes(...bins_a, ...bins_b),
			pos: 0,
			args: {}
		}
	}
}

class AllChunks_Step extends BinaryArrayStep<Chunk_Step> {
	constructor() {
		super(new Chunk_Step())
	}
	forward(input: BinaryInput<ArrayArgs<Record<any, never>>>): BinaryOutput<Chunk_schema[]> {
		const
			{ bin, pos } = input,
			item_args: Record<any, never> = {},
			bin_length = bin.byteLength,
			out_chunks: Chunk_schema[] = []
		let
			current_chunk: Chunk_schema,
			bytelength = 0
		do {
			const { val, len } = super.next_forward(bin, pos + bytelength, item_args)
			bytelength += len
			out_chunks.push(current_chunk = val)
		} while (current_chunk.kind !== "IEND" && pos < bin_length)
		return { val: out_chunks, len: bytelength }
	}
}

type GeneralChunk_schema = {
	kind: Chunk_schema["kind"]
	data: ChunkData_schema
}

class InterpretChunks_Step extends PureStep<Chunk_schema[], Array<GeneralChunk_schema>> {
	protected lost!: never
	forward(input: Chunk_schema[]): GeneralChunk_schema[] {
		return input.map(({ kind, data }): GeneralChunk_schema => {
			const input_payload = { bin: data, pos: 0, args: {} } as any
			let interpreted_data: GeneralChunk_schema["data"]
			switch (kind) {
				case "IHDR": {
					interpreted_data = IHDR_step.forward(input_payload).val
					break
				}
				case "PLTE": {
					interpreted_data = PLTE_step.forward(input_payload).val as PLTE_schema
					break
				}
				case "pHYs": {
					interpreted_data = pHYs_step.forward(input_payload).val
					break
				}
				case "cHRM": {
					interpreted_data = cHRM_step.forward(input_payload).val
					break
				}
				case "gAMA": {
					interpreted_data = gAMA_step.forward(input_payload).val
					break
				}
				case "hIST": {
					interpreted_data = hIST_step.forward(input_payload).val as hIST_schema
					break
				}
				case "tEXt": {
					interpreted_data = tEXt_step.forward(input_payload).val
					break
				}
				case "tIME": {
					interpreted_data = tIME_step.forward(input_payload).val
					break
				}
				case "zTXt": {
					interpreted_data = zTXt_step.forward(input_payload).val
					break
				}
				case "bKGD":
				case "sBIT":
				case "tRNS":
				case "IEND":
				default: {
					interpreted_data = data
					break
				}
			}
			return { kind, data: interpreted_data }
		})
	}
	backward(input: GeneralChunk_schema[]): Chunk_schema[] {
		return input.map(({ kind, data }): Chunk_schema => {
			const input_payload = { val: data as any }
			let binary_data: Chunk_schema["data"]
			switch (kind) {
				case "IHDR": {
					binary_data = IHDR_step.backward(input_payload).bin
					break
				}
				case "PLTE": {
					binary_data = PLTE_step.backward(input_payload).bin
					break
				}
				case "pHYs": {
					binary_data = pHYs_step.backward(input_payload).bin
					break
				}
				case "cHRM": {
					binary_data = cHRM_step.backward(input_payload).bin
					break
				}
				case "gAMA": {
					binary_data = gAMA_step.backward(input_payload).bin
					break
				}
				case "hIST": {
					binary_data = hIST_step.backward(input_payload).bin
					break
				}
				case "tEXt": {
					binary_data = tEXt_step.backward(input_payload).bin
					break
				}
				case "tIME": {
					binary_data = tIME_step.backward(input_payload).bin
					break
				}
				case "zTXt": {
					binary_data = zTXt_step.backward(input_payload).bin
					break
				}
				case "bKGD":
				case "sBIT":
				case "tRNS":
				case "IEND":
				default: {
					binary_data = data as Uint8Array
					break
				}
			}
			return {
				byteLength: 0,
				kind,
				data: binary_data,
				crc: 0,
			}
		})
	}
}

type File_schema = {
	magic: Uint8Array,
	chunks: Array<Chunk_schema>
}

class File_Step extends BinaryRecordStep<File_schema> {
	constructor() {
		super([
			["magic", new BinaryDefaultArgs(new BinaryBytesStep(), { length: 8 }, 1)],
			["chunks", new AllChunks_Step()],
		])
	}
	backward(input: Omit<BinaryOutput<File_schema>, "len">): BinaryInput<Record<any, never>> {
		input.val.magic = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
		return super.backward(input) as any
	}
}

class PNG_Codec_Step extends PureStep<Uint8Array, GeneralChunk_schema[]> {
	lost!: never
	forward(input: Uint8Array): GeneralChunk_schema[] {
		const file_schema = (new File_Step).forward({ bin: input, pos: 0, args: {} })
		return (new InterpretChunks_Step).forward(file_schema.val.chunks)
	}
	backward(input: GeneralChunk_schema[]): Uint8Array {
		const chunks = (new InterpretChunks_Step).backward(input)
		return (new File_Step).backward({
			val: { chunks, magic: undefined as any }
		}).bin
	}
}


const file_step_adapter = {
	encode: (value: GeneralChunk_schema[]): Uint8Array => {
		return (new PNG_Codec_Step()).backward(value)
	},
	decode: (buffer: Uint8Array, offset: number, ...args: any[]): [value: GeneralChunk_schema[], bytesize: number] => {
		const val = (new PNG_Codec_Step()).forward(buffer)
		return [val, 0]
	}
}


const png_file_parser = new FileParser(file_step_adapter)
Object.assign(window, { png_file_parser })
// export default png_file_parser
