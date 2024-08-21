import { resolve as pathResolve } from "jsr:@std/path@1.0.2"

export const
	rootDir = pathResolve(Deno.cwd(), "./speedtest/"),
	port = 8000

export { pathResolve }

