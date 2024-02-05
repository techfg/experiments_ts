import { FileParser } from "https://deno.land/x/kitchensink_ts@v0.7.3/devdebug.ts"
import { BinaryArrayStep, BinaryRecordStep, SequentialSteps } from "../binary_composition_steps.ts"
import { BinaryBytesStep, BinaryDefaultArgs, BinaryInputWrapStep, BinaryOutputUnwrapStep, BinaryStringStep } from "../binary_primitive_steps.ts"
import { concatBytes, math_ceil } from "../deps.ts"
import { BinaryInput, BinaryOutput } from "../typedefs.ts"
import { FixedLengthString_Step, IntegerFixedLengthString_Step } from "./tar_parser_helper.ts"


interface HeaderBlock_schema {
	/** `type: "str"` <br> exactly 100_bytes long.
	 * 
	 * indicates:
	 * - the full directory-entry path if it is less than or equal to 100 ascii characters
	 * - only the directory-entry name (filename or foldername), if the full path exceeds 100 characters
	 * 
	 * moreover:
	 * - the unoccupied trailing characters are filled with NUL characters ("\x00")
	 * - a folder is indicated by a trailing slash ("/") in its name (it must be an empty folder in that case, otherwise its existence would be redundant)
	 * - there are no leading slashes ("/") or dot-slashes ("./"). in other words, `"/hello/world/file.txt"` and `"./hello/world/file.txt"` should be named as `"hello/world/file.txt"`
	*/
	name: string

	/** `type: "number"` <br> exactly 8_bytes long as a numeric string. defaults to `777`
	 * - the number is in octal representation (base 8 number)
	 * - represents the permission in the form: `"00000UGO"`, where:
	 *   - `U` represents User permission, `G` represents Group permission, `O` represents Other's permission
	 *   - each of `U`, `G`, and `O` can occupy any value between `0` and `7` (inclusive)
	 *   - each of the value (`0` to `7`) is an encoding of the permission flag bitarray `[r, w, x]` summed as `value = r + w + x`, where:
	 *     - `r = 0b100 = 4` means read permission granted, `r = 0b000 = 0` means otherwise
	 *     - `w = 0b010 = 2` means write permission granted, `w = 0b000 = 0` means otherwise
	 *     - `x = 0b001 = 1` means execution permission granted, `x = 0b000 = 0` means otherwise
	 * 
	 * example:
	 * the permission `754` means:
	 *  - `User = 7 = 4 + 2 + 1 == [true, true, true]`, which means: read, write, and exec permissions granted
	 *  - `Group = 5 = 4 + 0 + 1 == [true, false, true]`, which means: read, and exec permissions granted
	 *  - `Other = 4 = 4 + 0 + 0 == [true, false, false]`, which means: read permission granted
	*/
	mode: number

	/** `type: "number"` <br> exactly 8_bytes long as a NUL terminated octal_numeric (base 8) string. defaults to `0`. <br>
	 * represents Owner's numeric user ID. (which is not relevant in the context of a shareable tar archive file).
	*/
	uid: number

	/** `type: "number"` <br> exactly 8_bytes long as a NUL terminated octal_numeric (base 8) string. defaults to `0`. <br>
	 * represents Group's numeric user ID. (which is not relevant in the context of a shareable tar archive file).
	*/
	gid: number

	/** `type: "number"` <br> exactly 12_bytes long as a NUL terminated octal_numeric (base 8) string. defaults to `0`. <br>
	 * represents bytesize of the relevant file associated with this header block.
	 * - the number of blocks occupied by the file (not including this header) will then simply be `number_of_blocks = Math.ceil(bytesize / 512)`.
	 * - if a file is of a symbolic-link type (`typeflag === "2"`), then its size should be zero, since it doesn't occupy a physical space of its own.
	*/
	size: number

	/** `type: "number"` <br> exactly 12_bytes long as a NUL terminated octal_numeric (base 8) string. defaults to `0`. <br>
	 * represents the "modified-time" of the file in number of seconds since 00:00:00AM UTC of 01/01/1970 (aka the epoch).
	*/
	mtime: number

