import { SRecord, SPrimitive, SHeadArray, SHeadPrimitive, SArray, Decoded } from "./deps.ts"

type HeaderTypeFlag_u1 =
	| 0x01 // "continuation of stream". continuation of the previous packet in the logical bitstream.
	| 0x02 // "beginning of stream". this flag must be set on the first page of every logical bitstream, and must not be set on any other page.
	| 0x04 // "end of stream". this flag must be set on the final page of every logical bitstream, and must not be set on any other page.

type OggHeader_type = {
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
	/** `type: "u1[]"` <br> an array of 8-bit values, each indicating the bytelength of the corresponding segment within the page body. this means that each segment can be a maximum of 255_bytes. */
	segment_table: number[]
	metadata: OggMetadata_type
}

interface OggFirstHeader_type extends OggHeader_type {
	/** `type: "u1"` <br> we always start the file with a "beginning of stream" header type flag */
	flag: 0x02
	/** `type: "u8"` <br> generally `0` for the first header block */
	granule_position: Uint8Array
	/** `type: "u4l"` <br> the first page is 0, the second 1, etc... */
	page_number: 0
}

interface OggLastHeader_type extends OggHeader_type {
	/** `type: "u1"` <br> we always end the file with an "end of stream" header type flag */
	flag: 0x04
}

class OggFile extends SArray<OggHeader> {
	constructor() {
		super(new OggHeader())
	}
}

class OggHeader extends SRecord<OggHeader_type> {
	constructor() {
		super(
			new SPrimitive("str", "OggS", [4]).setName("magic"),
			new SPrimitive("u1", 0x00).setName("version"),
			new SPrimitive("u1", 0x02).setName("flag"),
			new SPrimitive("bytes", Uint8Array.from(Array(8).fill(0)), [8]).setName("granule_position"),
			new SPrimitive("u4l").setName("serial_number"),
			new SPrimitive("u4l").setName("page_number"),
			new SPrimitive("u4l").setName("checksum"),
			new SHeadArray("u1", new SPrimitive("u1")).setName("segment_table"),
			new OggMetadata().setName("metadata"),
		)
	}

	/*
	override decode(buf: Uint8Array, offset: number) {
		const [chunk_a, bytesize_a] = super.decode(buf, offset, 0, 2)
		this.children[2].setArgs(chunk_a["chunk_length"])
		const [chunk_b, bytesize_b] = super.decode(buf, offset + bytesize_a, 2)
		return [{ ...chunk_a, ...chunk_b }, bytesize_a + bytesize_b] as [value: png_chunk_type, bytesize: number]
	}
	*/
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
			// @ts-ignore
			new OpusChannelTable().setName("channel_table"),
			// new SPrimitive("str", "OpusTags", [8]).setName("comment_magic"),
			// new SHeadPrimitive("u4l", "str").setName("comment"),
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
	entries: VorbisCommentEntry_type

}

class VorbisComment extends SRecord<VorbisComment_type> {
	constructor() {
		super(
			// @ts-ignore
			new SHeadPrimitive("u4l", "str").setName("vendor_name"),
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


const a = new OggFile().setArgs(2)
const b = a.decode(await Deno.readFile("./music.ogg"), 0)[0]
console.debug(b)//[1].metadata["comment"]["entries"])

