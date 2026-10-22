// Leading-byte checks for the types the app stores. A file cannot pass as a PDF
// or image by naming alone. HTML and SVG are not on the list: served from this
// origin they would run script.

const isZip = (b: Buffer) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const isOle = (b: Buffer) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  "application/pdf": (b) => b.subarray(0, 4).toString("latin1") === "%PDF",
  "image/png": (b) => b[0] === 0x89 && b.subarray(1, 4).toString("latin1") === "PNG",
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": isZip,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": isZip,
  "application/vnd.ms-excel": isOle,
};

/** True only when the type is allowed and the bytes start with that type's signature. */
export function matchesSignature(mimeType: string, data: Buffer): boolean {
  const check = SIGNATURES[mimeType];
  return !!check && check(data);
}