	/** `type: "string"` <br> exactly 8_bytes long as a NUL terminated octal_numeric (base 8) string. <br>
	 * represents the checksum of *this* header block, while assuming that *this* checksum field is just eight-ascii-space characters (`" "`, or `"\x20"`, or characterPoint `32`). <br>
	 * the checksum is simply calculated by taking the sum of the unsigned byte values of the header block.
	 * since the octal string encoded checksum can only be at most six-digits long, it is followed by a NUL and then a space character (so basically, `"######\x00\x20"`, where `#` is an octal digit character)
	*/
	checksum: string

	/** `type: "enum"` <br> exactly 1_bytes long as an octal_numeric (base 8) string. defaults to `"regular"` enum <br>
	 * represents the type of file this is. it could be one of:
	 *  - `"regular"`: encoded as `"0"` or `"\x00"` (not preferred), for a regular file
	 *  - `"hardlink"`: encoded as `"1"`, for a hard-link (alias) to regular file.
	 *    - if the referenced regular file were renamed or deleted, the hard link will still be referencing the original content correctly.
	 *    - in other words, if a tar archive software were deleting a "regular" file header of the name `"hello/world1.txt"`, which is also referenced by multiple "hardlink" file headers of the names `"Y/worldX.txt"` (where Y and X are variables), the software is responsible for:
	 *      - selecting one of the hardlinks, say `"A/worldB.txt"`
	 *      - replacing the "regular" file header with a clone of the `"A/worldB.txt"` hardlink header
	 *      - renaming the cloned `"A/worldB.txt"` hardlink header's `typeflag` from `"1"` (hardlink) to `"0"` (regular)
	 *      - renaming all other hardlinks `"Y/worldX.txt"`'s `linkname` from `"hello/world1.txt"` to the new name `A/worldB.txt`
	 *      - think of it as though YOU are managing a filesystem and its referencing system
	 *    - a hardlink file's `size` should be the same as its referenced file's `size` field, even though there shouldn't be data-content blocks following the hardlink header block, but rather, it should jump to the original referenced header's data-content blocks
	 *    - a hardlink can reference either a "regular" file or another "hardlink", but traversing up the dependency tree, there should always be ONE "regular" file at the root
	 *  - `"symlink"`: encoded as `"2"`, for a symbolic-link that references another file (of any `typeflag`). these are not immune to reference breaking/changing if the headers they reference change their `name` or get deleted
	 *    - a symlink's `size` field must be zero (`"0"`), because it doesn't occupy physical space, and is just a reference to another header's file `name`
	*/
	typeflag: string

	/** `type: "string"` <br> exactly 100_bytes long. <br>
	 * if this is a header of a hardlink or symlink (`typeflag === "1" || typeflag === "2"`), then this field refers to the pathname of the file being referenced.
	 * it can also contain the `"./"` or `"../"` relative path controls.
	 * if this is the header if a regular file (`typeflag === "0"`), then this field is supposed to be filled with NUL bytes (100 of "\x00", or `new Uint8Array(100).fill(0)`)
	*/
	linkname: string

	/** `type: "string"` <br> exactly 6_bytes long. defaults to `"ustar\x00"` <br>
	 * the magic bytes associated with the Ustar tar format. it should exactly read `"ustar\x00"`
	*/
	magic: "ustar"

	/** `type: "string"` <br> exactly 2_bytes long as an octal_numeric (base 8) string. defaults to `0` <br>
	 * the Ustar version should always be `0`, and encoded as `"00"` in string format.
	*/
	version: "00"

	/** `type: "string"` <br> exactly 32_bytes long. defaults to NUL string. <br>
	 * represents Owner's username.
	*/
	uname: string

	/** `type: "string"` <br> exactly 32_bytes long. defaults to NUL string. <br>
	 * represents Owner's username.
	*/
	gname: string

	/** `type: "number"` <br> exactly 8_bytes long as a NUL terminated octal_numeric (base 8) string. defaults to `0` */
	devmajor: number

	/** `type: "number"` <br> exactly 8_bytes long as a NUL terminated octal_numeric (base 8) string. defaults to `0` */
	devminor: number

	/** `type: "string"` <br> exactly 155_bytes long. defaults to NUL string. <br>
	 * represents the usage of a directory name prefix for allowing longer file paths.
	 * an implicit slash ("/") is added in between the file's `name` field and its `prefix` field when joining them to get the full path.
	 * for example:
	 * - if `name = "hello/world.txt"`, and `prefix = "foo/bar/fax"`,  then the full path will be `"foo/bar/fax" + "/" + "hello/world.txt" === "foo/bar/fax/hello/world.txt"`
	 * - of course, the above example is invalid because the fullpath is not exceeding the `100` byte `name` field limit, therefore it shouldn't be using a `prefix`, but we'll just assume that it was exceefing the limit
	*/
	prefix: string
}

