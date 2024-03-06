/** a minimal implementation of JSX runtime element creation. <br>
 * to use in `esbuild`'s javascript build API, you will need to do one of the following options (or do both):
 * 
 * 1) option 1 (preferred): <br>
 *   for JSX to work with your IDE's LSP, and for esbuild to automatically discover the hyperscript functions,
 *   you will need to include the following two comment lines at the top of your `.tsx` script:
 * ```tsx
 * /** \@jsx h *\/
 * /** \@jsxFrag hf *\/
 * ```
 * 
 * 2) option 2 (no LSP support): <br>
 *   in the esbuild build options (`BuildOptions`), set `jsxFactory = "h"` and `jsxFragment = "hf"`.
 * ```ts
 * import { build, stop } from "https://deno.land/x/esbuild/mod.js"
 * build({
 *     entryPoints: ["./path/to/your/script.tsx"],
 *     jsxFactory: "h",
 *     jsxFragment: "Fragment",
 *     // other build options
 *     minify: true,
 * })
 * stop()
 * ```
 * 
 * and now in your `.jsx` script, you should:
 * - import `createHyperScript` from this module
 * - create a reactive signal `Context`
 * - call `createHyperScript` with the signal context `ctx` as the argument
 * - the returned tuple will contain 3 elements:
 *     - the first element should be named `h` (which is the name you declare as `\@jsx h` in **option 1** or `jsxFactory = "h"` in **option 2**)
 *     - the second element should be named `hf` (which is the name you declare as `\@jsxFrag hf` in **option 1** or `jsxFragment = "hf"` in **option 2**)
 *     - the third can be named anything
 * 
 * @example
 * ```tsx
 * // the `\@jsx h` comment comes here, but I can't show multiline comments in this documentation.
 * // the `\@jsxFrag hf` comment comes here, but I can't show multiline comments in this documentation.
 * 
 * import { createHyperScript } from "./path/to/tsignal/jsx/hyperscript.ts"
 * import { Context } from "./path/to/tsignal/mod.ts"
 * 
 * const ctx = new Context()
 * const [h, hf, namespaceStack] = createHyperScript(ctx)
 * 
 * const my_elem = <div>Hello world</div>
 * const my_fragment_elems = <>
 *     <span>World<span>
 *     <span>Hello<span>
 * </>
 * const my_elem2 = <div>...my_fragment_elems</div>
 * document.body.appendChild(my_elem)
 * document.body.appendChild(my_elem2)
 * 
 * // when creating svgs or xml, you will have to change the DOM namespace, so that the correct kinds of `Node`s are created.
 * namespaceStack.push("svg")
 * const my_svg = <svg viewBox="0 0 200 200">
 *     <g transform="translate(100, 50)">
 *         <text text-anchor="middle">SVG says Hi!</text>
 *         <text y="25" text-anchor="middle">SVG stands for "SUGOI! Vector Graphics"</text>
 *     </g>
 * </svg>
 * namespaceStack.pop()
 * ```
 * 
 * @module
*/

import { ConstructorOf, array_isArray, bind_array_pop, bind_array_push, bind_map_get, bind_stack_seek, isFunction, object_entries } from "./deps.ts"


export type RenderKind = symbol

export abstract class HyperRender<TAG = any, OUTPUT = any> {
	kind: symbol

	constructor(existing_kind?: symbol)
	constructor(new_kind_description?: string)
	constructor(kind?: symbol | string) {
		this.kind = typeof kind === "symbol" ? kind : Symbol(kind)
	}

	/** tests if the provided parameters, {@link tag | `tag`} and {@link props | `props`}, are compatible this `Scope`'s {@link h | `h` method} */
	abstract test(tag: any, props?: any): boolean

	/** creates an {@link OUTPUT | element} out of its properties. functions similar to `React.createElement` */
	abstract h(tag: TAG, props?: null | { [key: PropertyKey]: any }, ...children: any[]): OUTPUT
}

export const ATTRS = Symbol("explicitly declared Element attributes of a single Component")
export type AttrProps = { [attr: string]: any }

