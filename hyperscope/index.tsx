/** @jsx h */

import { bindMethodToSelfByName } from "./deps.ts"
import { } from "./jsx.ts"
import { Component_Render, HTMLElement_Render, HyperScope, SVGElement_Render } from "./mod.ts"

const hyperscope = new HyperScope(
	new Component_Render("component jsx renderer"),
	new HTMLElement_Render("html jsx renderer"),
)
const svg_renderer = hyperscope.addClass(SVGElement_Render)
const SVG_SCOPE = svg_renderer.kind

const h = bindMethodToSelfByName(hyperscope, "h")
const { pushScope, popScope } = hyperscope

const a = <div>
	<span>Hello</span>
	{pushScope(SVG_SCOPE)}
	<svg width="200px" height="200px" viewBox="0 0 200 200"><g>
		<text text-anchor="left" y="100">NOICEEE</text>
	</g></svg>
	{popScope()}
	<span>World</span>
</div>
/** renders into:
const a = h("div", null,
	h("span", null, "Hello"),
	pushScope(SVG_SCOPE),
	h("svg", { width: "200px", height: "200px", viewBox: "0 0 200 200" },
		h("g", null,
			h("text", { "text-anchor": "left", y: "100" }, "NOICEEE")
		)
	),
	popScope(),
	h("span", null, "World")
)
*/

document.body.appendChild(a)
