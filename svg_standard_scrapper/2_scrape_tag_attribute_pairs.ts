/** this part should be ran in [W3C's SVG 2.0 Draft Attribute index page](https://svgwg.org/svg-next/attindex.html). <br>
 * 
 * this script gathers all svg attributes, and distribute it among the tag names,
 * while also keeping a short list of common attribute groups supported by many tags together,
 * so as to create a shorter list of more unique attributes supported by each tag.
*/

// TODO make a separate script to scrape geomentry properties: https://svgwg.org/svg-next/geometry.html
// also, you are missing "transform" for the "g" element, you must be missing other stuff that is elsewhere
// also check this out: "https://svgwg.org/svg-next/idl.html" it might be easier to parse it

import { svgDeprecatedAttributeNames, svgDeprecatedTagNames } from "./1_exports.ts"

const string_sort_comparison = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

const attributes_table = document.querySelector("#RegularAttributes + * + table")!

type AttributeSupportedTags = [attribute_name: string, supported_tags: string[]]

const attr_supported_tags_dict_entries = [...attributes_table.querySelectorAll("tbody > tr")]
	.map((attr_row) => {
		const
			attr_name = attr_row.querySelector(".attr-name")!.textContent!,
			tag_names = [...attr_row.querySelectorAll(".element-name")]
				.map((span_dom) => span_dom.textContent!)
				// sort element tag names alphabetically
				.sort(string_sort_comparison)
				// filter out any deprecated tag names
				.filter((tag_name) => !(svgDeprecatedTagNames.includes(tag_name)))
		return [attr_name, tag_names] as AttributeSupportedTags
	})
	// sort attribute names alphabetically
	.sort((a, b) => string_sort_comparison(a[0], b[0]))
	// remove all event attributes (all of which begin with "on", for example "onfocus" or "ondragexit")
	.filter(([attr_name, tag_names]) => !(attr_name.startsWith("on")))
	// remove all aria attributes (all of which begin with "aria-*" or equal to "role", for example "aria-details" or "aria-colspan")
	.filter(([attr_name, tag_names]) => !(attr_name.startsWith("aria-") || attr_name === "role"))
	// remove deprecated attributes (such as "cursor")
	.filter(([attr_name, tag_names]) => !(svgDeprecatedAttributeNames.includes(attr_name)))
	// there will be a few redundancies in the entries' `attr_name`s, so we join them here
	.reduce((acc, [attr_name, tag_names]) => {
		if (acc.at(-1)?.[0] === attr_name) {
			const prev_tag_names = acc.pop()![1]
			tag_names = [...new Set([...prev_tag_names, ...tag_names])].sort(string_sort_comparison)
		}
		acc.push([attr_name, tag_names])
		return acc
	}, [] as AttributeSupportedTags[])

type Union<T> = T[]
interface CommonAttributesSets {
	[CommonAttributeName: string]: Union<string>
}

/** the key represents a PascalCased type-friendly name to be used for the collection of common attributes.
 * for example, we might use the key `"Stylable"` for the 57 element tags tags that support both attribute "style" and
 * "class" attributes (therefore the value will be `["style", "class"]`).
 * or use the key `"Identifiyable"` for the attribute collection `["id"]`. etc...
*/
const svgCommonAttributeGroups = {
	Stylable: ["style", "class"], // 76 tags implement these
	AriaSupport: ["role", "`aria-${string}`"], // 26 tags implement these
	Common: ["id", "lang", "tabindex"], // 57 tags implement these
	LanguageAndExtension: ["requiredExtensions", "systemLanguage"], // 30 tags implement these
	FeCommon1: ["height", "in", "result", "width", "x", "y"], // 14 tags implement these
	FeCommon2: ["height", "result", "width", "x", "y"], // 17 tags implement these, but only 3 will get listed, since the previous one will eat up most of them
	FeFunc: ["amplitude", "exponent", "intercept", "offset", "tableValues", "type"], // 4 tags implement these
	AnimationSupport1: ["begin", "dur", "end", "fill", "href", "max", "min", "repeatCount", "repeatDur", "restart"], // 4 tags implement these
	AnimationSupport2: ["accumulate", "additive", "by", "calcMode", "from", "keySplines", "keyTimes", "to", "values"], // 3 tags implement these
	BoxViewAble: ["preserveAspectRatio", "viewBox"], // 5 tags implement these
	Rect: ["height", "width", "x", "y"], // 3 tags implement these
	LineSegment: ["x1", "x2", "y1", "y2"], // 2 tags implement these
	TextOptions: ["lengthAdjust", "textLength"], // 2 tags implement these
} satisfies CommonAttributesSets
const CommonAttributeGroupsKeys = Object.keys(svgCommonAttributeGroups) as (keyof typeof svgCommonAttributeGroups)[]
type CommonAttributeGroupSupportVector = Partial<{ [TYPE in keyof typeof svgCommonAttributeGroups]: boolean }>
type TagSupportedAttributes = {
	[tag_name: string]: [AttrVectorTypes: CommonAttributeGroupSupportVector, ...RestAttrs: string[]]
}

