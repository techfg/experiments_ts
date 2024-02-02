import { COMPILATION_MODE, compilation_mode, concatBytes } from "./deps.ts"
import { BinaryInput, BinaryOutput, BinaryPureStep, LengthedArgs, OptionalNeverKeys } from "./typedefs.ts"


export interface ArrayArgs<ITEM_ARGS> extends LengthedArgs {
	item_args: ITEM_ARGS
}
export class BinaryArrayStep<
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


export interface HeaderLengthedArgs<HEAD_ARGS, BODY_ARGS extends LengthedArgs> {
	head: HEAD_ARGS
	// do not include the `length` key in your body, for it will be inserted by forward step automatically
	body: Exclude<BODY_ARGS, LengthedArgs>
}
export class BinaryHeaderLengthedStep<
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


/*
interface RecordArgs<RECORD_ARGS_MAP extends { [key: string]: any }> {
	entry_args: RECORD_ARGS_MAP
}

interface RecordEntry<RECORD_STEP_MAP extends { [key: string]: BinaryPureStep<any> }, K extends keyof RECORD_STEP_MAP> {

}
class BinaryRecordStep<
	RECORD
> extends BinaryPureStep<RECORD> {

}
*/

/*
type Z = ObjectFromEntries

type Schemaaa = {
	a: number
	b: Map<any, any>
	c?: string
	d: {
		kill: string
		your: { self: Uint8Array }
	}
}
type R = RecordArgs<Schemaaa>
declare const r: R
const www = r.entry_args.d
*/
