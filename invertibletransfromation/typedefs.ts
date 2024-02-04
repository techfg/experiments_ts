/** @module */

/////// Utility types

/** subtract an interface subset `B` from its superset `A`.
 * @typeParam B the subset type
 * @typeParam A th superset type
 * @example
 * ```ts
 * type C = SubtractSubset<{ a: number, c?: symbol }, { a: number, b: string, c: symbol }>
 * // type C == { b: string }
 * ```
*/
export type SubtractSubset<B, A extends B> = Pick<A, Exclude<keyof A, keyof B>>

/** this utility type returns a union of all the keys that have been assigned as `never`.
 * @example
 * ```ts
 * type MyType = { a: number, b: never, c: never, d: { e: never, f: string } }
 * type AllofMyNeverKeys = NeverKeys<MyType>
 * // type AllofMyNeverKeys === ("b" | "c")
 * ```
*/
export type NeverKeys<T> = { [K in keyof T]: T[K] extends never ? K : never }[keyof T]

/** this utility type removes all property keys that are of the `never` type.
 * @example
 * ```ts
 * type MyType = { a: number, b: never, c: never, d: { e: never, f: string } }
 * type MyType_Cleansed = RemoveNeverKeys<MyType>
 * // type MyType_Cleansed === { a: number, d: { e: never, f: string } }
 * ```
*/
export type RemoveNeverKeys<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] }

/** this utility type optionalizes all property keys that are of the `never` type.
 * ```ts
 * type MyType = { a: number, b: never, c: never, d: { e: never, f: string } }
 * type MyType_OptionallyCleansed = RemoveNeverKeys<MyType>
 * // type MyType_OptionallyCleansed === { a: number, b?: never, c?: never, d: { e: never, f: string } }
 * ```
*/
export type OptionalNeverKeys<T> = RemoveNeverKeys<T> & Partial<T>

/** takes an array of 2-tuples (entries) of the form `[key: string, value: any]`,
 * and returns a union of the first element of each of the tuples (keys).
 * it practically functions like the elements of `Object.keys`.
 * @example
 * ```ts
 * type MyKeys = EntriesToKeys<[["name", "john"], ["age", 30], ["title", string]]>
 * // type MyKeys === ("name" | "age" | "title")
 * ```
*/
export type EntriesToKeys<T extends [string, any][]> = T[number][0]

/** takes an array of 2-tuples (entries) of the form `[key: string, value: any]`,
 * and returns a union of the second element of each of the tuples (values).
 * it practically functions like the elements of `Object.values`.
 * @example
 * ```ts
 * type MyValues = EntriesToValues<[["name", "john"], ["age", 30], ["title", string]]>
 * // type MyValues === ("john" | 30 | string)
 * ```
*/
export type EntriesToValues<T extends [string, any][]> = T[number][1]

/** takes an array of 2-tuples (entries) of the form `[key: string, value: any]`,
 * and returns an interface with with the same key-value pairs.
 * it practically functions like `Object.fromEntries`.
 * {@link ObjectToEntries | `ObjectToEntries`} does the inverse of what this does.
 * @example
 * ```ts
 * type MyObj = ObjectFromEntries<[["name", "john"], ["age", 30], ["title", string]]>
 * // type MyObj === { name: "john", age: 30, title: string }
 * ```
*/
export type ObjectFromEntries<T extends [string, any][]> = {
	[K in EntriesToKeys<T>]: Extract<T[number], [K, any]>[1]
}

/** takes an object and returns an array of 2-tuples (entries) containing the key-value pairs
 * in the form of `[key: string, value: any]`.
 * it practically functions like the elements of `Object.entries`.
 * {@link ObjectFromEntries | `ObjectFromEntries`} does the inverse of what this does.
 * @example
 * type MyObj = { name: "john", age: 30, title: string }
 * type MyEntries = ObjectToEntries<MyObj>
 * // type MyEntries === (["name", "john"] | ["age", 30] | ["title", string])
*/
export type ObjectToEntries<OBJ> = {
	[K in keyof OBJ as number]: [K, OBJ[K]]
}[number]


