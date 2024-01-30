
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
	forward: (input: FROM) => Step<TO, any, any>
	/** the reverse transformation function */
	backward: (input: TO) => Step<any, FROM, any>
	/** information lost in the forward transformation should be stored here.
	 * the lost information may be needed for the backward transformation.
	*/
	lost: LOST
}
type FirstStep<T> = Step<undefined, T, undefined>
type FinalStep<T> = Step<T, undefined, T>

type BinaryOutput<T> = {
	/** decoded output value */
	val: T
	/** bytelength occupied by the value when it was decoded */
	len: number
}
type BinaryInput<T> = {
	/** input binary data */
	bin: Uint8Array
	/** byte offet */
	pos: number
	/** args */
	args?: any[]
}
type BinaryStep<T, OUT extends BinaryOutput<T> = any, IN extends BinaryInput<T> = any, LOST = any> = Step<IN, OUT, LOST>


class BinaryStringStep implements BinaryStep<
	string,
	BinaryOutput<string>,
	BinaryInput<string> & { args?: [length: number] }
> {
	forward(input: BinaryInput<string> & { args?: [length: number] }): Step<BinaryOutput<string>, any, any> {

	}
	backward(input: BinaryOutput<string>): Step<any, BinaryInput<string> & { args?: [length: number] | undefined }, any> {

	}
	lost = undefined
}

