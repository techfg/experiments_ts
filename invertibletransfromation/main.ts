import { BinaryArrayStep, BinaryHeaderLengthedStep } from "./binary_composition_steps.ts"
import { BinaryNumberArrayStep, BinaryNumberStep } from "./binary_primitive_steps.ts"


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
