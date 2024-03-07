/** @jsx h */
/** @jsxFrag Fragment */

import { Context, MemoSignal_Factory, StateSignal_Factory } from "jsr:@oazmi/tsignal"
import { bindMethodToSelfByName } from "../deps.ts"
import { HyperScope } from "../mod.ts"
import { ReactiveComponent_Render_Factory, ReactiveFragment_Render_Factory, ReactiveHTMLElement_Render_Factory, ReactiveSVGElement_Render_Factory } from "../signal.ts"
export type { Accessor, Setter } from "jsr:@oazmi/tsignal"
export { Fragment } from "../mod.ts"

export const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory)

const
	fragment_renderer = new (ReactiveFragment_Render_Factory(ctx))("reactive fragment component jsx renderer"),
	component_renderer = new (ReactiveComponent_Render_Factory(ctx))("reactive component jsx renderer"),
	html_renderer = new (ReactiveHTMLElement_Render_Factory(ctx))("reactive html jsx renderer")

const hyperscope = new HyperScope(
	html_renderer,
	component_renderer,
	fragment_renderer,
)

const svg_renderer = hyperscope.addClass(ReactiveSVGElement_Render_Factory(ctx), "reactive svg jsx renderer")

export const
	HTML_SCOPE = html_renderer.kind,
	COMP_SCOPE = component_renderer.kind,
	FRAG_SCOPE = fragment_renderer.kind,
	SVG_SCOPE = svg_renderer.kind

export const h = bindMethodToSelfByName(hyperscope, "h")
export const { pushScope, popScope } = hyperscope

export const stringify = (value: any): string | null => {
	const is_null = value === null || value === undefined
	return is_null ? null : value.toString()
}
