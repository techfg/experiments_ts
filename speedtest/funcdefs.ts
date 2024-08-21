import type { WsJsonMessage } from "./typedefs.ts"

export const wsSendJson = (socket: WebSocket & { readyStatus: 1 }, message: WsJsonMessage) => {
	socket.send(JSON.stringify(message))
}

export class WebSocketCommunicator<B extends ArrayBuffer | Blob = Blob> {
	socket: WebSocket
	protected jsonReceivers: { [kind: string]: <M extends WsJsonMessage>(socket_communicator: WebSocketCommunicator<any>, message: M) => void } = {}
	protected binaryReceivers: { [kind: string]: (socket_communicator: WebSocketCommunicator<B>, data: B) => void } = {}
	protected binaryReceiverNextKind?: string // keyof this["binaryReceivers"]

	constructor(socket: WebSocket) {
		this.socket = socket
		const { jsonReceivers, binaryReceivers } = this
		socket.addEventListener("message", (event: MessageEvent) => {
			const data = event.data
			if (typeof data === "string") {
				const message = JSON.parse(data) as WsJsonMessage
				jsonReceivers[message.kind](this, message)
			} else {
				const kind = this.binaryReceiverNextKind as string
				this.binaryReceiverNextKind = undefined
				binaryReceivers[kind](this, data)
			}
		})
	}

	sendJson(message: WsJsonMessage) {
		this.socket.send(JSON.stringify(message))
	}

	sendBinary(data: ArrayBufferLike | Blob | ArrayBufferView) {
		this.socket.send(data)
	}

	addJsonReceiver<M extends WsJsonMessage>(kind: string, handler: (socket_communicator: WebSocketCommunicator<any>, message: M) => void) {
		this.jsonReceivers[kind] = handler as any
	}

	addBinaryReceiver(kind: string, handler: (socket_communicator: WebSocketCommunicator<B>, data: B) => void) {
		this.binaryReceivers[kind] = handler
	}

	expectBinaryKind(kind: string) {
		this.binaryReceiverNextKind = kind
	}

	static async create<B extends ArrayBuffer | Blob = Blob>(websocket: WebSocket): Promise<WebSocketCommunicator<B>> {
		console.log("establishing socket")
		let
			ready_resolver: (value: true) => void,
			ready_rejector: (reason?: any) => void
		const ready = new Promise<boolean>((resolve, reject) => {
			ready_resolver = resolve
			ready_rejector = reject
		})
		console.log(websocket.readyState)
		switch (websocket.readyState) {
			case websocket.OPEN: { ready_resolver!(true); break }
			case websocket.CONNECTING: {
				// it is almost always the case with fast network connections that even though `websocket.readyState` is in CONNECTING state,
				// the socket has already connected and hence the "open" event has already fired, thereby nullifying our "open" event listener,
				// and hence our `ready` promise will never resolve.
				// this is why need to implement a polling mechanism that checks if the state has changed every 10ms.
				// FALSE: this turned out to be untrue, and instead it was an issue with the sequence of actions that I was taking.
				// basically, I should've sent my client the http response first, so that the client will begin to want to establish a socket connection,
				// only after that will the socket on the server side will be open.
				// otherwise, if we wait for the socket to open without telling the client that its request was processed successfully, then we'd be waiting forever, and so will our client.
				// const interval_id = setInterval(() => {
				// 	console.log("checking")
				// 	if (websocket.readyState === websocket.OPEN) {
				// 		clearInterval(interval_id)
				// 		ready_resolver!(true)
				// 	}
				// }, 1000)
				websocket.addEventListener("open", () => {
					// clearInterval(interval_id)
					ready_resolver!(true)
				})
				break
			}
			default: { ready_rejector!() }
		}
		await ready
		return new this(websocket)
	}
}
