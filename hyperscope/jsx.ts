/** a minimal implementation of `JSX.IntrinsicElements` to get syntax highlighting in your `.jsx` and `.tsx` files. <br>
 * to use this, and banish all the red error lines under your jsx blocks, simply import this file.
 * 
 * @example
 * ```tsx
 * import { } from "./path/to/hyperscope/jsx.ts"
 * 
 * const my_div = <div>
 * 	<span>Hello</span>
 * 	<span>World!!</span>
 * </div>
 * ```
 * 
 * @module
*/


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
