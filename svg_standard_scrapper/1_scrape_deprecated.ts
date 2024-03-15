/** this part should be ran in [MDN's SVG reference page](https://developer.mozilla.org/en-US/docs/Web/SVG), or any of its subpages. <br>
 * make sure there's a left-side pane on your screen, with collapsible table of content in it.
 * you should see entries like "Reference", "Elements", and "Attributes" on it, for this to work.
 * 
 * this script gathers all svg element tag names, and attribute names, and lists which of them are deprecated.
*/


declare global {
	interface NodeListOf<TNode extends Node> extends NodeList {
		[Symbol.iterator](): IterableIterator<NonNullable<TNode>>
	}
}

const all_svg_element_tags_dom = [...
	[...document.querySelectorAll(".sidebar-body > ol > li > details > summary")]
		.filter((node) => (node.textContent?.toLowerCase() === "elements"))
		.pop()!
		.nextElementSibling!
		.querySelectorAll("li")
]

const all_svg_attributes_dom = [...
	[...document.querySelectorAll(".sidebar-body > ol > li > details > summary")]
		.filter((node) => (node.textContent?.toLowerCase() === "attributes"))
		.pop()!
		.nextElementSibling!
		.querySelectorAll("li")
]

const svgTagNames: string[] = []
const svgDeprecatedTagNames: string[] = []
const svgAllTagNames = all_svg_element_tags_dom.map((li_dom) => {
	const
		tag_name = li_dom.firstChild!.textContent!.replace("<", "").replace(">", ""),
		is_deprecated = li_dom.querySelector("abbr.icon-deprecated") ? true : false
	if (is_deprecated) { svgDeprecatedTagNames.push(tag_name) }
	else { svgTagNames.push(tag_name) }
	return tag_name
})

const svgAttributeNames: string[] = []
const svgDeprecatedAttributeNames: string[] = []
const svgAllAttributeNames = all_svg_attributes_dom.map((li_dom) => {
	const
		attribute_name = li_dom.firstChild!.textContent!,
		is_deprecated = li_dom.querySelector("abbr.icon-deprecated") ? true : false
	if (is_deprecated) { svgDeprecatedAttributeNames.push(attribute_name) }
	else { svgAttributeNames.push(attribute_name) }
	return attribute_name
})

const exports_ts = Object.entries({ svgDeprecatedTagNames, svgDeprecatedAttributeNames })
	.map(([key, value]) => [key, JSON.stringify(value)])
	.map(([key, value]) => `export const ${key} = ${value}`)
	.join("\n")

console.log("copy the logged content below into \"./1_exports.ts\"\n")
console.log(
	"\/** generated via: https://github.com/omar-azmi/experiments_ts/svg_standard_scrapper/1_scrape_deprecated.ts *\/"
	+ "\n\n"
	+ exports_ts
	+ "\n"
)
export { svgDeprecatedAttributeNames, svgDeprecatedTagNames }

