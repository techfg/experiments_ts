/** @jsx h */
/** @jsxFrag Fragment */

import { bindMethodToSelfByName } from "./deps.ts"
import { } from "./jsx.ts"
import { Component_Render, Fragment, HTMLElement_Render, HyperScope, SVGElement_Render } from "./mod.ts"

const hyperscope = new HyperScope(
	new Component_Render("component jsx renderer"),
	new HTMLElement_Render("html jsx renderer"),
)
const svg_renderer = hyperscope.addClass(SVGElement_Render)
const SVG_SCOPE = svg_renderer.kind

const h = bindMethodToSelfByName(hyperscope, "h")
const { pushScope, popScope } = hyperscope

const my_div = <div>
	<span>Hello</span>
	<span>World</span>
	{pushScope(SVG_SCOPE)}
	<svg width="100px" height="50px" viewBox="0 0 100 50"><g>
		<text text-anchor="left" y="25">NOICEEE SVG!</text>
	</g></svg>
	{popScope()}
	<>
		<span>ZA</span>
		<span>WARUDO!</span>
		<span>TOKYO WA TOMARE!</span>
	</>
</div>
/** renders into:
const a = h("div", null,
	h("span", null, "Hello"),
	h("span", null, "World"),
	pushScope(SVG_SCOPE),
	h("svg", { width: "100px", height: "50px", viewBox: "0 0 100 50" },
		h("g", null,
			h("text", { "text-anchor": "left", y: "25" }, "NOICEEE SVG!")
		)
	),
	popScope(),
	h(Fragment, null,
		h("span", null, "ZA"),
		h("span", null, "WARUDO!"),
		h("span", null, "TOKYO WA TOMARE!"),
	)
)
*/

document.body.appendChild(my_div)
