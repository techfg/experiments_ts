/** @jsx h */
/** @jsxFrag Fragment */

import { Context, MemoSignal_Factory, StateSignal_Factory } from "jsr:@oazmi/tsignal"
import { bindMethodToSelfByName } from "./deps.ts"
import { ATTRS, EVENTS, Fragment, HyperScope } from "./mod.ts"
import { ReactiveComponent_Render_Factory, ReactiveFragment_Render_Factory, ReactiveHTMLElement_Render_Factory, ReactiveSVGElement_Render_Factory } from "./signal.ts"

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory)

const
	ReactiveFragment_Render = ReactiveFragment_Render_Factory(ctx),
	ReactiveComponent_Render = ReactiveComponent_Render_Factory(ctx),
	ReactiveHTMLElement_Render = ReactiveHTMLElement_Render_Factory(ctx),
	ReactiveSVGElement_Render = ReactiveSVGElement_Render_Factory(ctx)


const hyperscope = new HyperScope(
	new ReactiveFragment_Render("reactive fragment component jsx renderer"),
	new ReactiveComponent_Render("reactive component jsx renderer"),
	new ReactiveHTMLElement_Render("reactive html jsx renderer"),
)
const svg_renderer = hyperscope.addClass(ReactiveSVGElement_Render, "reactive svg jsx renderer")
const SVG_SCOPE = svg_renderer.kind

const h = bindMethodToSelfByName(hyperscope, "h")
const { pushScope, popScope } = hyperscope

const MyDiv = ({ width = 100, height = 50 } = {}) => {
	const [, getTime, setTime] = createState(Date.now() / 1000)
	setInterval(() => {
		setTime(Date.now() / 1000)
	}, 1000)

	return <div>
		<span>Hello</span>
		<span>World</span>
		{pushScope(SVG_SCOPE)}
		<svg width={`${width}px`} height={`${height}px`} viewBox={`0 0 ${width} ${height}`}><g>
			<text text-anchor="left" y={`${height / 2}`}>NOICEEE SVG!</text>
		</g></svg>
		{popScope()}
		<>
			<span>{getTime}</span>
			<span>ZA</span>
			<span>WARUDO!</span>
			<button {...{
				[EVENTS]: {
					click() {
						setTime((prev_time) => (prev_time ?? 0) - 10)
					},
				}
			}} >TOKYO WA TOMARE!</button>
		</>
	</div>
}

/** renders into:
const a = h("div", { width: 50, ATTRS: { style: "background-color: red;" } },
	h("span", null, "Hello"),
	h("span", null, "World"),
	pushScope(SVG_SCOPE),
	h("svg", { width: "50px", height: "50px", viewBox: "0 0 50 50" },
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

document.body.appendChild(<MyDiv width={50} {...{ [ATTRS]: { "style": "background-color: red;" } }} />)