export type EventFn<NAME extends keyof HTMLElementEventMap> = (this: Element, event: HTMLElementEventMap[NAME]) => void
export const EVENTS = Symbol("explicitly declared event listeners of a single Component")
export type EventProps = { [event_name in keyof HTMLElementEventMap]?: EventFn<event_name> }

export const ADVANCED_EVENTS = Symbol("explicitly declared advaced configurable events")
export type AdvancedEvenProps = { [event_name in keyof HTMLElementEventMap]?: [event_fn: EventFn<event_name>, options?: boolean | AddEventListenerOptions] }

export interface DefaultProps {
	[ATTRS]?: AttrProps | undefined | null
	[EVENTS]?: EventProps | undefined | null
	[ADVANCED_EVENTS]?: AdvancedEvenProps | undefined | null
}

export type Props<P = {}> = P & DefaultProps

export type SingleComponentGenerator<P = {}> = (props?: Props<P>) => Element
export type FragmentComponentGenerator<P = {}> = (props?: P) => (string | Element)[]
export type ComponentGenerator<P = {}> = SingleComponentGenerator<P> | FragmentComponentGenerator<P>

export class Component_Render<G extends ComponentGenerator = ComponentGenerator> extends HyperRender<G> {
	test(tag: any, props?: any): boolean { return isFunction(tag) }

	h<
		C extends G,
		P extends (C extends ComponentGenerator<infer PROPS> ? PROPS : undefined | null | object) = any
	>(component: C, props: Props<P>, ...children: (string | Node)[]): ReturnType<C> {
		props ??= {} as Props<P>
		children = children.map((child) => this.processChild(child))
		const component_node = component(props) as ReturnType<C>
		if (array_isArray(component_node)) {
			component_node.push(...children as (string | Element)[])
			return component_node
		}
		for (const [attr_name, attr_value] of object_entries(props[ATTRS] ?? {})) {
			this.addAttr(component_node, attr_name, attr_value)
		}
		for (const [event_name, event_fn] of object_entries(props[EVENTS] ?? {})) {
			this.addEvent(component_node, event_name, event_fn)
		}
		for (const [event_name, [event_fn, options]] of object_entries(props[ADVANCED_EVENTS] ?? {})) {
			this.addEvent(component_node, event_name, event_fn, options)
		}
		component_node.append(...children)
		return component_node
	}

	protected addAttr(element: Element, attribute_name: string, attribute_value: any): void {
		const attr = document.createAttribute(attribute_name)
		attr.nodeValue = attribute_value
		element.setAttributeNode(attr)
	}

	protected addEvent(
		element: Element,
		event_name: string,
		event_fn: EventFn<any>,
		options?: boolean | AddEventListenerOptions
	): void {
		element.addEventListener(event_name, event_fn, options)
	}

	protected processChild(child: string | Node): string | Node {
		return child
	}
}

const normalizeElementProps = (props?: null | Props<AttrProps>): Props<{}> => {
	const {
		[EVENTS]: event_props,
		[ADVANCED_EVENTS]: advanced_events_props,
		[ATTRS]: other_attr_props,
		...attr_props
	} = props ?? {}
	return {
		[EVENTS]: event_props,
		[ADVANCED_EVENTS]: advanced_events_props,
		[ATTRS]: { ...attr_props, ...other_attr_props },
	}
}

export const HTMLTagComponent = <TAG extends keyof HTMLElementTagNameMap = any>(props?: Props<{ tag?: TAG }>): HTMLElementTagNameMap[TAG] => document.createElement(props!.tag!)
export class HTMLElement_Render extends Component_Render<typeof HTMLTagComponent> {
	test(tag: any, props?: any): boolean { return typeof tag === "string" }

	// @ts-ignore: we are breaking subclassing inheritance rules by having `tag: string` as the first argument instead of `component: ComponentGenerator`
	h<TAG extends keyof HTMLElementTagNameMap>(tag: TAG, props?: null | Props<AttrProps>, ...children: (string | Node)[]): HTMLElementTagNameMap[TAG] {
		return super.h(HTMLTagComponent, { tag, ...normalizeElementProps(props) }, ...children) as HTMLElementTagNameMap[TAG]
	}
}

