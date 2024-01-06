import { SRecord, SPrimitive, SHeadArray, SHeadPrimitive, SArray, Decoded, sum, concatBytes, base64BodyToBytes, decode_str } from "./deps.ts"


/** see "header_type_flag" in following resource:
 * - [xiph.org](https://www.xiph.org/ogg/doc/framing.html#page_header)
 * there are three bitflags, lets say [z, y, x], presented as 0bzyx.
 * each bitflag carries the following meaning when either set (`true`) or unset (`false`):
 * - `x`: "continuation of stream"
 *    - `x == 1`: a continuation of the previous packet in the logical bitstream.
 *    - `x == 0`: a fresh packet.
 * - `y`: "beginning of stream" this flag must be set on the first page of every logical bitstream, and must not be set on any other page.
 *    - `y == 1`: this is the first page of a logical bitstream.
 *    - `y == 0`: not first page of logical bitstream.
 * - `z`: "end of stream". this flag must be set on the final page of every logical bitstream, and must not be set on any other page.
 *    - `z == 1`: this is the last page of logical bitstream.
 *    - `z == 0`: not last page of logical bitstream.
*/
type HeaderTypeFlag_u1 =
	| 0b000
	| 0b001
	| 0b010
	| 0b011
	| 0b100
	| 0b101
	| 0b110
	| 0b111

/** see the following resource for specifications:
 * - [wiki.xiph.org](https://wiki.xiph.org/Ogg#Ogg_page_format)
 * - [xiph.org](https://www.xiph.org/ogg/doc/framing.html#page_header)
*/
type OggPage_type = {
	/** `type: "str"` <br> the magic 4_bytes associated with the ".ogg" file format. */
	magic: string & "OggS"
	/** `type: "u1"` <br> version of the ".ogg" specification. always `0`. */
	version: number & 0x00
	/** `type: "u1"` <br> */
	flag: HeaderTypeFlag_u1
	/** `type: "u8"` <br> codec specific instruction */
	granule_position: Uint8Array
	/** `type: "u4l"` <br> */
	serial_number: number
	/** `type: "u4l"` <br> this is a monotonically increasing field for each logical bitstream. the first page is 0, the second 1, etc... */
	page_number: number
	/** `type: "u4l"` <br> crc32 checksum of the data in the entire page. read specifics on wikipedia "https://en.wikipedia.org/wiki/Ogg#Metadata:~:text=has%20been%20lost.-,Checksum,-%E2%80%93%2032%20bits" */
	checksum: number
	/** `type: "u1"` <br> indicates the number of segments that exist in this page. it also specifies the size of the `segment_table` u1_array that follows. I think this value should always at least be `1` */
	// segment_table_length: number
	/** `type: "u1[]"` <br> an array of 8-bit values, each indicating the bytelength of the corresponding segments within the current page body.
	 * the values within this array determine the total bytelength of the data segments proceeding.
	 * if a certain segment is said to be of bytelength in `range(0, 255)`, then that packet will end after that many bytes, and the next packet will then begin after it.
	 * if a certain segment is said to be of bytelength `255`, then the segment following it should be a part of the current packet.
	 * if the last segment (last item in the array) has a bytelength of `255`, then it indicates that the last packet continues over to the next page, and so the next page's {@link OggPage_type.flag} will be `0b001` to indicate continuation.
	 * 
	 * - example 1: if `segment_table = [255, 255, 255, 70]`:
	 *    - then it would mean that there is one packet in this page.
	 *    - the total bytes carried in this page is: `255 + 255 + 255 + 70 = 835`, and also equals the packet's bytelength.
	 *    - after `835` bytes, you will encounter the next new fresh page ({@link OggPage_type}), starting with its magic signature "OggS".
	 * - example 2: if `segment_table = [255, 35, 255, 70]`:
	 *    - then it would mean that there are two packets in this page.
	 *      - the first carries `255 + 35 = 290` bytes, and is complete.
	 *      - the second carries `255 + 70 = 325` bytes, and is complete.
	 *    - the total bytes carried in this page is: `255 + 35 + 255 + 70 = 615`.
	 *    - after `615` bytes, you will encounter the next new fresh page ({@link OggPage_type}), starting with its magic signature "OggS".
	 * - example 3: if `segment_table = [255, 35, 255, 255]`:
	 *    - then it would mean that there are two packets in this page.
	 *      - the first carries `255 + 35 = 290` bytes, and is complete.
	 *      - the second carries `255 + 255 = 510` bytes, but is incomplete and will be carried over to the next page.
	 *    - the total bytes carried in this page is: `255 + 35 + 255 + 255 = 800`.
	 *    - after `800` bytes, you will encounter the next continuation page ({@link OggPage_type}). this time, the next page's {@link OggPage_type.flag} will be `0b001` to indicate continuation.
	 * 
	 * see the following for reference: [wikipedia.org](https://en.wikipedia.org/wiki/Ogg#Page_structure:~:text=any%20one%20page.-,Segment,-table)
	*/
	segment_table: number[]
	/** size of the content is known after parsing and summing up {@link OggPage_type.segment_table | this page's segment_table} */
	content: Uint8Array //OggMetadata_type
}

