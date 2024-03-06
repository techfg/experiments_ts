// export * from "jsr:@oazmi/kitchensink@0.7.5/mod"
export { bindMethodToSelfByName, bind_array_pop, bind_array_push, bind_map_get, bind_stack_seek } from "jsr:@oazmi/kitchensink@0.7.5/binder"
export { array_isArray, object_entries } from "jsr:@oazmi/kitchensink@0.7.5/builtin_aliases_deps"
export { isFunction } from "jsr:@oazmi/kitchensink@0.7.5/struct"
export type { ConstructorOf } from "jsr:@oazmi/kitchensink@0.7.5/typedefs"


export const enum DEBUG {
	LOG = 0,
}

export type KeysOf<R> = keyof R
export type ValuesOf<R> = R[keyof R]
export type Stringifyable = { toString(): string }
