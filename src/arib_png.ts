import CRC32 from "crc-32";
import { Buffer } from "buffer";

function preparePLTE(clut: number[][]): Buffer {
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

function prepareTRNS(clut: number[][]): Buffer {
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

// FIXME: PLTEは無視するとTR-B14で定められているのでこの実装は間違い
function isPLTEMissing(png: Buffer): boolean {
    let off = 8;
    // IHDR
    const type = png[off + 0x11];
    // palette
    if (type !== 3) {
        return false;
    }
    off += png.readUInt32BE(off) + 4 * 3;
    while (true) {
        let chunkLength = png.readUInt32BE(off);
        let chunkType = png.toString("ascii", off + 4, off + 8);
        if (chunkType === "IDAT" || chunkType === "IEND") {
            return true;
        }
        if (chunkType === "PLTE") {
            return false;
        }
        off += chunkLength + 4 * 3;
    }
}

export function aribPNGToPNG(png: Buffer, clut: number[][]): Buffer {
    if (!isPLTEMissing(png)) {
        return png;
    }
    const plte = preparePLTE(clut);
    const trns = prepareTRNS(clut);
    const output = Buffer.alloc(png.length + plte.length + trns.length);
    let off = 0;
    off += png.copy(output, off, 0, 33);
    off += plte.copy(output, off);
    off += trns.copy(output, off);
    off += png.copy(output, off, 33);
    return output;
}