interface OggFirstPage_type extends OggPage_type {
	/** `type: "u1"` <br> we always start the file with a "beginning of stream" page type flag */
	flag: 0b010
	/** `type: "u8"` <br> generally `0` for the first page block */
	granule_position: Uint8Array
	/** `type: "u4l"` <br> the first page is 0, the second 1, etc... */
	page_number: 0
}

interface OggLastPage_type extends OggPage_type {
	/** `type: "u1"` <br> we always end the file with an "end of stream" page type flag */
	flag: 0b100
}

interface Packet_type {
	content: Uint8Array
}

class OggFile extends SArray<OggPage> {
	constructor() {
		super(new OggPage())
	}

	override decode(buf: Uint8Array, offset: number) {
		const
			output: Array<OggPage_type> = [],
			flag_endofstream_bitmask = 0b100
		let
			total_bytesize = 0,
			is_last_page = false
		while (!is_last_page) {
			const [oggpage, bytesize] = this.decodeNext(buf, offset + total_bytesize)
			output.push(oggpage)
			total_bytesize += bytesize
			if ((oggpage.flag & flag_endofstream_bitmask) > 0) {
				// this is the last page of this file
				is_last_page = true
			}
		}
		return [output, total_bytesize] as Decoded<Array<OggPage_type>>
	}

	static toPackets(pages: Array<OggPage_type>): Array<Packet_type> {
		const
			output: Array<Packet_type> = [],
			flag_continuationofstream_bitmask = 0b001
		for (const { flag, segment_table, content } of pages) {
			const packet_bytesizes = segment_table.reduce((packet_bytesizes, segment_bytelength) => {
				if (segment_bytelength < 255) { packet_bytesizes.push(segment_bytelength) }
				else {
					const prev_packet_bytesize = (packet_bytesizes.pop() ?? 0) + segment_bytelength
					packet_bytesizes.push(prev_packet_bytesize)
				}
				return packet_bytesizes
			}, [] as number[])
			let segment_offset = 0
			const packets_in_page: Array<Packet_type> = packet_bytesizes.map((packet_bytesize) => {
				const packet_content = content.slice(segment_offset, segment_offset + packet_bytesize)
				segment_offset += packet_bytesize
				return { content: packet_content }
			})
			if ((flag & flag_continuationofstream_bitmask) > 0) {
				// this is page is a continuation of the previous one. thus the first packet contents must be merged with the previous partial packet
				const
					prev_partial_packet = output.pop()!,
					continuation_of_partial_packet = packets_in_page.shift()!
				prev_partial_packet.content = concatBytes(prev_partial_packet.content, continuation_of_partial_packet.content)
				output.push(prev_partial_packet)
			}
			output.push(...packets_in_page)
		}
		return output
	}
}

class OggPage extends SRecord<OggPage_type> {
	constructor() {
		super(
			new SPrimitive("str", "OggS", [4]).setName("magic"),
			new SPrimitive("u1", 0x00).setName("version"),
			new SPrimitive("u1", 0x02).setName("flag"),
			new SPrimitive("bytes", Uint8Array.from(Array(8).fill(0)), [8]).setName("granule_position"),
			new SPrimitive("u4l").setName("serial_number"),
			new SPrimitive("u4l").setName("page_number"),
			new SPrimitive("u4l").setName("checksum"),
			new SHeadPrimitive<"u1", number[], "u1[]">("u1", "u1[]").setName("segment_table"),
			new SPrimitive("bytes").setName("content"),
			// new OggMetadata().setName("content"),
		)
	}
	override decode(buf: Uint8Array, offset: number) {
		const
			[partial1, bytesize1] = super.decode(buf, offset, 0, 8),
			content_bytesize = sum(partial1.segment_table)
		this.children[8].setArgs(content_bytesize)
		const [partial2, bytesize2] = super.decode(buf, offset + bytesize1, 8)
		return [{ ...partial1, ...partial2 }, bytesize1 + bytesize2] as Decoded<OggPage_type>
	}
}

interface OggMetadata_type {
	kind: "OpusHead" | "OpusTags"
	[key: string]: any
}


class OggMetadata extends SRecord<OggMetadata_type> {
	constructor() {
		super(
			new SPrimitive("str", undefined, [8]).setName("kind"),
		)
	}

