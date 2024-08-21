/** @jsx h */
/** @jsxFrag Fragment */

import { InlineHyperZone } from "https://raw.githubusercontent.com/omar-azmi/hzone_ts/main/src/mod.ts"
import { TsignalComponentRender, TsignalFragmentRender, TsignalHTMLRender } from "https://raw.githubusercontent.com/omar-azmi/hzone_ts/main/src/tsignal/mod.ts"
import { Context, MemoSignal_Factory, StateSignal_Factory } from "jsr:@oazmi/tsignal@0.4.0"

const domain_name = globalThis.location.host

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory)

const
	fragment_renderer = new TsignalFragmentRender({ ctx: ctx as any }),
	component_renderer = new TsignalComponentRender({ ctx: ctx as any }),
	html_renderer = new TsignalHTMLRender({ ctx: ctx as any })

const { h, Fragment, pushZone, popZone } = InlineHyperZone.create({
	default: [
		html_renderer,
		component_renderer,
		fragment_renderer,
	]
})

let downlink_socket: WebSocket | undefined
const request_downlink = (byte_size: number, config?: { path?: string }) => {
	const
		{ path = "downlink" } = config ?? {},
		url = new URL(
			path + "?" + new URLSearchParams({ size: byte_size.toString() }),
			"ws://" + domain_name,
		)
	// url.protocol = "ws"
	// if the current socket's url search query is different from the current `url`'s search query, then close the previous one and create a new one
	if (downlink_socket?.url !== url.toString()) {
		downlink_socket?.close()
		downlink_socket = new WebSocket(url)
		// both "arraybuffer" and "blob" take about the same time to be processed.
		// therefore, use whichever one is suitable for your programming pattern (i.e. if async, then go for blob, otherwise pick arraybuffer)
		downlink_socket.binaryType = "arraybuffer"
		downlink_socket.onopen = () => { console.log("[downlink] new socket connected") }
		downlink_socket.onclose = () => { console.log("[downlink] previous socket closed") }
		downlink_socket.onerror = (event) => { console.log("[downlink] socket error:", event) }
		downlink_socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
			const
				timestamp = Date.now(),
				mb_size = event.data.byteLength / (1024 ** 2)
			console.log("receiving timestamp:", timestamp)
			console.log(`received "${mb_size} mb" of TCP data from the server`)
			set_downlink_speed(mb_size)
		}
	}
}

const [, get_downlink_size_mb, set_downlink_size_mb] = createState(64)
const input_downlink_size_mb = <input
	type="number"
	set:valueAsNumber={get_downlink_size_mb}
	on:change={(event: InputEvent) => {
		const
			elem = event.currentTarget as HTMLInputElement,
			size_mb = elem.valueAsNumber
		if (isFinite(size_mb)) { set_downlink_size_mb(size_mb) }
	}}
/>

const button_test_speed = <button
	on:click={(mouse_event: MouseEvent) => {
		request_downlink(get_downlink_size_mb() * 1024 ** 2)
	}}
>
	Perform Downlink <br />
	Speed Test
</button>

const [, get_downlink_speed, set_downlink_speed] = createState(0)
const span_result_downlink_speed = <span>
	{get_downlink_speed} Mbps
</span>

const app = <div>
	{input_downlink_size_mb}
	{button_test_speed}
	{span_result_downlink_speed}
</div>

document.body.append(app)