/** a mapping of all higher-order-type kinds utilized in this library. the keys are their alias.
 * do not use this directly. instead, access it through {@link ApplyHOT |`ApplyHOT`}, as it would lead to better caching, and quicker typechecking.
*/
interface HOTKindMap<A> {
	/** identity type */
	"none": A
	/**  */
	"BinaryPureStep_Of": BinaryPureStep<A>
	// TODO: the following is not used. delete it later
	"ArgsOf_BinaryPureStep": A extends BinaryPureStep<any, infer ARGS> ? ARGS : never
}

/** get a certain _higher-order-type_ (HOT) by referencing it through its alias, and pairing it with the data/type it is supposed to operate on. */
type ApplyHOT<HOTAlias extends keyof HOTKindMap<any>, A> = HOTKindMap<A>[HOTAlias]


/////// Step classes definition

/** a single step consists a {@link forward | `forward`} transformation {@link FROM | from a type} to a {@link TO | different type},
 * and a {@link backward | `backward`} transformation that does the reverse. <br>
 * if information is lost during the forward transformation, it should be stored in the {@link lost | `lost`} member,
 * and then rejoined when the backward transformation is carried out. this will ensure full invertibility of the data. <br>
 * if no information is lost during the forward transformation, it would be a good idea to use the {@link PureStep | `PureStep`} subclass instead.
*/
export abstract class Step<FROM, TO, LOST = any> {
	/** information lost in the forward transformation should be stored here.
	 * the lost information may be needed for the backward transformation.
	*/
	protected abstract lost: LOST

	/** the forward transformation function */
	abstract forward(input: FROM): TO

	/** the reverse transformation function */
	abstract backward(input: TO): FROM
}

/** a pure step never loses any invertibility information. this formally provides us with two great benefits:
 * - we may utilize the {@link backward | `backward`} method before ever using the {@link forward | `forward`} method prior.
 * - we may reuse the same instance of a pure step for many forward and backward transformations, however many times we want, in any order we want.
*/
export abstract class PureStep<FROM, TO> extends Step<FROM, TO, never> {
	protected abstract lost: never
}


/////// BinaryStep definitions

/** the generic input that goes into a {@link BinaryStep["forward"] | `BinaryStep`}'s forward function. <br>
 * it is also the output of that {@link BinaryStep["backward"] | `BinaryStep`}'s backward function.
*/
export interface BinaryInput<ARGS = any> {
	/** the input binary data bytes */
	bin: Uint8Array
	/** the byte offset to begin the parsing from */
	pos: number
	/** additional arguments needed for the parsing */
	args: ARGS
}

/** the generic output of a {@link BinaryStep["forward"] | `BinaryStep`}'s forward function. <br>
 * it is also the input of that {@link BinaryStep["backward"] | `BinaryStep`}'s backward function.
*/
export interface BinaryOutput<T> {
	/** decoded output value */
	val: T
	/** bytelength occupied by the value when it was decoded */
	len: number
}

/** a binary step is a class capable of encoding and decoding binary data. <br>
 * - the {@link forward | `forward`} method behaves like a decoder
 * - the {@link backward | `backward`} method behaves like an encoder
 * 
 * if a certain kind of `BinaryStep` does not lose data when decoding, it is considered to be _pure_.
 * if that is the case, you should instead use the {@link BinaryPureStep | `BinaryPureStep`}, which offers much more benefits.
 * 
 * @typeParam OUT the value type of the decoded object
 * @typeParam ARGS the input argument interface needed for decoding in the {@link forward | `forward`} method (could be empty)
 * @typeParam LOST the interface of any potential lost data. if it exists, it should be used inside of the {@link backward | `backward`} method when reconstructing the binary data
*/
export abstract class BinaryStep<
	OUT,
	ARGS = any,
	LOST = any
> extends Step<BinaryInput<ARGS>, BinaryOutput<OUT>, LOST> {
	/** @inheritdoc
	 * the backward transformation in the `BinaryStep` is defined so that it is not reliant the decoded object's original bytelength {@link BinaryOutput["len"] | `"len"`} member.
	*/
	abstract backward(input: Omit<BinaryOutput<OUT>, "len">): BinaryInput<ARGS>
}