	override decode(buf: Uint8Array, offset: number): Decoded<OggMetadata_type> {
		const
			[{ kind }, bytesize1] = super.decode(buf, offset, 0, 1),
			data_schema =
				kind === "OpusHead" ? new OpusHead() :
					kind === "OpusTags" ? new OpusTags() :
						undefined
		if (data_schema === undefined) {
			throw Error("unidentified type of metadata kind (`OggMetadata.kind`): " + kind)
		}
		return data_schema.decode(buf, offset)
	}
}


/** see the following resource for specifications:
 * [wiki.xiph.org](https://wiki.xiph.org/OggOpus#ID_Header)
 * [opus-codec.org](https://opus-codec.org/docs/opusfile_api-0.7/structOpusHead.html)
*/
interface OpusHead_type extends OggMetadata_type {
	/** `type: "str"` <br> the magic 8_bytes associated with the opus header block. */
	kind: "OpusHead"
	/** `type: "u1"` <br> generally `1` in all modern encodings. */
	version: 0x00 | 0x01
	/** `type: "u1"` <br> specifies channel count, must be at least `1`. */
	channels: number
	/** `type: "u2l"` <br> number of samples that should be discarded from the beginning of the stream. a pre skip of at least `3840` (80ms) is recommended. */
	pre_skip: number
	/** `type: "u4l"` <br> sampling rate of the original input. all opus audio is encoded at 48khz. */
	sample_rate: 48000
	/** `type: "i2l"` <br> the gain to apply to the decoded output in units of decibles (dB). */
	output_gain: number
	channel_table: OpusChannelTable_type
}

class OpusHead extends SRecord<OpusHead_type> {
	constructor() {
		super(
			new SPrimitive("str", "OpusHead", [8]).setName("kind"),
			new SPrimitive("u1").setName("version"),
			new SPrimitive("u1").setName("channels"),
			new SPrimitive("u2l").setName("pre_skip"),
			new SPrimitive("u4l").setName("sample_rate"),
			new SPrimitive("u2l").setName("output_gain"),
			new OpusChannelTable().setName("channel_table") as any,
		)
	}
}

type OpusChannelTable_type = {
	/** `type: "u1"` <br>
	 * channel mapping family 0 covers mono or stereo in a single stream. channel mapping family 1 covers 1 to 8 channels in one or more streams. <br>
	 * if `family > 0`, then the remaining 3 fields following must be parsed, otherwise they shouldn't be parsed.
	*/
	family: 0 | 1 | 255
	/** `type: "u1"` <br> number of opus streams in each ogg packet. must be greater than `1`. */
	stream_count?: number
	/** `type: "u1"` <br> number of coupled opus streams in each ogg packet, in `range(0, 128)`. */
	coupled_count?: number
	/** `type: "u1[]"` <br> length of this u1_array is equal to the {@link OpusHead_type.channels | channel count}. specifies which output device should be playing which channel. */
	mapping?: number[]
}

class OpusChannelTable extends SRecord<OpusChannelTable_type> {
	/** `args[0]` must equal the number of channels in the audio, specified in {@link OpusHead_type.channels | channel count}. */
	declare args: [channels: number]

	constructor(family?: OpusChannelTable_type["family"], channels?: OpusHead_type["channels"]) {
		super(
			new SPrimitive("u1").setName("family"),
			new SPrimitive("u1").setName("stream_count"),
			new SPrimitive("u1").setName("coupled_count"),
			new SPrimitive("u1[]").setName("mapping"),
		)
		if (family !== undefined) { this.children[0].value = family }
		if (channels !== undefined) { this.children[3].setArgs(channels) }
	}

	override encode(value: OpusChannelTable_type, ...args: [channels: number]): Uint8Array {
		const channels = args[0]
		if (value.family > 0 && value.mapping!.length !== channels) {
			console.warn(
				"`OpusChannelTable.mapping` has a mismatching number of channels listed\n",
				"expected:", channels, "channels\n",
				"received:", value.mapping!.length, "channels\n",
			)
			value.mapping = [...value.mapping!.slice(0, channels), ...Array(value.mapping!.length - channels).fill(0)]
		}
		return value.family <= 0 ?
			super.encode(value, 0, 1) :
			super.encode(value)
	}

	override decode(buf: Uint8Array, offset: number, ...args: [channels: number]): Decoded<OpusChannelTable_type> {
		const
			channels = args[0],
			[{ family }, bytesize1] = super.decode(buf, offset, 0, 1)
		if (family <= 0) { return [{ family }, bytesize1] }
		this.children[3].setArgs(channels)
		const [rest_table, bytesize2] = super.decode(buf, offset + bytesize1, 1)
		return [{ ...rest_table, family }, bytesize2]
	}

}

