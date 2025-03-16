/// <reference lib="webworker" />

// @ts-ignore: only possible through a bundler
import demoFileRelativePath from "./demo_file.txt"

const
	demoFileUrl = new URL(import.meta.resolve(demoFileRelativePath)),
	demoText = await (await fetch(demoFileUrl)).text()

let first_time = true

self.addEventListener("message", (event) => {
	self.postMessage(first_time
		? `demo worker says: ${demoText}`
		: `demo worker is now spamming: ${demoText}`
	)
	first_time = false
})
