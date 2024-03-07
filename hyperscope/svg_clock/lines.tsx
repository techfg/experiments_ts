/** @jsx h */
/** @jsxFrag Fragment */
import { ATTRS, FragmentComponentGenerator } from "../mod.ts"
import { Fragment, h } from "./deps.ts"
import { Hand } from "./hands.tsx"

type LinesProps = {
	numberOfLines: number
	class: string
	length: number
	width: number
}

const rotate = (index: number, length: number) => `rotate(${(360 * index) / length})`

export const Lines: FragmentComponentGenerator<LinesProps> = (props: LinesProps): HTMLElement[] => {
	const { class: cls, numberOfLines, ...rest } = props
	return Array(numberOfLines).fill(undefined).map((_, index) => {
		return <Hand rotate={rotate(index, numberOfLines)} {...{ ...rest, [ATTRS]: { class: cls } }} fixed={true} />
	})
}