interface OpusTags_type extends OggMetadata_type {
	/** `type: "str"` <br> the magic 8_bytes associated with the opus comment block. */
	kind: "OpusTags"
	comment: VorbisComment_type
}

class OpusTags extends SRecord<OpusTags_type> {
	constructor() {
		super(
			new SPrimitive("str", "OpusTags", [8]).setName("kind"),
			new VorbisComment().setName("comment")
		)
	}
}

/** see the following resource for specifications:
 * [wiki.xiph.org](https://wiki.xiph.org/OggOpus#ID_Header)
 * [opus-codec.org](https://opus-codec.org/docs/opusfile_api-0.7/structOpusTags.html)
*/
type VorbisComment_type = {
	/** `type: "u4l"` <br> indicates the bytelength of the `vendor_name` string. */
	// vendor_name_length: number
	vendor_name: string
	/** `type: "u4l"` <br> indicates the number of `entries` in the comment. */
	// entries_length: number
	entries: VorbisCommentEntry_type[]

}

class VorbisComment extends SRecord<VorbisComment_type> {
	constructor() {
		super(
			new SHeadPrimitive("u4l", "str").setName("vendor_name") as any,
			new SHeadArray("u4l",
				new SHeadPrimitive("u4l", "str")
			).setName("entries"),
		)
	}
}

type VorbisCommentEntry_type = {
	/** `type: "u4l"` <br> indicates the string length the comment entry. */
	// length: number
	// content: string
}

/** this here is the format of the decoded picture stream.
 * the specification of the decoded stream lies here: [xiph.org](https://xiph.org/flac/format.html#metadata_block_picture).
 * this format is encoded via base64 encoding, and then the resulting string is embedded into the ogg file as a comment proceeding "metadata_block_picture".
 * note that in the embdded format, the stream of the base64 string may get broken in between due to {@link OggPage_type}.
 * the bytes occupied by these annoying in-between headers do not count towards the bytelength specified before the "metadata_block_picture" ({@link VorbisCommentEntry_type})
*/
interface VorbisCommentEntry_Picture_type extends VorbisCommentEntry_type {
	/** `type: "u4b"` <br> the type of picture. must be in `range(0,21)`. */
	cover_type: number
	/** `type: "u4b"` <br> bytelength of `mime` string. */
	// mime_length: number
	/** `type: "str"` <br> dictates the mime string of the encoded picture data. */
	mime: string
	/** `type: "u4b"` <br> bytelength of `description` string. */
	// description_length: number
	/** `type: "str"` <br> description of this picture. */
	description: string
	/** `type: "u4b"` <br> width of picture. */
	width: number
	/** `type: "u4b"` <br> height of picture. */
	height: number
	/** `type: "u4b"` <br> color depth of picture in "bits per pixel" units. so it's "24" for RGB and "32" for RGBA images. */
	depth: number
	/** `type: "u4b"` <br> number of colors used for indexed images (such as ".gif"). if the image is not color indexed (which is likely), then it should be `0`. */
	colors: number
	/** `type: "u4b"` <br> bytelength of `data`. */
	// data_length: number
	/** `type: "u1[]"` <br> binary data of the image. */
	data: Uint8Array
}

class VorbisCommentEntry_Picture extends SRecord<VorbisCommentEntry_Picture_type> {
	constructor() {
		super(
			new SPrimitive("u4b").setName("cover_type"),
			new SHeadPrimitive("u4b", "str").setName("mime") as any,
			new SHeadPrimitive("u4b", "str").setName("description") as any,
			new SPrimitive("u4b").setName("width"),
			new SPrimitive("u4b").setName("height"),
			new SPrimitive("u4b").setName("depth"),
			new SPrimitive("u4b").setName("colors"),
			new SHeadPrimitive("u4b", "bytes").setName("data") as any,
		)
	}
}

const a = new OggFile()
const b = a.decode(await Deno.readFile("./music.ogg"), 0)[0]
const oggpackets = OggFile.toPackets(b)
// console.debug(OggFile.toPackets(b)) //.filter((v) => { return v.content.length < 4080 }))
const c = new OpusHead().decode(oggpackets[0].content, 0)[0]
const d = new OpusTags().decode(oggpackets[1].content, 0)[0]
console.log(c)
console.log(d)
const metadata_block_picture = base64BodyToBytes((d.comment.entries[2] as string).split("=", 2)[1])
const e = new VorbisCommentEntry_Picture().decode(metadata_block_picture, 0)[0]
console.log(e)
// console.log(decode_str(e.data, 0))
await Deno.writeFile("./image.png", e.data)


