import { route, serveDir, serveFile, type Route } from "jsr:@std/http@1.0.3"
import { pathResolve, port, rootDir } from "./deps.ts"
import { WebSocketCommunicator } from "./funcdefs.ts"
import type { WsInitDownlinkTest } from "./typedefs.ts"


const routes: Route[] = [
	{
		pattern: new URLPattern({ pathname: "/downlink", protocol: "http" }),
		handler: async (request: Request) => {
			console.log("[ws-get] \"/downlink\"")
			// the client must use the websocket protocol, which is "ws://".
			// if the client tries to connect with an invalid protocol, such as "http://",
			// then let the client know and refuse their request.
			if (request.headers.get("upgrade") != "websocket") {
				return new Response("please use websocket protocol only! (\"ws://example.com/downlink\")", { status: 400 })
			}
			const { socket: downlink_socket, response } = Deno.upgradeWebSocket(request)
			downlink_socket.binaryType = "arraybuffer"
			downlink_socket.addEventListener("open", () => { console.log("[ws:downlink] client connected") })
			// we must NOT await for the creation of the websocket first.
			// instead we MUST send our `response` to the client first so that the client THEN proceeds to wanting to establish a web socket connection.
			WebSocketCommunicator.create<ArrayBuffer>(downlink_socket).then((downlink_communicator) => {
				downlink_communicator.addJsonReceiver("downlink", (comm, message: WsInitDownlinkTest) => {
					// generate binary data of `size` number of bytes, filled with `1`s
					const
						{ kind, size, time } = message,
						data = new Uint8Array(size).fill(1)
					try {
						// send the binary data to the client
						comm.sendBinary(data)
						console.log("[downlink] data sending timestamp:", Date.now())
						console.log(`[downlink] "${size / 1024 ** 2} mb" of data sent to the client`)
					} catch (error) {
						console.error("[downlink] socket error:", error)
					} finally {
						// close the websocket connection
						// ws.close()
						// console.log("connection closed")
					}
				})
			})
			downlink_socket.onclose = () => { console.log("[ws:downlink] client disconnected") }
			downlink_socket.onerror = (event) => { console.log("[ws:downlink] encountered error:", event) }
			return response
		}
	},
	{
		pattern: new URLPattern({ pathname: "/" }),
		handler: (request: Request) => {
			console.log(`[http-get] "/index.html"`)
			return serveFile(request, pathResolve(rootDir, "./index.html"))
		}
	},
	{
		pattern: new URLPattern({ pathname: "/*" }),
		handler: (request: Request) => {
			console.log(`[http-get] "/${request.url}"`)
			return serveDir(request, { fsRoot: pathResolve(rootDir) })
		}
	},
]

const default_route = (_req: Request) => {
	return new Response("requested http not found", { status: 404 })
}

const webserver = Deno.serve({ port }, route(routes, default_route))
console.log(`WebServer is running on "https://localhost:${port}"`)
console.log(`WebSocket is running on "ws://localhost:${port}/downlink"`)

