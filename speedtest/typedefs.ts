export interface WsJsonMessage {
	kind: string
}

export interface WsJsontimedMessage extends WsJsonMessage {
	time: number
}

export interface WsInitDownlinkTest extends WsJsontimedMessage {
	kind: "downlink"
	/** specify the number of bytes the sever must send to the client. */
	size: number
}

export interface WsInitUplinkTest extends WsJsontimedMessage {
	kind: "uplink"
	/** specify the number of bytes the client must send to the server. */
	size: number
}