/** a pure binary step is a class capable of encoding and decoding binary data without the lose of invertibility information during either transformations. <br>
 * - the {@link forward | `forward`} method behaves like a decoder
 * - the {@link backward | `backward`} method behaves like an encoder
 * 
 * @typeParam OUT the value type of the decoded object
 * @typeParam ARGS the input argument interface needed for decoding in the {@link forward | `forward`} method (could be empty)
*/
export abstract class BinaryPureStep<OUT, ARGS = any> extends PureStep<BinaryInput<ARGS>, BinaryOutput<OUT>> implements BinaryStep<OUT, ARGS, never>{
	protected abstract lost: never
	/** @inheritdoc
	 * the backward transformation in the `BinaryStep` is defined so that it is not reliant the decoded object's original bytelength {@link BinaryOutput["len"] | `len`} member.
	*/
	abstract backward(input: Omit<BinaryOutput<OUT>, "len">): BinaryInput<ARGS>
}

/** a commonly used argument interface in many data types with variable lengths (strings, arrays, arrays of arrays, etc...) */
export type LengthedArgs = { length: number }

/** a binary step that has its input args extending the {@link LengthedArgs | `LengthedArgs`} interface.
 * in other words: `forward_input["args"] extends { length: number }`. <br>
 * it is particularly useful to define this subclass, as many of the binary step classes are composed of binary steps with the `length` argument parameter.
*/
export abstract class BinaryLengthedDataStep<OUT, LOST = any> extends BinaryStep<OUT, LengthedArgs, LOST> { }

/** a pure binary step that has its input args extending the {@link LengthedArgs | `LengthedArgs`} interface.
 * see {@link BinaryLengthedDataStep | `BinaryLengthedDataStep`} for the complete description, and its usefulness.
*/
export abstract class BinaryLengthedDataPureStep<OUT> extends BinaryPureStep<OUT, LengthedArgs> implements BinaryLengthedDataStep<OUT, never> { }


export type ObjectToEntries_Mapped<OBJ, HOTAlias extends keyof HOTKindMap<any> = "none"> = {
	[K in keyof OBJ as number]: [K, ApplyHOT<HOTAlias, OBJ[K]>]
}[number]

export type Entry_Mapped<ENTRY_TYPE extends [string, any], HOTAlias extends keyof HOTKindMap<any> = "none"> = [ENTRY_TYPE[0], ApplyHOT<HOTAlias, ENTRY_TYPE[1]>]

// export type Entries_Mapped1<ENTRIES extends Array<[string, any]>> = {
// 	[K in EntriesToKeys<ENTRIES> as number]: [K, Extract<ENTRIES[number], [K, any]>[1]]
// }[number]

// export type Entries_Mapped2<ENTRIES extends Array<[string, any]>, HOTAlias extends keyof HOTKindMap<any> = "none"> = {
// 	[N in keyof ENTRIES]: Entry_Mapped<ENTRIES[N], HOTAlias>
// }

export type Entries_Mapped<
	ENTRIES extends Array<[string, any]>,
	HOTAlias extends keyof HOTKindMap<any> = "none",
	OBJ extends ObjectFromEntries<ENTRIES> = ObjectFromEntries<ENTRIES>
> = ObjectToEntries_Mapped<OBJ, HOTAlias>

/*

export type Entries_Mapped<ENTRIES extends Array<[string, any]>, HOTAlias extends keyof HOTKindMap<any> = "none"> = {
	[K in keyof ENTRIES as number]: [K, ApplyHOT<HOTAlias, ENTRIES[K][1]>]
}[number]


// Define the ObjectToMappedEntries type
type ObjectToMappedEntries<OBJ, HOTAlias extends keyof HOTKindMap<any> = "none"> = {
	[K in keyof OBJ as number]: [K, ApplyHOT<HOTAlias, OBJ[K]>]
}[number]
*/
