/** @jsx h */
/** @jsxFrag Fragment */

import { clientInitDownlinkSock, urlPathname, type WsInitDownlinkTest } from "./common/downlink.ts"
import { Context, InlineHyperZone, MemoSignal_Factory, StateSignal_Factory, TsignalComponentRender, TsignalFragmentRender, TsignalHTMLRender } from "./deps_client.ts"
import type { Sock } from "./funcdefs.ts"


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


const init_downlink_sock = async (): Promise<Sock<ArrayBuffer>> => {
	const downlink_sock = await clientInitDownlinkSock(urlPathname, (stats) => {
		const mb_size = stats.size / (1024 ** 2)
		console.log("receiving timestamp:", stats.time)
		console.log(`received "${mb_size} mb" of TCP data from the server`)
		set_downlink_speed(mb_size)
	})
	return downlink_sock
}

const requestDownlink = async (byte_size: number) => {
	const
		sock = await init_downlink_sock(),
		message: WsInitDownlinkTest = { kind: "downlink", size: byte_size, time: Date.now() }
	sock.expectBinaryKind("downlink-data")
	sock.sendJson(message)
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
		requestDownlink(get_downlink_size_mb() * 1024 ** 2)
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