const ArrayIsSubset = <T>(super_array: T[], sub_array: T[]) => {
	const is_subset_or_equal = sub_array.every(val => super_array.includes(val))
	return !is_subset_or_equal
		? -1
		: super_array.length === sub_array.length
			? 0
			: 1
}

const CommonAttributeGroupRedundancy = Object.fromEntries(
	Object.entries(svgCommonAttributeGroups)
		.map(([group_name, group_union_attrs]) => {
			const is_subset_of_the_following_groups: typeof CommonAttributeGroupsKeys = []
			for (const vec_key of CommonAttributeGroupsKeys) {
				if (ArrayIsSubset(svgCommonAttributeGroups[vec_key], group_union_attrs) > 0) {
					is_subset_of_the_following_groups.push(vec_key)
				}
			}
			return [group_name, is_subset_of_the_following_groups] as const
		})
)

const tag_supported_attrs_dict: TagSupportedAttributes = {}

// fill in the attributes supported by each tag
attr_supported_tags_dict_entries.forEach(([attr, tags]) => {
	for (const tag of tags) {
		tag_supported_attrs_dict[tag] ??= [{},]
		tag_supported_attrs_dict[tag].push(attr)
	}
})

const tag_supported_attrs_entries = Object.entries(tag_supported_attrs_dict)
	// fill in the attribute_group support vector (`AttrVectorTypes`)
	.map(([tag, [attribute_groups, ...rest_attrs]]) => {
		for (const vec_key of CommonAttributeGroupsKeys) {
			attribute_groups[vec_key] = ArrayIsSubset(rest_attrs, svgCommonAttributeGroups[vec_key]) >= 0
		}
		return [tag, [attribute_groups, ...rest_attrs]] as const
	})
	// purge redundant attribute_groups (`AttrVectorTypes`) and standalone attributes (`RestAttrs`)
	.map(([tag, [attribute_groups, ...rest_attrs]]) => {
		const extended_groups = Object.entries(attribute_groups)
			.filter(([group_name, tag_extends_it]) => tag_extends_it)
			.map(([group_name, tag_extends_it]) => group_name as keyof typeof svgCommonAttributeGroups)
			.filter((group_name, i, all_extended_groups) => {
				for (const other_extended_group of all_extended_groups) {
					if (CommonAttributeGroupRedundancy[group_name].includes(other_extended_group)) {
						return false
					}
				}
				return true
			})
		const extended_solo_attrs = rest_attrs.filter((attr_name) => {
			for (const group_name of extended_groups) {
				if (svgCommonAttributeGroups[group_name].includes(attr_name)) {
					return false
				}
			}
			return true
		})
		return [tag, {
			groups: extended_groups,
			attrs: extended_solo_attrs
		}] as const
	})

export type SvgTagSupportedAttributes = {
	[tag_name: string]: {
		/** extended attribute groups */
		groups: Array<keyof typeof svgCommonAttributeGroups>
		/** solo attribute names that were not part of any extended groups */
		attrs: Array<string>
	}
}
const svgTagSupportedAttributes: SvgTagSupportedAttributes = Object.fromEntries(tag_supported_attrs_entries)

// now we inject "Presentation-Attributes" into the `Stylable` group of attributes,
// because every stylable element can also have its styling components inlined as attributes.
// these are known as presentation attributes
const presentation_attrs = [...document.querySelectorAll("#PresentationAttributes ~ span.attr-name")]
	.map((attr_span_dom) => attr_span_dom.textContent!)
	// remove deprecated attributes
	.filter((attr_name) => !(svgDeprecatedAttributeNames.includes(attr_name)))
svgCommonAttributeGroups.Stylable.push(...presentation_attrs)

const exports_ts = Object.entries({ svgCommonAttributeGroups, svgTagSupportedAttributes })
	.map(([key, value]) => [key, JSON.stringify(value)])
	.map(([key, value]) => `export const ${key} = ${value}`)
	.join("\n")

console.log("copy the logged content below into \"./2_exports.ts\"\n")
console.log(
	"\/** generated via: https://github.com/omar-azmi/experiments_ts/svg_standard_scrapper/2_scrape_tag_attribute_pairs.ts *\/"
	+ "\n\n"
	+ exports_ts
	+ "\n"
)

export { svgCommonAttributeGroups, svgTagSupportedAttributes }

