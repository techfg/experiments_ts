import { route, serveDir, serveFile, type Route } from "jsr:@std/http@1.0.3"
import { serverInitDownlinkSock } from "./common/downlink.ts"
import { pathResolve, port, rootDir } from "./deps_server.ts"


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
			// we must NOT await for the creation/establishment of an open websocket first.
			// instead we MUST send our `response` to the client first so that the client THEN proceeds to wanting to establish a web socket connection.
			serverInitDownlinkSock(downlink_socket)
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

