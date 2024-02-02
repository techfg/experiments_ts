export * from "https://deno.land/x/kitchensink_ts@v0.7.3/eightpack.ts"
export * from "https://deno.land/x/kitchensink_ts@v0.7.3/typedbuffer.ts"
export type * from "https://deno.land/x/kitchensink_ts@v0.7.3/mod.ts"


export const enum COMPILATION_MODE {
	DEBUG,
	PRODUCTION,
	MINIFY,
}
export const compilation_mode: COMPILATION_MODE = COMPILATION_MODE.DEBUG as const


/*
type EntriesToKeys<T extends [string, any][]> = T[number][0]
type EntriesToValues<T extends [string, any][]> = T[number][1]
type ObjectFromEntries<T extends [string, any][]> = {
	[K in EntriesToKeys<T>]: Extract<T[number], [K, any]>[1]
}
type ObjectToEntries<OBJ> = {
	[K in keyof OBJ as number]: [K, OBJ[K]]
}[number]
type ObjectToEntries_Mapped_FN1<OBJ> = {
	[K in keyof OBJ as number]: [K, FN1<OBJ[K]>]
}[number]



type arr = [elem1: ["hello", string], elem2: ["world", number], ["letsgoo", { nyaa: string, pantsu: { kill: 5, your: 33, self: symbol } }]]
type ARR = ObjectFromEntries<arr>
type arr_reconstruction = ObjectToEntries<ARR>

type FN1<T> = () => { val: T, len: number }
type FN2<FNS extends Array<[string, () => { val: any }]>> = (...fns: FNS) => { val: ObjectFromEntries<arr>, len: number }
type FN3<
	FNS extends Array<[key: string, value: FN1<any>]>,
	OBJ = { [K in EntriesToKeys<FNS>]: ReturnType<ObjectFromEntries<FNS>[K]>["val"] }
> = (...fns: FNS) => { val: OBJ, len: number }
type FN4<
	OBJ,
	FNS extends Array<ObjectToEntries_Mapped_FN1<OBJ>> = Array<ObjectToEntries_Mapped_FN1<OBJ>>
> = (...fns: FNS) => { val: OBJ, len: number }
type FN5<
	OBJ,
	FNS extends Array<ObjectToEntries_Mapped_FN1<OBJ>> = Array<ObjectToEntries_Mapped_FN1<OBJ>>
> = (fns: FNS) => { val: OBJ, len: number }

declare const hello_fn: FN1<string>
declare const world_fn: FN1<number>
declare const letsgoo_fn: FN1<{ nyaa: string, pantsu: { kill: 5, your: 33, self: symbol } }>

declare const arr_fn2: FN2<[["hello", typeof hello_fn], ["world", typeof world_fn], ["letsgoo", typeof letsgoo_fn]]>
const arr_rec2 = arr_fn2(["hello", hello_fn], ["world", world_fn], ["letsgoo", letsgoo_fn]).val

declare const arr_fn3: FN3<
	[["hello", typeof hello_fn], ["world", typeof world_fn], ["letsgoo", typeof letsgoo_fn]]
>
const arr_rec3 = arr_fn3(["hello", hello_fn], ["world", world_fn], ["letsgoo", letsgoo_fn]).val
arr_rec3

declare const arr_fn4: FN4<ARR>
const arr_rec4 = arr_fn4(["hello", hello_fn], ["world", world_fn], ["letsgoo", letsgoo_fn]).val
arr_rec4

declare const arr_fn5: FN5<ARR>
const arr_rec5 = arr_fn5([["hello", hello_fn], ["world", world_fn], ["letsgoo", letsgoo_fn]]).val
arr_rec5




// Define a URI for each type constructor
interface URItoKind<A = "none"> {
	"none": A
	"MyMap": FN1<A>
	// Add other mappings here
}

// Define the HKT
type HKT<URI extends keyof URItoKind<any>, A> = URItoKind<A>[URI]

// Define the ObjectToMappedEntries type
type ObjectToMappedEntries<OBJ, URI extends keyof URItoKind<any> = "none"> = {
	[K in keyof OBJ as number]: [K, HKT<URI, OBJ[K]>]
}[number]

declare const AAA: ObjectToMappedEntries<ARR>
*/
