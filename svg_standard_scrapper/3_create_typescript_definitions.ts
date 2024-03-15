import { svgCommonAttributeGroups, svgTagSupportedAttributes } from "./2_exports.ts"
import { SvgTagSupportedAttributes } from "./2_scrape_tag_attribute_pairs.ts"

const unionizeArrayOfString = (arr: string[], escape = true) => {
	return escape
		? arr.map((str) => "\"" + str + "\"").join(" | ")
		: arr.join(" | ")
}
const unionizeEntryOfTagSupportedAttributes = (entry: SvgTagSupportedAttributes[any]) => {
	const { groups, attrs } = entry
	const group_attrs = unionizeArrayOfString(groups, false)
	const solo_attrs = unionizeArrayOfString(attrs, true)
	return (group_attrs.length > 0 && solo_attrs.length > 0)
		? group_attrs + " | " + solo_attrs
		: group_attrs + solo_attrs
}

const svgCommonAttributeGroups_Types = Object.entries(svgCommonAttributeGroups)
	.map(([group_name, group_union_attrs]) => {
		return "type " + group_name + " = " + unionizeArrayOfString(group_union_attrs, true)
	})
	.join("\n")

const svgTagSupportedAttributes_Types = "export type SvgTagAttributes = {\n" + Object.entries(svgTagSupportedAttributes)
	.map(([tag_name, entry]) => {
		return tag_name + " : " + unionizeEntryOfTagSupportedAttributes(entry as any)
	})
	.join("\n\t") + "\n}\n"

console.log("copy the logged content below into \"./3_exports.ts\"\n")
console.log(
	"\/** generated via: https://github.com/omar-azmi/experiments_ts/svg_standard_scrapper/3_create_typescript_definitions.ts *\/"
	+ "\n\n"
	+ svgCommonAttributeGroups_Types
	+ "\n\n"
	+ svgTagSupportedAttributes_Types
	+ "\n"
)
