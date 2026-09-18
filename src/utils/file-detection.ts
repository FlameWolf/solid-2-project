const MAGIC_NUMBERS: Array<{ fileType: string; sig: Array<number> }> = [
	{
		fileType: "png",
		sig: [0x89, 0x50, 0x4e, 0x47]
	},
	{
		fileType: "jpeg",
		sig: [0xff, 0xd8, 0xff]
	},
	{
		fileType: "gif",
		sig: [0x47, 0x49, 0x46, 0x38]
	},
	{
		fileType: "pdf",
		sig: [0x25, 0x50, 0x44, 0x46]
	}
];
const CONTROL_CHAR_THRESHOLD = 0.0075;

export function hasMagicNumber(bytes: Uint8Array): boolean {
	return MAGIC_NUMBERS.some(({ sig }) => sig.every((value, index) => bytes[index] === value));
}

export function hasNulByte(bytes: Uint8Array): boolean {
	return bytes.includes(0x00);
}

export function controlCharRatio(bytes: Uint8Array): number {
	let count = 0;
	for (let index = 0; index < bytes.length; index++) {
		const byte = bytes[index] as number;
		const allowed = byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x0c;
		const isControl = byte <= 0x08 || (byte >= 0x0e && byte <= 0x1f) || byte === 0x7f;
		if (!allowed && isControl) {
			count++;
		}
	}
	return count / Math.max(1, bytes.length);
}

export function isValidUtf8(bytes: Uint8Array): boolean {
	try {
		new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		return true;
	} catch {
		return false;
	}
}

export async function isTextFile(file: File, sampleSize: number = 8192): Promise<boolean> {
	const blob = file.slice(0, sampleSize);
	const buffer = await blob.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	if (bytes.length === 0) {
		return true;
	}
	if (hasNulByte(bytes) || hasMagicNumber(bytes) || !isValidUtf8(bytes)) {
		return false;
	}
	return controlCharRatio(bytes) <= CONTROL_CHAR_THRESHOLD;
}