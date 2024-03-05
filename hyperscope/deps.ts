// export * from "https://deno.land/x/kitchensink_ts@v0.7.5/mod.ts"
export { bindMethodToSelfByName, bind_array_pop, bind_array_push, bind_map_get, bind_stack_seek } from "https://deno.land/x/kitchensink_ts@v0.7.5/binder.ts"
export { array_isArray, object_entries } from "https://deno.land/x/kitchensink_ts@v0.7.5/builtin_aliases_deps.ts"
export { isFunction } from "https://deno.land/x/kitchensink_ts@v0.7.5/struct.ts"
export type { ConstructorOf } from "https://deno.land/x/kitchensink_ts@v0.7.5/typedefs.ts"


export const enum DEBUG {
	LOG = 0,
}

export type KeysOf<R> = keyof R
export type ValuesOf<R> = R[keyof R]
export type Stringifyable = { toString(): string }
