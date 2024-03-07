/** @jsx h */
/** @jsxFrag Fragment */
import { ATTRS, AttrProps, EVENTS, EventProps } from "../mod.ts"
import { Clock } from "./clock.tsx"
import { Fragment, createMemo, createState, ctx, h, object_to_css_inline_style, stringify } from "./deps.ts"

let seconds_since_epoch_and_midnight = new Date().setHours(0, 0, 0, 0) / 1000
const getSecondsSinceMidnight = (): number => Date.now() / 1000 - seconds_since_epoch_and_midnight
let dt = 0
let time = getSecondsSinceMidnight()
const
	[idCurrentTime, getCurrentTime, setCurrentTime] = createState<number>(getSecondsSinceMidnight()),
	[, isTimeSlow, setTimeSlow] = createState(false),
	[, getDt] = createMemo((id) => {
		ctx.onInit(id, () => getCurrentTime(id))
		return dt
	}),
	[, getTime] = createMemo((id) => {
		return (time += getDt(id))
	})

const dispose = setInterval(requestAnimationFrame, 15, () => {
	setCurrentTime((prev_time) => {
		const current_time = getSecondsSinceMidnight()
		if (prev_time !== undefined) { dt = current_time - prev_time }
		if (isTimeSlow()) { dt /= 30 }
		return current_time
	})
})
ctx.onDelete(idCurrentTime, () => clearInterval(dispose))

let prev_timeout: undefined | number = undefined
const slow_down_time = <div style={object_to_css_inline_style({
	"display": "flex",
	"flex-direction": "column",
	"flex-wrap": "nowrap",
	"align-items": "stretch",
})}>
	<button {...{
		[EVENTS]: {
			click(event) {
				clearTimeout(prev_timeout)
				setTimeSlow((prev_value) => !prev_value)
				prev_timeout = setTimeout(() => setTimeSlow(false), 5000)
			}
		} as EventProps
	}}>
		!! ZA WARUDO ??!!
		<br />
		TOKYO WA TOMARE!!
	</button>
	<br />
	<button>ROADO ROLLAAA</button>
</div>

let time_input_element_is_focused = false
const time_input_element: HTMLInputElement = <input type="number" value={createMemo((id) => getTime(id), {
	equals: (v1, v2) => {
		const is_equal = v1 === v2
		if (!is_equal && isFinite(v2) && !time_input_element_is_focused && time_input_element) {
			time_input_element.value = stringify(v2)!
		}
		return is_equal
	}
})[1]} {...{
	[EVENTS]: {
		change(event) {
			time_input_element_is_focused = true
			const
				input_element = event.currentTarget as HTMLInputElement,
				seconds = input_element.valueAsNumber
			if (isFinite(seconds)) {
				seconds_since_epoch_and_midnight = Date.now() / 1000 - seconds
				// setCurrentTime()
			}
		},
		blur(event) { time_input_element_is_focused = false },
		focus(event) { time_input_element_is_focused = true },
	} as EventProps
}} />


const change_time = <div style={object_to_css_inline_style({
	"display": "flex",
	"flex-direction": "column",
	"flex-wrap": "nowrap",
	"align-items": "stretch",
})}>
	<span style="text-align: center;">change time</span>
	{time_input_element}
</div>

document.getElementById("root")!.append(
	<img src="./jotaro_kujo.jpg"></img>,
	<div style={object_to_css_inline_style({
		"display": "flex",
		"flex-direction": "column",
		"flex-wrap": "nowrap",
		"align-items": "stretch",
		"justify-content": "center",
		"width": "30vw",
	})}>
		{change_time}
		<Clock {...{
			getTime, [ATTRS]: {
				style: "align-self: center;"
			} as AttrProps
		}} />
		{slow_down_time}
	</div>,
	<img src="./dio_brando.jpg"></img>,
)
export { getCurrentTime, idCurrentTime, setCurrentTime }

