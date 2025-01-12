import type { DenoJson, ExportsWithMain } from "jsr:@oazmi/build-tools@0.2.4/typedefs"
import { object_values } from "jsr:@oazmi/kitchensink@0.9.1/alias"
import { ensureStartDotSlash, parsePackageUrl, resolveAsUrl, type PackagePseudoUrl } from "jsr:@oazmi/kitchensink@0.9.1/pathman"
import { isString } from "jsr:@oazmi/kitchensink@0.9.1/struct"
import type { Require } from "jsr:@oazmi/kitchensink@0.9.1/typedefs"


export interface JsrPackageMeta {
	scope: string
	name: string
	latest: string
	versions: Record<string, { yanked?: boolean }>
}

export interface ResolveJsrPathConfig {
	base: string | URL
}

const defaultResolveJsrPathConfig: ResolveJsrPathConfig = {
	base: "https://jsr.io/"
}

/** resolves the http url of a given valid jsr package module.
 * 
 * @example
 * ```ts
 * import { assertEquals } from "jsr:@std/assert"
 * 
 * // aliasing our functions for brevity
 * const
 * 	fn = resolveJsrPath,
 * 	eq = assertEquals,
 * 	re = (input: string, pattern: RegExp): void => (eq(pattern.test(input), true))
 * 
 * eq((await fn("jsr:@oazmi/kitchensink@0.9.1")).href,          "https://jsr.io/@oazmi/kitchensink/0.9.1/src/mod.ts")
 * eq((await fn("jsr:@oazmi/kitchensink@0.9.1/typedefs")).href, "https://jsr.io/@oazmi/kitchensink/0.9.1/src/typedefs.ts")
 * re((await fn("jsr:@oazmi/kitchensink")).href,                /^https:\/\/jsr.io\/@oazmi\/kitchensink\/.*?\/src\/mod.ts$/)
 * re((await fn("jsr:@oazmi/kitchensink/typedefs")).href,       /^https:\/\/jsr.io\/@oazmi\/kitchensink\/.*?\/src\/typedefs.ts$/)
 * ```
*/
export const resolveJsrPath = async (path: string, config: Partial<ResolveJsrPathConfig> = {}): Promise<URL> => {
	const
		{ base } = { ...defaultResolveJsrPathConfig, ...config },
		{ protocol, scope, pkg, pathname, version } = parsePackageUrl(path) as Require<PackagePseudoUrl, "scope">
	if (protocol !== "jsr:") { throw new Error(`expected path protocol to be "jsr:", found "${protocol}" instead`) }

	const
		meta_json_url = resolveAsUrl(`@${scope}/${pkg}/meta.json`, base),
		meta_json = await (await fetch(meta_json_url)).json() as JsrPackageMeta,
		resolved_version = version ?? meta_json.latest, // TODO: this needs proper semantic version resolution instead of the basic thing that we're doing
		base_host = resolveAsUrl(`@${scope}/${pkg}/${resolved_version}/`, base),
		deno_json_url = resolveAsUrl("./deno.json", base_host),
		deno_json = await (await fetch(deno_json_url)).json() as DenoJson,
		deno_json_exports = deno_json.exports,
		export_map = isString(deno_json_exports) ? { ".": deno_json_exports } : deno_json_exports,
		resolved_relative_pathname = resolvePathFromImportmap(ensureStartDotSlash(pathname), export_map),
		resolved_url = resolveAsUrl(resolved_relative_pathname, base_host)

	// TODO: the esbuild resolver plugin should pass down the import map of the currently loaded module as a part of its `pluginData`.
	// TODO: the correct implementation will have to recognize not only "deno.json", but also "deno.jsonc", "jsr.json", and "package.json" as alternatives as well if the prior one does not exist.
	// TODO: the correct implementation will not only recognize `DenoJson["imports"]` (the import map), but also any potential alternate `DenoJson["importMap"]` file location to fetch instead of using `deno.json` only.

	return resolved_url
}

export const resolvePathFromImportmap = (pathname: string, import_map: ExportsWithMain): string => {
	// TODO: this function should be able to handle directory keys in `import_map` (i.e. keys that end with a trailing slash "/") in the future.
	let relative_pathname = ensureStartDotSlash(pathname)
	if (relative_pathname === "./") { relative_pathname = "." }
	const exact_match = import_map[relative_pathname]
	if (exact_match) { return exact_match }

	// finding the longest `import_map` key that matches the input `relative_pathname`.
	const sorted_import_map_keys = object_values(import_map).toSorted((a, b) => (b.length - a.length))
	for (const key of sorted_import_map_keys) {
		if (key.endsWith("/") && relative_pathname.startsWith(key)) {
			const value = import_map[key]
			return relative_pathname.replace(key, value)
		}
	}

	throw new Error(`unable to resolve path: "${pathname}" from the given import map:\n${JSON.stringify(import_map)}`)
}
