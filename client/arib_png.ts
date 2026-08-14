import CRC32 from "crc-32";

export function preparePLTE(clut: number[][]): Uint8Array<ArrayBuffer> {
    const plte = new Uint8Array(4 /* PLTE */ + 4 /* size */ + clut.length * 3 + 4 /* CRC32 */);
    const view = new DataView(plte.buffer, plte.byteOffset, plte.byteLength);
    let off = 0;
    view.setUint32(off, clut.length * 3)
    off += 4;
    plte[off] = "P".charCodeAt(0);
    off++;
    plte[off] = "L".charCodeAt(0);
    off++;
    plte[off] = "T".charCodeAt(0);
    off++;
    plte[off] = "E".charCodeAt(0);
    off++;
    for (const entry of clut) {
        plte[off] = entry[0];
        off++;
        plte[off] = entry[1];
        off++;
        plte[off] = entry[2];
        off++;
    }
    view.setInt32(off, CRC32.buf(plte.subarray(4, off), 0));
    return plte;
}

export function prepareTRNS(clut: number[][]): Uint8Array<ArrayBuffer> {
    const trns = new Uint8Array(4 /* PLTE */ + 4 /* size */ + clut.length + 4 /* CRC32 */);
    const view = new DataView(trns.buffer, trns.byteOffset, trns.byteLength);
    let off = 0;
    view.setUint32(off, clut.length)
    off += 4;
    trns[off] = "t".charCodeAt(0);
    off++;
    trns[off] = "R".charCodeAt(0);
    off++;
    trns[off] = "N".charCodeAt(0);
    off++;
    trns[off] = "S".charCodeAt(0);
    off++;
    for (const entry of clut) {
        trns[off] = entry[3];
        off++;
    }
    view.setInt32(off, CRC32.buf(trns.subarray(4, off), 0));
    return trns;
}

function replacePLTE(png: Uint8Array<ArrayBuffer>, plte: Uint8Array, trns: Uint8Array): Uint8Array<ArrayBuffer> {
    const output = new Uint8Array(png.length + plte.length + trns.length);
    let inOff = 0, outOff = 0;
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    // header
    output.set(png.subarray(inOff, inOff + 8), outOff);
    inOff += 8;
    outOff += 8;
    while (inOff < png.byteLength) {
        let chunkLength = view.getUint32(inOff);
        let chunkType = String.fromCharCode(...png.subarray(inOff + 4, inOff + 8));
        if (chunkType === "PLTE" || chunkType == "tRNS") {
            // PLTEとtRNSは削除
        } else {
            output.set(png.subarray(inOff, inOff + chunkLength + 4 + 4 + 4), outOff);
            outOff += chunkLength + 4 + 4 + 4;
            if (chunkType === "IHDR") {
                // type = 3 (パレット) 以外は運用されない
                if (png[inOff + 0x11] != 3) {
                    return png;
                }
                output.set(plte, outOff);
                outOff += plte.byteLength;
                output.set(trns, outOff);
                outOff += trns.byteLength;
            }
        }
        inOff += chunkLength + 4 + 4 + 4;
    }
    return output.subarray(0, outOff);
}

export function aribPNGToPNG(png: Uint8Array<ArrayBuffer>, clut: number[][]): { data: Uint8Array<ArrayBuffer>, width?: number, height?: number } {
    const plte = preparePLTE(clut);
    const trns = prepareTRNS(clut);
    const data = replacePLTE(png, plte, trns);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    // IHDR
    const width = png.length >= 33 ? view.getUint32(8 + 8) : undefined;
    const height = png.length >= 33 ? view.getUint32(8 + 12) : undefined;
    return { data, width, height };
}
