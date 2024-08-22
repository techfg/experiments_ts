/** dependencies of the client code. */

export { InlineHyperZone } from "https://raw.githubusercontent.com/omar-azmi/hzone_ts/main/src/mod.ts"
export { TsignalComponentRender, TsignalFragmentRender, TsignalHTMLRender } from "https://raw.githubusercontent.com/omar-azmi/hzone_ts/main/src/tsignal/mod.ts"
export { Context, MemoSignal_Factory, StateSignal_Factory } from "jsr:@oazmi/tsignal@0.4.0"
export const domainName = globalThis.location?.host as string
