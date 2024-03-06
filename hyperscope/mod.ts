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

import { ConstructorOf, ValuesOf, array_isArray, bind_array_pop, bind_array_push, bind_map_get, bind_stack_seek, isFunction, object_entries } from "./deps.ts"


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

export const ATTRS = Symbol("explicitly declared Element attributes of a Component")
export type AttrProps = { [attr: string]: any }

export type SingleComponentGenerator<P = {}> = (props?: P & { [ATTRS]?: AttrProps }) => Element
export type FragmentComponentGenerator<P = {}> = (props?: P) => (string | Element)[]
export type ComponentGenerator<P = {}> = SingleComponentGenerator<P> | FragmentComponentGenerator<P>
export class Component_Render extends HyperRender<ComponentGenerator, Element | (string | Element)[]> {
	test(tag: any, props?: any): boolean { return isFunction(tag) }

	h<
		C extends ComponentGenerator,
		P extends (C extends ComponentGenerator<infer PROPS> ? PROPS : undefined | null | object) = any
	>(component: C, props: P & { [ATTRS]?: AttrProps }, ...children: (string | Node)[]): ReturnType<C> {
		props ??= {} as P & { [ATTRS]?: AttrProps }
		const component_node = component(props) as ReturnType<C>
		if (array_isArray(component_node)) {
			component_node.push(...children as (string | Element)[])
		} else {
			for (const [attr_name, attr_value] of object_entries(props[ATTRS] ?? {})) {
				const attr = document.createAttribute(attr_name)
				attr.nodeValue = attr_value
				component_node.setAttributeNode(attr)
				// createAttr(attr, attr_value)
			}
			component_node.append(...children)
		}
		return component_node
	}
}

export class HTMLElement_Render extends HyperRender<keyof HTMLElementTagNameMap, ValuesOf<HTMLElementTagNameMap>> {
	test(tag: any, props?: any): boolean { return typeof tag === "string" }

	h<TAG extends keyof HTMLElementTagNameMap>(tag: TAG, props?: null | AttrProps, ...children: (string | Node)[]): HTMLElementTagNameMap[TAG] {
		props ??= {}
		const element = document.createElement(tag)
		for (const [attr_name, attr_value] of object_entries(props)) {
			const attr = document.createAttribute(attr_name)
			element.setAttributeNode(attr)
			attr.nodeValue = attr_value
			// createAttr(attr, attr_value)
		}
		element.append(...children)
		return element
	}
}

export class SVGElement_Render extends HyperRender<keyof SVGElementTagNameMap, ValuesOf<SVGElementTagNameMap>> {
	test(tag: any, props?: any): boolean { return typeof tag === "string" }

	h<TAG extends keyof SVGElementTagNameMap>(tag: TAG, props?: null | AttrProps, ...children: (string | Node)[]): SVGElementTagNameMap[TAG] {
		props ??= {}
		const element = document.createElementNS("http://www.w3.org/2000/svg", tag)
		for (const [attr_name, attr_value] of object_entries(props)) {
			// svg doesn't work when their attributes are made with a namespaceURI (i.e. createAttributeNS doesn't work for svgs). strange.
			const attr = document.createAttribute(attr_name)
			attr.nodeValue = attr_value
			element.setAttributeNode(attr)
		}
		element.append(...children)
		return element
	}
}


const
	PushScope = Symbol("pushed a scope"),
	PopScope = Symbol("popped a scope"),
	node_only_child_filter = (child: symbol | Node) => (typeof child !== "symbol")

export const Fragment = Symbol("indication for a fragment component")

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
	h(tag: typeof Fragment | any, props: any, ...children: HyperScopeChildren): undefined | Element | Element[] {
		if (tag === Fragment) {
			return children as Element[]
		}
		for (const renderer of this.seekScope()) {
			if (renderer.test(tag, props)) {
				const flat_children = children.flat(1).filter(node_only_child_filter)
				return renderer.h(tag, props, ...flat_children)
			}
		}
	}
}
