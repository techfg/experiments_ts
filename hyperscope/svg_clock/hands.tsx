/** @jsx h */
/** @jsxFrag Fragment */
import { ComponentGenerator } from "../mod.ts"
import { Accessor, Fragment, h, stringify } from "./deps.ts"

type HandProps = {
	rotate: string | Accessor<string>
	length: number
	width: number
	fixed?: boolean
}

export const Hand: ComponentGenerator<HandProps> = (props: HandProps) => {
	const { rotate, length, width, fixed } = props
	return <line
		y1={stringify(fixed ? length - 95 : undefined) ?? "0"}
		y2={stringify(-(fixed ? 95 : length)) ?? "0"}
		stroke="currentColor"
		stroke-width={width}
		stroke-linecap="round"
		transform={rotate}
	/>
}
