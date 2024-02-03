import { BinaryArrayStep, BinaryHeaderLengthedStep, BinaryRecordStep, RecordArgs, ArrayArgs } from "./binary_composition_steps.ts"
import { BinaryCStringStep, BinaryNumberArrayStep, BinaryNumberStep, BinaryStringStep } from "./binary_primitive_steps.ts"
import { LengthedArgs } from "./typedefs.ts"


// TODO: document each and every binary step out there
// DONE: implement "bytes" primitive binary step (i.e `BinaryPureStep<Uint8Array, LengthedArgs>`)
// TODO: start thinking about conditional binary steps, such as the ENUM-bytes conditional one
// TODO: consider renaming `BinaryRecordStep` to `BinaryInterfaceStep` or `BinarySchemaStep`, as the word "Record" would imply something like a dictionary, where both the keys and values are encoded in binary.
// NOTPLANNED, turned out to be a bad idea. code inference with schema as first argument is far better than what was suggested here:
//       consider changing `BinaryRecordStep`'s generic signature from `<RECORD_SCHEMA, ARGS, ENTRY_TYPE>` to `<ENTRIES, ARGS, RECORD_SCHEMA>`, where `RECORD_SCHEMA` would be generated through type manipulation of `ENTRIES`, and so will `ARGS`.
//       but if someone would like to go with a certain schema, irrespective of the entries and args types, they'd declare `<any, any, MYSCHEMA>`
// DONE: consider removing `BinaryRecordStep`'s `args.entry_args`, so that it is at the top level. this will actually make your design more compatible/consistent with `BinaryArrayStep` and `BinaryHeaderLengthedStep`,
//       as they too use a single nestedness for their composition components, rather than a nestedness of two, the way it currently is with `BinaryRecordStep`'s args interface.

const c = new BinaryArrayStep(new BinaryNumberArrayStep("u1"))
const c_out = c.forward({ bin: Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), pos: 0, args: { length: 5, item: { length: 2 } } })
const c_in = c.backward(c_out)
console.log(c_out)
console.log(c_in)

const d = new BinaryHeaderLengthedStep(new BinaryNumberStep("u1"), new BinaryNumberArrayStep("u4b"))
const d_out = d.forward({ bin: Uint8Array.of(3, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3), pos: 0, args: {} })
const d_in = d.backward(d_out)
console.log(d_out)
console.log(d_in)

type MySchema = {
	a: number
	b: Record<string, any>
	c?: string
	d: {
		kill: string
		your: { self: number[] }
		headless: string[]
	}
}

type MySchemaArgs = {
	b: {},
	c: LengthedArgs,
	d: RecordArgs<{
		your: RecordArgs<{}>,
		headless: ArrayArgs<{}>
	}>
}

const MySchemaCodec = new BinaryRecordStep<MySchema, MySchemaArgs>([
	["a", new BinaryNumberStep("f8b")],
	["b", new BinaryRecordStep<MySchema["b"]>([])],
	["c", new BinaryStringStep()],
	["d", new BinaryRecordStep<MySchema["d"]>([
		["kill", new BinaryCStringStep()],
		["your", new BinaryRecordStep<MySchema["d"]["your"]>([
			["self", new BinaryHeaderLengthedStep(
				new BinaryNumberStep("u4l"),
				new BinaryNumberArrayStep("u1"),
			)]
		])],
		["headless", new BinaryArrayStep(
			new BinaryCStringStep()
		)],
	])]
])

const my_data: MySchema = {
	a: 1948.123,
	b: {},
	c: "hello world",
	d: {
		kill: "zis is null terminated",
		your: {
			self: [0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA, 0xF9]
		},
		headless: ["a", "bc", "def", "ghij", "klmno"]
	}
}
const my_data_binaried = MySchemaCodec.backward({ val: my_data })
console.log(my_data_binaried)
const my_data_reconstructed = MySchemaCodec.forward(my_data_binaried)
console.log(my_data_reconstructed.val)

// sample usage with args
MySchemaCodec.forward({
	bin: my_data_binaried.bin,
	pos: 0,
	args: {
		b: {},
		c: { length: 11 },
		d: {
			your: {
				self: {
					body: {}
				}

			},
			headless: { length: 5, item: {} }
		}
	}
})
