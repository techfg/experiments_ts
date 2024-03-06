import { Accessor, Context, EffectSignal_Factory } from "jsr:@oazmi/tsignal"
import { isFunction } from "./deps.ts"
import { ComponentGenerator, Component_Render, Fragment, FragmentTagComponent } from "./mod.ts"

const stringify = (value: any): string | null => {
	const is_null = value === null || value === undefined
	return is_null ? null : value.toString()
}

const isAccessor = isFunction as ((obj: any) => obj is Accessor<any>)

export const ReactiveComponent_Render_Factory = (ctx: Context) => {
	const createEffect = ctx.addClass(EffectSignal_Factory)

	return class ReactiveComponent_Render<G extends ComponentGenerator = ComponentGenerator> extends Component_Render<G> {
		protected addAttr(element: Element, attribute_name: string, attribute_value: any): void {
			const attr = document.createAttribute(attribute_name)
			if (isAccessor(attribute_value)) {
				createEffect((id) => {
					const
						old_value = attr.nodeValue,
						new_value = attribute_value(id)
					attr.nodeValue = stringify(new_value)
					if (new_value === null && old_value !== null) {
						(attr.ownerElement ?? element).removeAttributeNode(attr)
					} else if (new_value !== null && old_value === null) {
						element.setAttributeNode(attr)
					}
					return new_value === old_value
				}, { defer: false })
				// element.setAttributeNode(attr) // this is redundant, since the attribute starts with a `null` value
			} else {
				super.addAttr(element, attribute_name, attribute_value)
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

export const ReactiveFragment_Render_Factory = (ctx: Context) => {
	return class ReactiveFragment_Render extends ReactiveComponent_Render_Factory(ctx) {
		test(tag: any, props?: any): boolean { return tag === Fragment }

		// @ts-ignore: we are breaking subclassing inheritance rules by having `tag: Fragment` as the first argument instead of `component: ComponentGenerator`
		h(tag: Fragment, props?: null, ...children: (string | Node)[]): Element[] {
			return super.h(FragmentTagComponent, {}, ...children)
		}
	}
}
