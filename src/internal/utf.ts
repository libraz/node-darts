/** UTF-8 length of a code point; a lone surrogate counts as U+FFFD (3 bytes). */
export function utf8Width(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * Maps each UTF-8 byte offset of `text`'s encoding to its UTF-16 offset;
 * offsets inside a character map to -1. `byteLength` is the encoded length.
 */
export function utf16Offsets(text: string, byteLength: number): Int32Array {
  const offsets = new Int32Array(byteLength + 1).fill(-1);
  let byte = 0;
  let unit = 0;
  while (unit < text.length) {
    offsets[byte] = unit;
    const codePoint = text.codePointAt(unit) as number;
    byte += utf8Width(codePoint);
    unit += codePoint > 0xffff ? 2 : 1;
  }
  offsets[byte] = unit;
  return offsets;
}
