import { domainName } from "../deps_client.ts"
import { Sock } from "../funcdefs.ts"
import type { WsJsontimedMessage } from "../typedefs.ts"

export interface WsInitDownlinkTest extends WsJsontimedMessage {
	kind: "downlink"
	/** specify the number of bytes the sever must send to the client. */
	size: number
}

export interface DownlinkStats {
	/** the time when the server had sent its data. */
	t0?: number
	/** the time when all data was received. */
	time: number
	/** the number of bytes downloaded from the sever. */
	size: number
}

type DownlinkStatsCallback = (stats: DownlinkStats) => void

export const urlPathname = "/downlink"
// TODO: in the future, we must reuse one socket for both downlink and uplink, and other communications.
// thus we will need to place `client_downlink_sock` in `./socket.ts` and rename it to `clientLinkSocket`.
// in addition, I will change the `urlPathname` to `"/link"` so it is not just tied to downlink, but also uplink.
// finally, the `clientInitDownlinkSock` function will consume `clientLinkSocket` instead of a `path`, similar to `serverInitDownlinkSock`.
let client_downlink_sock: Sock<ArrayBuffer> | undefined
export const clientInitDownlinkSock = async (path: string = urlPathname, stats_callback?: DownlinkStatsCallback): Promise<Sock<ArrayBuffer>> => {
	const url = new URL(path, "ws://" + domainName!)
	// if the current socket is not connected or if its url is different from the current `url`, then close the previous one and create a new one
	if (client_downlink_sock?.socket.url !== url.toString()) {
		const downlink_socket = new WebSocket(url)
		// both "arraybuffer" and "blob" take about the same time to be processed (blob is maybe 1% faster).
		// therefore, use whichever one is suitable for your programming pattern (i.e. if async, then go for blob, otherwise pick arraybuffer)
		downlink_socket.binaryType = "arraybuffer"
		downlink_socket.addEventListener("open", () => { console.log("[ws:downlink] new socket connected") })
		downlink_socket.onclose = () => { console.log("[ws:downlink] socket closed") }
		downlink_socket.onerror = (event) => { console.log("[ws:downlink] socket error:", event) }
		client_downlink_sock = await Sock.create<ArrayBuffer>(downlink_socket)
	}
	client_downlink_sock.addBinaryReceiver("downlink-data", (sock, data) => {
		const
			time = Date.now(),
			size = data.byteLength
		stats_callback?.({ size, time })
	})
	return client_downlink_sock
}

export const serverInitDownlinkSock = async (socket: WebSocket) => {
	socket.binaryType = "arraybuffer"
	socket.addEventListener("open", () => { console.log("[ws:downlink] client connected") })
	socket.onclose = () => { console.log("[ws:downlink] client disconnected") }
	socket.onerror = (event) => { console.log("[ws:downlink] socket error:", event) }
	const server_downlink_sock = await Sock.create<ArrayBuffer>(socket)
	server_downlink_sock.addJsonReceiver("downlink", (sock, message: WsInitDownlinkTest) => {
		// generate binary data of `size` number of bytes, filled with `1`s
		const
			{ kind, size, time } = message,
			data = new Uint8Array(size).fill(1)
		try {
			// send the binary data to the client
			sock.sendBinary(data)
			console.log("[downlink] data sending timestamp:", Date.now())
			console.log(`[downlink] "${size / 1024 ** 2} mb" of data sent to the client`)
		} catch (error) {
			console.error("[downlink] socket establishment error:", error)
		}
	})
}

