type AttributeKey = string
interface Attributes {
	[key: AttributeKey]: string
}

type IntrinsicHTMLElements = { [tagName in keyof HTMLElementTagNameMap]: Attributes }
type IntrinsicSVGElements = { [tagName in keyof SVGElementTagNameMap]: Attributes }

declare global {
	export namespace JSX {
		export type IntrinsicElements = IntrinsicHTMLElements & IntrinsicSVGElements
	}
}
