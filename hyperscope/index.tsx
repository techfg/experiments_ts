/** @jsx h */

import { bindMethodToSelfByName } from "./deps.ts"
import { Component_Render, HTMLElement_Render, HyperScope, SVGElement_Render } from "./mod.ts"

const hyperscope = new HyperScope(
	new Component_Render("component jsx renderer"),
	new HTMLElement_Render("html jsx renderer"),
)
const svg_renderer = hyperscope.addClass(SVGElement_Render)
const SVG_SCOPE = svg_renderer.kind

const h = bindMethodToSelfByName(hyperscope, "h")
const { pushScope, popScope } = hyperscope

// h("div", {}, pushScope(), popScope())

const a = <div>
	<span>Hello</span>
	{pushScope(SVG_SCOPE)}
	<svg width="200px" height="200px" viewBox="0 0 200 200"><g>
		<text text-anchor="left" y="100">NOICEEE</text>
	</g></svg>
	{popScope()}
	<span>World</span>
</div>


document.body.appendChild(a)
