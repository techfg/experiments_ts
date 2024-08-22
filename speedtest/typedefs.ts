export interface WsJsonMessage {
	kind: string
}

export interface WsJsontimedMessage extends WsJsonMessage {
	time: number
}

export interface WsInitUplinkTest extends WsJsontimedMessage {
	kind: "uplink"
	/** specify the number of bytes the client must send to the server. */
	size: number
}
