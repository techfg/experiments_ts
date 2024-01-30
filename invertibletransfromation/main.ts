import { decode_str, encode_str, pack, unpack,  } from "./deps.ts"

/** a single step consists a froward transformation {@link FROM | from a type} to a {@link TO | different type},
 * and a backward transfromation that does the reverse.
*/
// interface Step<FROM, TO, LOST = any> {
/** the forward transformation function */
// forward: (input: FROM) => TO
/** the reverse transformation function */
// backward: (input: TO) => FROM
/** information lost in the forward transformation should be stored here.
 * the lost information may be needed for the backward transformation.
*/
// lost: LOST
// }

// I think Step's forward and backward methods should be static, since `lost` should be bound to the `input`


/** a single step consists a froward transformation {@link FROM | from a type} to a {@link TO | different type},
 * and a backward transfromation that does the reverse.
*/
interface Step<FROM, TO, LOST = any> {
	/** the forward transformation function */
	forward: (input: FROM) => TO
	/** the reverse transformation function */
	backward: (input: TO) => FROM
	/** information lost in the forward transformation should be stored here.
	 * the lost information may be needed for the backward transformation.
	*/
	lost: LOST
}

type BinaryOutput<T> = {
	/** decoded output value */
	val: T
	/** bytelength occupied by the value when it was decoded */
	len: number
}
type BinaryInput<T, ARGS = any[]> = {
	/** input binary data */
	bin: Uint8Array
	/** byte offet */
	pos: number
	/** args */
	args?: ARGS
}
type BinaryStep<
	T,
	OUT extends BinaryOutput<T> = any,
	IN extends BinaryInput<T> = any,
	LOST = any
> = Step<IN, OUT, LOST>


interface BinaryInput_String extends BinaryInput<string, [length: number]> {
	args: [length: number,]
}
class BinaryStringStep implements BinaryStep<
	string,
	BinaryOutput<string>,
	BinaryInput_String
> {
	lost: undefined
	forward(input: BinaryInput_String): BinaryOutput<string> {
		const
			{ bin, pos, args: [str_lenth] } = input,
			[str, bytelength] = decode_str(bin, pos, str_lenth)
		return { val: str, len: bytelength }
	}
	backward(input: BinaryOutput<string>): BinaryInput_String {
		const
			bin = encode_str(input.val),
			str_lenth = bin.length
		return { bin, pos: 0, args: [str_lenth,] }
	}
}




const a = unpack("bool", Uint8Array.of(), 8)[0]