export const SVGTagComponent = <TAG extends keyof SVGElementTagNameMap = any>(props?: Props<{ tag?: TAG }>): SVGElementTagNameMap[TAG] => document.createElementNS("http://www.w3.org/2000/svg", props!.tag!)
export class SVGElement_Render extends Component_Render<typeof SVGTagComponent> {
	test(tag: any, props?: any): boolean { return typeof tag === "string" }

	// @ts-ignore: we are breaking subclassing inheritance rules by having `tag: string` as the first argument instead of `component: ComponentGenerator`
	h<TAG extends keyof SVGElementTagNameMap>(tag: TAG, props?: null | Props<AttrProps>, ...children: (string | Node)[]): SVGElementTagNameMap[TAG] {
		return super.h(SVGTagComponent, { tag, ...normalizeElementProps(props) }, ...children) as SVGElementTagNameMap[TAG]
	}
}

export const Fragment = Symbol("indication for a fragment component")
export const FragmentTagComponent = (props?: any) => [] as Element[]
export class Fragment_Render extends Component_Render {
	test(tag: any, props?: any): boolean { return tag === Fragment }

	// @ts-ignore: we are breaking subclassing inheritance rules by having `tag: Fragment` as the first argument instead of `component: ComponentGenerator`
	h(tag: Fragment, props?: null, ...children: (string | Node)[]): Element[] {
		return super.h(FragmentTagComponent, {}, ...children)
	}
}

const
	PushScope = Symbol("pushed a scope"),
	PopScope = Symbol("popped a scope"),
	node_only_child_filter = (child: symbol | Node) => (typeof child !== "symbol")


type HyperScopeChild = typeof PushScope | typeof PopScope | Node
type HyperScopeChildren = (HyperScopeChild | Array<HyperScopeChild>)[]

export class HyperScope extends HyperRender<any, any> {
	protected renderers: Map<RenderKind, HyperRender> = new Map()

	pushScope: (...renderers: RenderKind[]) => typeof PushScope
	popScope: () => typeof PopScope
	seekScope: () => HyperRender[]

	constructor(...default_scope: HyperRender[]) {
		super("hyperscope rederer")
		const
			scope_stack: Array<HyperRender[]> = [],
			scope_stack_push = bind_array_push(scope_stack),
			scope_stack_pop = bind_array_pop(scope_stack),
			scope_stack_seek = bind_stack_seek(scope_stack),
			all_renderers_map_get = bind_map_get(this.renderers)
		this.pushScope = (...renderers: RenderKind[]): typeof PushScope => {
			scope_stack_push(renderers.map((scope) => all_renderers_map_get(scope)!))
			return PushScope
		}
		this.popScope = (): typeof PopScope => {
			scope_stack_pop()
			return PopScope
		}
		this.seekScope = (): HyperRender[] => {
			return scope_stack_seek() ?? default_scope
		}
	}

	addClass<CLS extends ConstructorOf<HyperRender, ARGS>, ARGS extends any[]>(renderer_class: CLS, ...args: ARGS): InstanceType<CLS> {
		const renderer = new renderer_class(...args)
		this.renderers.set(renderer.kind, renderer)
		return renderer as any
	}

	test(tag: any, props?: any): boolean {
		for (const renderer of this.seekScope()) {
			if (renderer.test(tag, props)) {
				return true
			}
		}
		return false
	}

	h(tag: typeof Fragment, props: null, ...children: HyperScopeChildren): Element[]
	h(tag: any, props: any, ...children: HyperScopeChildren): Element
	h(tag: any, props: any, ...children: HyperScopeChildren): undefined | Element | Element[] {
		for (const renderer of this.seekScope()) {
			if (renderer.test(tag, props)) {
				const flat_children = children.flat(1).filter(node_only_child_filter)
				return renderer.h(tag, props, ...flat_children)
			}
		}
	}
}
