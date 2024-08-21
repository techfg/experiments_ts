import { route, serveDir, serveFile, type Route } from "jsr:@std/http@1.0.3"
import { resolve as pathResolve } from "jsr:@std/path@1.0.2"

const root_dir = pathResolve(Deno.cwd(), "./speedtest/")
const port = 8000

const wsHandleDownlink = (ws: WebSocket, byte_size: number) => {
	// generate binary data of `byte_size` number of bytes, filled with `1`s
	const data = new Uint8Array(byte_size).fill(1)
	try {
		// send the binary data to the client
		ws.send(data)
		console.log("[downlink] data sending timestamp:", Date.now())
		console.log(`[downlink] "${byte_size / 1024 ** 2} mb" of data sent to the client`)
	} catch (error) {
		console.error("[downlink] socket error:", error)
	} finally {
		// close the websocket connection
		// ws.close()
		// console.log("connection closed")
	}
}

const routes: Route[] = [
	{
		pattern: new URLPattern({ pathname: "/downlink", protocol: "http" }),
		handler: (request: Request) => {
			console.log("[ws-get] \"/downlink\"")
			// the client must use the websocket protocol, which is "ws://".
			// if the client tries to connect with an invalid protocol, such as "http://",
			// then let the client know and refuse their request.
			if (request.headers.get("upgrade") != "websocket") {
				return new Response("please use websocket protocol only! (\"ws://example.com/downlink\")", { status: 400 })
			}
			const
				{ socket, response } = Deno.upgradeWebSocket(request),
				byte_size = parseInt(new URL(request.url).searchParams.get("size") ?? (64 * 1024 ** 2).toString())
			socket.onopen = () => {
				console.log("[ws:downlink] client connected")
				wsHandleDownlink(socket, byte_size)
			}
			socket.onclose = () => { console.log("[ws:downlink] client disconnected") }
			socket.onerror = (error_event) => { console.error("[ws:downlink] encountered error:", error_event) }
			return response
		}
	},
	{
		pattern: new URLPattern({ pathname: "/" }),
		handler: (request: Request) => {
			console.log(`[http-get] "/index.html"`)
			return serveFile(request, pathResolve(root_dir, "./index.html"))
		}
	},
	{
		pattern: new URLPattern({ pathname: "/*" }),
		handler: (request: Request) => {
			console.log(`[http-get] "/${request.url}"`)
			return serveDir(request, { fsRoot: pathResolve(root_dir) })
		}
	},
]

const default_route = (_req: Request) => {
	return new Response("requested http not found", { status: 404 })
}

const webserver = Deno.serve({ port }, route(routes, default_route))
console.log(`WebServer is running on "https://localhost:${port}"`)
console.log(`WebSocket is running on "ws://localhost:${port}/downlink"`)

