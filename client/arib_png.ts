import CRC32 from "crc-32";
import { Buffer } from "buffer";

export function preparePLTE(clut: number[][]): Buffer<ArrayBuffer> {
    const plte = Buffer.alloc(4 /* PLTE */ + 4 /* size */ + clut.length * 3 + 4 /* CRC32 */);
    let off = 0;
    off = plte.writeUInt32BE(clut.length * 3, off);
    off += plte.write("PLTE", off);
    for (const entry of clut) {
        off = plte.writeUInt8(entry[0], off);
        off = plte.writeUInt8(entry[1], off);
        off = plte.writeUInt8(entry[2], off);
    }
    plte.writeInt32BE(CRC32.buf(plte.slice(4, off), 0), off);
    return plte;
}

export function prepareTRNS(clut: number[][]): Buffer<ArrayBuffer> {
    const trns = Buffer.alloc(4 /* PLTE */ + 4 /* size */ + clut.length + 4 /* CRC32 */);
    let off = 0;
    off = trns.writeUInt32BE(clut.length, off);
    off += trns.write("tRNS", off);
    for (const entry of clut) {
        off = trns.writeUInt8(entry[3], off);
    }
    trns.writeInt32BE(CRC32.buf(trns.slice(4, off), 0), off);
    return trns;
}

function replacePLTE(png: Buffer<ArrayBuffer>, plte: Buffer, trns: Buffer): Buffer<ArrayBuffer> {
    const output = Buffer.alloc(png.length + plte.length + trns.length);
    let inOff = 0, outOff = 0;
    // header
    png.copy(output, outOff, inOff, 8);
    inOff += 8;
    outOff += 8;
    while (inOff < png.byteLength) {
        let chunkLength = png.readUInt32BE(inOff);
        let chunkType = png.toString("ascii", inOff + 4, inOff + 8);
        if (chunkType === "PLTE" || chunkType == "tRNS") {
            // PLTEとtRNSは削除
        } else {
            outOff += png.copy(output, outOff, inOff, inOff + chunkLength + 4 + 4 + 4);
            if (chunkType === "IHDR") {
                // type = 3 (パレット) 以外は運用されない
                if (png[inOff + 0x11] != 3) {
                    return png;
                }
                outOff += plte.copy(output, outOff);
                outOff += trns.copy(output, outOff);
            }
        }
        inOff += chunkLength + 4 + 4 + 4;
    }
    return output.subarray(0, outOff);
}

export function aribPNGToPNG(png: Buffer<ArrayBuffer>, clut: number[][]): { data: Buffer<ArrayBuffer>, width?: number, height?: number } {
    const plte = preparePLTE(clut);
    const trns = prepareTRNS(clut);
    const data = replacePLTE(png, plte, trns);
    // IHDR
    const width = png.length >= 33 ? png.readUInt32BE(8 + 8) : undefined;
    const height = png.length >= 33 ? png.readUInt32BE(8 + 12) : undefined;
    return { data, width, height };
}
