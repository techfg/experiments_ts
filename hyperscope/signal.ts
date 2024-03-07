import { Accessor, Context, EffectSignal_Factory } from "jsr:@oazmi/tsignal"
import { isFunction } from "./deps.ts"
import { ComponentGenerator, Component_Render, Fragment, FragmentTagComponent, HTMLTagComponent, Props, SVGTagComponent, normalizeElementProps, svg_case_sensitive_attrs, svg_case_sensitive_attrs_lower } from "./mod.ts"

const stringify = (value: any): string | null => {
	const is_null = value === null || value === undefined
	return is_null ? null : value.toString()
}

const isAccessor = isFunction as ((obj: any) => obj is Accessor<any>)

export const ReactiveComponent_Render_Factory = (ctx: Context) => {
	const createEffect = ctx.addClass(EffectSignal_Factory)

	return class ReactiveComponent_Render<G extends ComponentGenerator = ComponentGenerator> extends Component_Render<G> {
		protected addAttr(element: Element, attribute_node: Attr): void
		protected addAttr(element: Element, attribute_name: string, attribute_value: any): void
		protected addAttr(element: Element, attribute: Attr | string, attribute_value?: any): void
		protected addAttr(element: Element, attribute: Attr | string, attribute_value?: any): void {
			const
				existing_node = attribute instanceof Attr,
				attr = existing_node ? attribute : document.createAttribute(attribute)
			if (isAccessor(attribute_value)) {
				// let first_time = true
				createEffect((id) => {
					const
						old_value = attr.nodeValue,
						new_value = attribute_value(id)
					attr.nodeValue = stringify(new_value)
					if (new_value === null && old_value !== null) {
						(attr.ownerElement ?? element).removeAttributeNode(attr)
					} else if (new_value !== null && !attr.ownerElement) {
						element.setAttributeNode(attr)
					}
					return new_value === old_value
				}, { defer: false })
				// element.setAttributeNode(attr) // this is redundant, since the attribute starts with a `null` value
			} else {
				super.addAttr(element, attribute, attribute_value)
			}
		}

		protected processChild(child: Accessor<any> | string | Node): string | Node {
			if (isAccessor(child)) {
				const text = document.createTextNode("")
				createEffect((id) => {
					const
						old_value = text.nodeValue,
						new_value = child(id)
					text.nodeValue = stringify(new_value)
					return new_value === old_value
				}, { defer: false })
				return text
			}
			return child
		}
	}
}

export const ReactiveHTMLElement_Render_Factory = (ctx: Context) => {
	return class ReactiveHTMLElement_Render extends ReactiveComponent_Render_Factory(ctx)<typeof HTMLTagComponent> {
		test(tag: any, props?: any): boolean { return typeof tag === "string" }

		// @ts-ignore: we are breaking subclassing inheritance rules by having `tag: string` as the first argument instead of `component: ComponentGenerator`
		h<TAG extends keyof HTMLElementTagNameMap>(tag: TAG, props?: null | Props<AttrProps>, ...children: (string | Node)[]): HTMLElementTagNameMap[TAG] {
			return super.h(HTMLTagComponent, { tag, ...normalizeElementProps(props) }, ...children) as HTMLElementTagNameMap[TAG]
		}
	}
}

export const ReactiveSVGElement_Render_Factory = (ctx: Context) => {
	return class ReactiveSVGElement_Render extends ReactiveComponent_Render_Factory(ctx)<typeof SVGTagComponent> {
		test(tag: any, props?: any): boolean { return typeof tag === "string" }

		// @ts-ignore: we are breaking subclassing inheritance rules by having `tag: string` as the first argument instead of `component: ComponentGenerator`
		h<TAG extends keyof SVGElementTagNameMap>(tag: TAG, props?: null | Props<AttrProps>, ...children: (string | Node)[]): SVGElementTagNameMap[TAG] {
			return super.h(SVGTagComponent, { tag, ...normalizeElementProps(props) }, ...children) as SVGElementTagNameMap[TAG]
		}

		protected addAttr(element: Element, attribute_node: Attr): void
		protected addAttr(element: Element, attribute_name: string, attribute_value: any): void
		protected addAttr(element: Element, attribute: Attr | string, attribute_value?: any): void
		protected addAttr(element: Element, attribute: Attr | string, attribute_value?: any): void {
			// svg attributes are case sensitive, most notably the "viewBox" and "preserveAspectRatio" attributes must have the exact casing.
			// unfortunately, when we create attribute nodes using `document.createAttribute(attribute_name)`, like done in the super method,
			// we lose the original casing, and everything becomes lower cased. so, we must instead use
			//`element.setAttribute(attribute_name, attribute_value)` to preserve the original case.
			const case_sensitive_attr_name_index = attribute instanceof Attr ? -1 : svg_case_sensitive_attrs_lower.indexOf(attribute.toLowerCase())
			if (case_sensitive_attr_name_index >= 0) {
				const attr_name = svg_case_sensitive_attrs[case_sensitive_attr_name_index]
				element.setAttribute(attr_name, attribute_value)
				attribute = element.getAttributeNode(attr_name)!
			}
			super.addAttr(element, attribute, attribute_value)
		}
	}
}

export const ReactiveFragment_Render_Factory = (ctx: Context) => {
	return class ReactiveFragment_Render extends ReactiveComponent_Render_Factory(ctx) {
		test(tag: any, props?: any): boolean { return tag === Fragment }

		// @ts-ignore: we are breaking subclassing inheritance rules by having `tag: Fragment` as the first argument instead of `component: ComponentGenerator`
		h(tag: Fragment, props?: null, ...children: (string | Node)[]): Element[] {
			return super.h(FragmentTagComponent, {}, ...children)
		}
	}
}

