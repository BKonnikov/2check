/**
 * PRD 23.9 — what the shared picture says about itself from the inside.
 *
 * A canvas encodes a bare PNG: pixels, and nothing that survives being forwarded. A card that
 * travels through a messenger and lands in somebody's Downloads a week later should still be
 * able to answer "what is this, and where did it come from", so the text chunks the format
 * already defines are written into it here. Nothing is invented: the keywords are the ones the
 * PNG specification lists, which is why a reader that shows metadata at all shows these.
 *
 * Two chunk types, picked by what the text holds. tEXt stores Latin-1 only, which cannot spell
 * a Russian title or an internationalised domain; those go in iTXt, which is UTF-8. Values that
 * are plain ASCII stay in tEXt, understood by every reader since 1996.
 */

export interface PngTextEntry {
  /** A keyword from the PNG specification: Title, Software, Source, Creation Time. */
  readonly keyword: string;
  readonly value: string;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR = "IHDR";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function fitsLatin1(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 0xff) {
      return false;
    }
  }
  return true;
}

function latin1(value: string): Uint8Array {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    out[i] = value.charCodeAt(i) & 0xff;
  }
  return out;
}

const UTF8 = new TextEncoder();

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(latin1(type), 4);
  out.set(data, 8);
  // The checksum covers the type and the data, never the length.
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function textChunk(entry: PngTextEntry): Uint8Array {
  const keyword = latin1(entry.keyword);
  if (fitsLatin1(entry.value)) {
    const value = latin1(entry.value);
    // tEXt: keyword, a separator, the text.
    const data = new Uint8Array(keyword.length + 1 + value.length);
    data.set(keyword, 0);
    data.set(value, keyword.length + 1);
    return chunk("tEXt", data);
  }
  const value = UTF8.encode(entry.value);
  /**
   * iTXt: keyword, separator, compression flag, compression method, language tag, separator,
   * translated keyword, separator, the text. Five bytes sit between the keyword and the text
   * and every one of them is zero here — uncompressed, no language declared, no translation —
   * which is why the gap is only reserved and never written to.
   */
  const data = new Uint8Array(keyword.length + 5 + value.length);
  data.set(keyword, 0);
  data.set(value, keyword.length + 5);
  return chunk("iTXt", data);
}

function isPng(bytes: Uint8Array): boolean {
  return SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/**
 * Returns the image with the entries added, or the image untouched when it cannot be read.
 *
 * Metadata is a courtesy, never the point: a picture that reaches the reader without its title
 * is a smaller loss than one that does not reach them at all.
 */
export function withTextChunks(
  // The buffer is named: a Blob may only be built from a view over a plain ArrayBuffer, and a
  // bare Uint8Array also admits the shared kind.
  png: Uint8Array<ArrayBuffer>,
  entries: readonly PngTextEntry[],
): Uint8Array<ArrayBuffer> {
  const usable = entries.filter((entry) => entry.keyword !== "" && entry.value !== "");
  if (usable.length === 0 || png.length < 8 + 12 || !isPng(png)) {
    return png;
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const headerLength = view.getUint32(8);
  const type = String.fromCharCode(...png.subarray(12, 16));
  // The format requires IHDR first; the text goes straight after it, before any pixel data.
  const insertAt = 8 + 12 + headerLength;
  if (type !== IHDR || insertAt > png.length) {
    return png;
  }
  const chunks = usable.map(textChunk);
  const added = chunks.reduce((sum, one) => sum + one.length, 0);
  const out = new Uint8Array(png.length + added);
  out.set(png.subarray(0, insertAt), 0);
  let at = insertAt;
  for (const one of chunks) {
    out.set(one, at);
    at += one.length;
  }
  out.set(png.subarray(insertAt), at);
  return out;
}