class HeaderBlock_Step extends BinaryRecordStep<HeaderBlock_schema> {
	constructor() {
		super([
			["name", new FixedLengthString_Step(100, "\x00", "end")],
			["mode", new IntegerFixedLengthString_Step(8, 10) as any],
			["uid", new IntegerFixedLengthString_Step(8, 8) as any],
			["gid", new IntegerFixedLengthString_Step(8, 8) as any],
			["size", new IntegerFixedLengthString_Step(12, 8) as any],
			["mtime", new IntegerFixedLengthString_Step(12, 8) as any],
			["checksum", new BinaryDefaultArgs(new BinaryStringStep(), { length: 8 })],
			["typeflag", new BinaryDefaultArgs(new BinaryStringStep(), { length: 1 }, 1)],
			["linkname", new FixedLengthString_Step(100, "\x00", "end")],
			["magic", new FixedLengthString_Step(6, "\x00", "end") as any],
			["version", new BinaryDefaultArgs(new BinaryStringStep(), { length: 2 }, 1) as any],
			["uname", new FixedLengthString_Step(32, "\x00", "end")],
			["gname", new FixedLengthString_Step(32, "\x00", "end")],
			["devmajor", new IntegerFixedLengthString_Step(8, 8) as any],
			["devminor", new IntegerFixedLengthString_Step(8, 8) as any],
			["prefix", new FixedLengthString_Step(155, "\x00", "end")],
		])
	}
}

type DirectoryEntry_verbose_schema = {
	header: HeaderBlock_schema
	content: Uint8Array
}

class DirectoryEntry_step extends BinaryRecordStep<DirectoryEntry_verbose_schema, Record<any, never | any>> {
	constructor() {
		super([
			["header", new HeaderBlock_Step()],
			["content", new BinaryBytesStep()],
		])
	}
	forward(input: BinaryInput): BinaryOutput<DirectoryEntry_verbose_schema> {
		const
			{ bin, pos } = input,
			{ val: { header }, len: header_len } = this.partial_forward(bin, pos, {}, 0, 1),
			content_bytelength = header!.size,
			content_blocks_length = math_ceil(content_bytelength / 512) * 512,
			{ val: { content }, len: content_len } = this.partial_forward(bin, pos + 512, { content: { length: content_blocks_length } }, 1)
		// console.assert(header_len === 500)
		return {
			val: {
				header: header!,
				content: content!.slice(0, content_bytelength)
			},
			len: 512 + content_len
		}
	}
	backward(input: Omit<BinaryOutput<DirectoryEntry_verbose_schema>, "len">): BinaryInput {
		const
			{ header, content } = input.val,
			content_bytelength = content.byteLength,
			content_blocks_length = math_ceil(content_bytelength / 512) * 512,
			content_padding = new Uint8Array(content_blocks_length - content_bytelength)
		header.size = content.byteLength
		return super.backward({
			val: {
				header,
				content: concatBytes(content, content_padding)
			}
		})
	}
}

class AllDirectoryEntries extends BinaryArrayStep<DirectoryEntry_step> {
	constructor() {
		super(new DirectoryEntry_step())
	}
}

class Tar_Codec_Step extends SequentialSteps<Uint8Array, Array<DirectoryEntry_step>> {
	constructor() {
		super(
			new BinaryInputWrapStep(),
			new AllDirectoryEntries(),
			new BinaryOutputUnwrapStep(),
		)
	}
}

const tar_codec_step = new Tar_Codec_Step()
const file_step_adapter = {
	encode: (value: DirectoryEntry_step[]): Uint8Array => {
		return tar_codec_step.backward(value)
	},
	decode: (buffer: Uint8Array, offset: number, ...args: any[]): [value: DirectoryEntry_step[], bytesize: number] => {
		const val = tar_codec_step.forward(buffer)
		return [val, 0]
	}
}

const tar_file_parser = new FileParser(file_step_adapter)
Object.assign(window, { tar_file_parser })
// export default tar_file_parser
