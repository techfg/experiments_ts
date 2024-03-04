type AttributeKey = string | number
interface Attributes {
	key?: AttributeKey
}
// interface RefAttributes<T> extends Attributes {
// 	ref?: Ref<T>
// }
// interface ClassAttributes<T> extends Attributes {
// 	ref?: LegacyRef<T>
// }

type IntrinsicHTMLElements = { [tagName in keyof HTMLElementTagNameMap]: { [key: string]: string } }
type IntrinsicSVGElements = { [tagName in keyof SVGElementTagNameMap]: { [key: string]: string } }

declare global {
	export namespace JSX {
		export type IntrinsicElements = IntrinsicHTMLElements & IntrinsicSVGElements
	}
}
