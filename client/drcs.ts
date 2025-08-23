import { jisToUnicodeMap } from "./jis_to_unicode_map";
import CRC32 from "crc-32";
import { Buffer } from "buffer";

function readBits(posBits: number, bits: number, buffer: Buffer): number {
    let value = 0;
    for (let i = 0; i < bits; i++) {
        value <<= 1;
        value |= (buffer[posBits >> 3] & (1 << (7 - (posBits & 7)))) ? 1 : 0;
        posBits++;
    }
    return value;
}

export type DRCSGlyph = {
    fontId: FontId,
    width: number,
    height: number,
    depth: number,
    bitmap: number[],
};

export type DRCSGlyphs = {
    ku: number,
    ten: number,
    glyphs: DRCSGlyph[],
};

export class BinaryWriter {
    private buffer: Buffer<ArrayBuffer>;
    private offset: number;
    private size: number;
    public constructor() {
        this.buffer = Buffer.alloc(4096);
        this.offset = 0;
        this.size = 0;
    }
    public get position(): number {
        return this.offset;
    }

    public seek(offset: number): number {
        const prev = this.offset;
        this.offset = offset;
        return prev;
    }

    private extend(needBytes: number) {
        const prevBuf = this.buffer;
        this.buffer = Buffer.alloc(Math.max(needBytes + this.offset, this.buffer.length * 2));
        prevBuf.copy(this.buffer);
    }

    public writeUInt8(value: number): number {
        if (this.offset >= this.buffer.byteLength) {
            this.extend(1);
        }
        this.buffer.writeUInt8(value, this.offset);
        this.offset += 1;
        this.size = Math.max(this.offset, this.size);
        return this.offset - 1;
    }
    public writeUInt16BE(value: number): number {
        if (this.offset + 2 >= this.buffer.byteLength) {
            this.extend(2);
        }
        this.buffer.writeUInt16BE(value, this.offset);
        this.offset += 2;
        this.size = Math.max(this.offset, this.size);
        return this.offset - 2;
    }
    public writeUInt24BE(value: number): number {
        if (this.offset + 3 >= this.buffer.byteLength) {
            this.extend(3);
        }
        this.buffer.writeUInt8((value >> 8) & 0xff, this.offset);
        this.buffer.writeUInt16BE(value & 0xffff, this.offset);
        this.offset += 3;
        this.size = Math.max(this.offset, this.size);
        return this.offset - 3;
    }
    public writeUInt32BE(value: number): number {
        if (this.offset + 4 >= this.buffer.byteLength) {
            this.extend(4);
        }
        this.buffer.writeUInt32BE(value, this.offset);
        this.offset += 4;
        this.size = Math.max(this.offset, this.size);
        return this.offset - 4;
    }
    public writeInt8(value: number): number {
        if (this.offset + 1 >= this.buffer.byteLength) {
            this.extend(1);
        }
        this.buffer.writeInt8(value, this.offset);
        this.offset += 1;
        this.size = Math.max(this.offset, this.size);
        return this.offset - 1;
    }
    public writeInt16BE(value: number): number {
        if (this.offset + 2 >= this.buffer.byteLength) {
            this.extend(2);
        }
        this.buffer.writeInt16BE(value, this.offset);
        this.offset += 2;
        this.size = Math.max(this.offset, this.size);
        return this.offset - 2;
    }
    public writeInt32BE(value: number): number {
        if (this.offset + 4 >= this.buffer.byteLength) {
            this.extend(4);
        }
        this.buffer.writeInt32BE(value, this.offset);
        this.offset += 4;
        this.size = Math.max(this.offset, this.size);
        return this.offset - 4;
    }
    public writeInt64BE(value: number): number {
        if (this.offset + 8 >= this.buffer.byteLength) {
            this.extend(8);
        }
        this.buffer.writeBigInt64BE(BigInt(value), this.offset);
        this.offset += 8;
        this.size = Math.max(this.offset, this.size);
        return this.offset - 8;
    }
    public writeASCII(value: string): number {
        if (this.offset + value.length >= this.buffer.byteLength) {
            this.extend(value.length);
        }
        this.buffer.write(value, this.offset, "ascii");
        this.offset += value.length;
        this.size = Math.max(this.offset, this.size);
        return this.offset - value.length;
    }
    public writeBuffer(value: Buffer): number {
        if (this.offset + value.length >= this.buffer.byteLength) {
            this.extend(value.length);
        }
        value.copy(this.buffer, this.offset);
        this.offset += value.length;
        this.size = Math.max(this.offset, this.size);
        return this.offset - value.length;
    }
    public getBuffer(): Buffer<ArrayBuffer> {
        return this.buffer.subarray(0, this.size);
    }
    public subarray(start?: number | undefined, end?: number | undefined): Buffer {
        if (end == null) {
            end = this.size;
        }
        return this.buffer.subarray(start, end);
    }
}

function checksum(buffer: Buffer): number {
    let chksum = 0;
    let i = 0;
    for (; i + 3 < buffer.length; i += 4) {
        chksum = (chksum + buffer.readInt32BE(i)) & 0xffffffff;
    }
    let remain = buffer.length - i;
    if (remain === 1) {
        chksum = (chksum + (buffer.readUInt8(i + 0) << 24)) & 0xffffffff;
        throw new Error("unreachable");
    } else if (remain === 2) {
        chksum = (chksum + (buffer.readUInt16BE(i + 0) << 16)) & 0xffffffff;
        throw new Error("unreachable");
    } else if (remain === 3) {
        chksum = (chksum + ((buffer.readUInt16BE(i + 0) << 16) | (buffer.readUInt8(i + 2) << 8))) & 0xffffffff;
        throw new Error("unreachable");
    } else if (remain !== 0) {
        throw new Error("unreachable");
    }
    return chksum;
}

export function toTTF(glyphs: DRCSGlyphs[]): { ttf: Buffer<ArrayBuffer>, unicodeCharacters: number[] } {
    const tables = [
        { name: "cmap", writer: writeCMAP, headerOffset: -1 },
        { name: "head", writer: writeHEAD, headerOffset: -1 },
        { name: "hhea", writer: writeHHEA, headerOffset: -1 },
        { name: "hmtx", writer: writeHMTX, headerOffset: -1 },
        { name: "maxp", writer: writeMAXP, headerOffset: -1 },
        { name: "name", writer: writeNAME, headerOffset: -1 },
        { name: "OS/2", writer: writeOS2, headerOffset: -1 },
        { name: "post", writer: writePOST, headerOffset: -1 },
        // EBDTとEBLCは消されてしまうらしい
        // https://github.com/khaledhosny/ots/blob/main/docs/DesignDoc.md
        // > We don't support embedded bitmap strikes.
        // { name: "EBDT", writer: writeEBDT, headerOffset: -1 },
        // { name: "EBLC", writer: writeEBLC, headerOffset: -1 },
        { name: "CBDT", writer: writeCBDT, headerOffset: -1 },
        { name: "CBLC", writer: writeCBLC, headerOffset: -1 },
        { name: "glyf", writer: writeGLYF, headerOffset: -1 },
        { name: "loca", writer: writeLOCA, headerOffset: -1 },
        { name: "SVG ", writer: writeSVG, headerOffset: -1 }
    ];
    tables.sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    const writer = new BinaryWriter();
    writer.writeUInt32BE(0x00010000);
    const numTables = tables.length;
    writer.writeUInt16BE(numTables);
    const searchRange = 16 * Math.pow(2, Math.floor(Math.log2(numTables)));
    writer.writeUInt16BE(searchRange);
    const entrySelector = Math.floor(Math.log2(numTables));
    writer.writeUInt16BE(entrySelector);
    // rangeShift
    writer.writeUInt16BE(numTables * 16 - searchRange);
    for (const i of tables) {
        i.headerOffset = writer.writeASCII(i.name);
        writer.writeUInt32BE(1234); // checksum
        writer.writeUInt32BE(0); // offset
        writer.writeUInt32BE(0); // length
    }
    let headOffset = -1;
    for (const i of tables) {
        const off = writer.position;
        if (i.name === "head") {
            headOffset = off;
        }
        i.writer(glyphs, writer);
        const len = writer.position - off;
        while (writer.position & 3) {
            writer.writeUInt8(0);
        }
        const chksum = checksum(writer.subarray(off, writer.position));
        let prev = writer.seek(i.headerOffset + 4 /* name */);
        writer.writeInt32BE(chksum);
        writer.writeUInt32BE(off);
        writer.writeUInt32BE(len);
        writer.seek(prev);
    }
    const wholeChecksum = (0xB1B0AFBA - checksum(writer.getBuffer())) | 0;
    writer.seek(headOffset + 8);
    writer.writeInt32BE(wholeChecksum);
    const unicodeCharacters = glyphs.map(x => map(x.ku, x.ten));
    return { ttf: writer.getBuffer(), unicodeCharacters };
}

function map(ku: number, ten: number): number {
    const s = jisToUnicodeMap[(ku - 1) * 94 + ten - 1];
    if (typeof s === "number") {
        return s;
    } else {
        return 0;
    }
}

function writeCMAP(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    let cmapOffset = writer.writeUInt16BE(0); // version
    writer.writeUInt16BE(1); // numTables
    // encoding record
    writer.writeUInt16BE(0); // platform id (unicode)
    writer.writeUInt16BE(3); // encoding ID
    writer.writeInt32BE(writer.position + 4 - cmapOffset); // subtable offset
    // table
    const offSubTable = writer.writeUInt16BE(4); // format
    const offLen = writer.writeUInt16BE(0); // length
    writer.writeUInt16BE(0); // language
    const segCount = glyphs.length + 1;
    writer.writeUInt16BE(segCount * 2); // segCountX2
    const searchRange = 2 * Math.pow(2, Math.floor(Math.log2(segCount)));
    writer.writeUInt16BE(searchRange);
    const entrySelector = Math.log2(searchRange / 2);
    writer.writeUInt16BE(entrySelector);
    // rangeShift
    writer.writeUInt16BE(segCount * 2 - searchRange);
    // endCode
    for (let i = 0; i < glyphs.length; i++) {
        writer.writeUInt16BE(map(glyphs[i].ku, glyphs[i].ten));
    }
    // endCode
    writer.writeUInt16BE(0xffff);
    writer.writeUInt16BE(0); // reserved
    // startCode
    for (let i = 0; i < glyphs.length; i++) {
        writer.writeUInt16BE(map(glyphs[i].ku, glyphs[i].ten));
    }
    // startCode
    writer.writeUInt16BE(0xffff);
    // idDelta
    for (let i = 0; i < segCount - 1; i++) {
        writer.writeUInt16BE((-map(glyphs[i].ku, glyphs[i].ten) + i + 1) & 0xffff);
    }
    writer.writeInt16BE(1);
    // idRangeOffsets 
    for (let i = 0; i < segCount; i++) {
        writer.writeUInt16BE(0);
    }
    const prev = writer.seek(offLen);
    writer.writeUInt16BE(prev - offSubTable);
    writer.seek(prev);
}

function writeHEAD(_glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    writer.writeUInt16BE(1); // majorVersion
    writer.writeUInt16BE(0); // minorVersion
    writer.writeUInt16BE(1); // fontRevision
    writer.writeUInt16BE(1); // fontRevision
    writer.writeUInt32BE(0); // checkSumAdjustment
    writer.writeUInt32BE(0x5F0F3CF5); // magicNumber
    writer.writeUInt16BE(0); // flags
    writer.writeUInt16BE(1024); // unitsPerEm
    writer.writeInt64BE(0); // created
    writer.writeInt64BE(0); // modified
    writer.writeInt16BE(0); // xMin
    writer.writeInt16BE(-123); // yMin
    writer.writeInt16BE(1024); // xMax
    writer.writeInt16BE(901); // yMax
    writer.writeUInt16BE(0); // macStyle
    writer.writeUInt16BE(8); // lowestRecPPEM
    writer.writeUInt16BE(2); // fontDirectionHint
    writer.writeUInt16BE(1); // indexToLocFormat
    writer.writeUInt16BE(0); // glyphDataFormat
}

function writeHHEA(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    writer.writeUInt16BE(1); // majorVersion
    writer.writeUInt16BE(0); // minorVersion
    writer.writeInt16BE(901); // yAscender
    writer.writeInt16BE(-123); // yDescender
    writer.writeInt16BE(0); // lineGap
    writer.writeUInt16BE(1024); // advanceWidthMax
    writer.writeInt16BE(0); // minLeftSideBearing
    writer.writeInt16BE(0); // minRightSideBearing
    writer.writeInt16BE(1024); // xMaxExtent
    writer.writeInt16BE(1); // caretSlopeRise
    writer.writeInt16BE(0); // caretSlopeRun
    writer.writeInt16BE(0); // caretOffset
    writer.writeInt16BE(0); // reserved
    writer.writeInt16BE(0); // reserved
    writer.writeInt16BE(0); // reserved
    writer.writeInt16BE(0); // reserved
    writer.writeInt16BE(0); // metricDataFormat
    writer.writeUInt16BE(glyphs.length + 1); // numberOfHMetrics
}

function writeHMTX(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    for (let i = 0; i <= glyphs.length; i++) {
        writer.writeUInt16BE(1024);
        writer.writeInt16BE(0);
    }
}

function writeMAXP(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    writer.writeUInt32BE(0x00010000); // version
    writer.writeUInt16BE(glyphs.length + 1); // numGlyphs
    writer.writeUInt16BE(0); // maxPoints
    writer.writeUInt16BE(0); // maxContours
    writer.writeUInt16BE(0); // maxCompositePoints
    writer.writeUInt16BE(0); // maxCompositeContours
    writer.writeUInt16BE(1); // maxZones
    writer.writeUInt16BE(0); // maxTwilightPoints
    writer.writeUInt16BE(0); // maxStorage
    writer.writeUInt16BE(0); // maxFunctionDefs
    writer.writeUInt16BE(0); // maxInstructionDefs
    writer.writeUInt16BE(0); // maxStackElements
    writer.writeUInt16BE(0); // maxSizeOfInstructions
    writer.writeUInt16BE(0); // maxComponentElements
    writer.writeUInt16BE(0); // maxComponentDepth
}

function writeNAME(_glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    const begin = writer.position;
    writer.writeUInt16BE(0); // version
    writer.writeUInt16BE(1); // count
    const sizeofNameRecord = 2 * 6;
    writer.writeUInt16BE(sizeofNameRecord + 2 + 2 + 2); // storageOffset
    // NameRecord
    writer.writeUInt16BE(0); // Unicode
    writer.writeUInt16BE(3); // UnicodeBMP
    writer.writeUInt16BE(0); // languageID
    writer.writeUInt16BE(0); // nameID
    const str = "DRCS";
    writer.writeUInt16BE(str.length * 2);
    writer.writeUInt16BE(0);
    writer.writeUInt16BE("DRCS".charCodeAt(0));
    writer.writeUInt16BE("DRCS".charCodeAt(1));
    writer.writeUInt16BE("DRCS".charCodeAt(2));
    writer.writeUInt16BE("DRCS".charCodeAt(3));
}

function writeOS2(_glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    writer.writeUInt16BE(1); // version
    writer.writeInt16BE(1013); // xAvgCharWidth
    writer.writeUInt16BE(400); // usWeightClass
    writer.writeUInt16BE(5); // usWidthClass
    writer.writeUInt16BE(0); // fsType
    writer.writeInt16BE(666); // ySubscriptXSize
    writer.writeInt16BE(614); // ySubscriptYSize
    writer.writeInt16BE(0); // ySubscriptXOffset
    writer.writeInt16BE(77); // ySubscriptYOffset
    writer.writeInt16BE(666); // ySuperscriptXSize
    writer.writeInt16BE(614); // ySuperscriptYSize
    writer.writeInt16BE(0); // ySuperscriptXOffset
    writer.writeInt16BE(358); // ySuperscriptYOffset
    writer.writeInt16BE(38); // yStrikeoutSize
    writer.writeInt16BE(408); // yStrikeoutPosition
    writer.writeInt16BE(0); // sFamilyClass
    for (let i = 0; i < 10; i++) {
        writer.writeInt8(0); // panose
    }
    writer.writeUInt32BE(0); // ulUnicodeRange1
    writer.writeUInt32BE(0); // ulUnicodeRange2
    writer.writeUInt32BE(0); // ulUnicodeRange3
    writer.writeUInt32BE(0); // ulUnicodeRange4
    writer.writeASCII("    "); // archVendID
    writer.writeUInt16BE(0x40); // fsSelection
    writer.writeUInt16BE(0x0000); // usFirstCharIndex
    writer.writeUInt16BE(0xffff); // usLastCharIndex
    writer.writeInt16BE(901); // sTypoAscender
    writer.writeInt16BE(-123); // sTypoDescender
    writer.writeInt16BE(0); // sTypoLineGap
    writer.writeUInt16BE(901); // usWinAscent
    writer.writeUInt16BE(123); // usWinDescent
    writer.writeUInt32BE(0); // ulCodePageRange1
    writer.writeUInt32BE(0); // ulCodePageRange2
}

function writePOST(_glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    writer.writeUInt32BE(0x00030000); // version
    writer.writeUInt16BE(0); // italicAngle
    writer.writeUInt16BE(0); // italicAngle
    writer.writeInt16BE(-1244); // underlinePosition
    writer.writeInt16BE(131); // underlineThickness
    writer.writeUInt32BE(0); // isFixedPitch
    writer.writeUInt32BE(0); // minMemType42
    writer.writeUInt32BE(0); // maxMemType42
    writer.writeUInt32BE(0); // minMemType1
    writer.writeUInt32BE(0); // maxMemType1
}

type Strike = {
    width: number,
    height: number,
    glyphs: { glyphIndex: number, glyph: DRCSGlyph }[]
};

function getStrikes(glyphses: DRCSGlyphs[]): Strike[] {
    const result: Strike[] = [];
    const map = new Map<string, Strike>();
    let glyphIndex = 0;
    for (const glyphs of glyphses) {
        glyphIndex++;
        for (const glyph of glyphs.glyphs) {
            const key = `${glyph.width}x${glyph.height}`;
            let strike = map.get(key);
            if (!strike) {
                strike = { width: glyph.width, height: glyph.height, glyphs: [] };
                result.push(strike);
                map.set(key, strike);
            }
            strike.glyphs.push({ glyphIndex, glyph });
        }
    }
    return result;
}

function writeCBLC(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    writer.writeUInt16BE(3);
    writer.writeUInt16BE(0);
    const strikes = getStrikes(glyphs);
    writer.writeUInt32BE(strikes.length);
    const headerSize = 2 * 2 + 4;
    const sizeOfSbitLineMetrics = 12;
    const sizeofBitmapSize = 4 * 4 + sizeOfSbitLineMetrics * 2 + 2 * 2 + 4;
    let indexSubTableArrayOffset = ((headerSize + sizeofBitmapSize * strikes.length) + 3) & ~3;
    const sizeOfIndexSubTableArray = 2 + 2 + 4;
    // BitmapSize
    for (const strike of strikes) {
        writer.writeUInt32BE(indexSubTableArrayOffset); // indexSubTableArrayOffset
        const indexTablesSize = sizeOfIndexSubTableArray * 1 + 2 + 2 + 4 + 4 + glyphs.length * 4;
        indexSubTableArrayOffset += indexTablesSize;
        writer.writeUInt32BE(indexTablesSize); // indexTablesSize
        writer.writeUInt32BE(1); // numberOfIndexSubTables
        writer.writeUInt32BE(0); // colorRef
        // hori
        {
            writer.writeInt8(Math.round(strike.width * 901 / 1024)); // ascender
            writer.writeInt8(Math.round(-strike.width * 123 / 1024)); // descender
            writer.writeUInt8(strike.width); // widthMax
            writer.writeInt8(0); // caretSlopeNumerator
            writer.writeInt8(0); // caretSlopeDenominator
            writer.writeInt8(0); // caretOffset
            writer.writeInt8(0); // minOriginSB
            writer.writeInt8(0); // minAdvanceSB
            writer.writeInt8(0); // maxBeforeBL
            writer.writeInt8(0); // minAfterBL
            writer.writeInt8(0); // pad1
            writer.writeInt8(0); // pad2
        }
        // vert
        {
            writer.writeInt8(Math.round(strike.width * 901 / 1024)); // ascender
            writer.writeInt8(Math.round(-strike.width * 123 / 1024)); // descender
            writer.writeUInt8(strike.height); // widthMax
            writer.writeInt8(0); // caretSlopeNumerator
            writer.writeInt8(0); // caretSlopeDenominator
            writer.writeInt8(0); // caretOffset
            writer.writeInt8(0); // minOriginSB
            writer.writeInt8(0); // minAdvanceSB
            writer.writeInt8(0); // maxBeforeBL
            writer.writeInt8(0); // minAfterBL
            writer.writeInt8(0); // pad1
            writer.writeInt8(0); // pad2
        }
        writer.writeUInt16BE(1); // startGlyphIndex
        writer.writeUInt16BE(glyphs.length); // endGlyphIndex
        writer.writeInt8(strike.width); // ppemX
        writer.writeInt8(strike.height); // ppemY
        writer.writeInt8(8); // bitDepth
        writer.writeInt8(1); // flags HORIZONTAL_METRICS
    }
    // IndexSubTableArray
    const sizeofIndexSubHeader = 2 + 2 + 4;
    const sizeofSmallGlyphMetrics = 5;
    let ebdtOffset = 2 + 2; // majorVersion, minorVersion
    for (const strike of strikes) {
        writer.writeUInt16BE(1); // firstGlyphIndex
        writer.writeUInt16BE(glyphs.length); // lastGlyphIndex
        writer.writeUInt32BE(2 + 2 + 4); // additionalOffsetToIndexSubtable
        // IndexSubHeader
        writer.writeUInt16BE(1); // indexFormat = IndexSubTable1
        writer.writeUInt16BE(1); // imageFormat = Format 1: small metrics, byte-aligned data
        writer.writeUInt32BE(ebdtOffset); // imageDataOffset
        writer.writeUInt32BE(0); // sbitOffsets
        let sbitOffset = 0;
        for (let i = 1; i <= glyphs.length; i++) {
            const glyph = findBestBitmap(glyphs, strike, i);
            sbitOffset += sizeofSmallGlyphMetrics + 1 * strike.width * strike.height;
            writer.writeUInt32BE(sbitOffset); // sbitOffsets
        }
        ebdtOffset += sbitOffset;
    }
}

function findBestBitmap(glyphs: DRCSGlyphs[], strike: Strike, glyphIndex: number): DRCSGlyph {
    const found = strike.glyphs.find(x => x.glyphIndex === glyphIndex)?.glyph;
    if (found) {
        return found;
    }
    const bitmaps = glyphs[glyphIndex - 1].glyphs;
    if (bitmaps.length === 1) {
        return bitmaps[0];
    }
    // 可能な限りstrikeのwidth, heightに近くなおかつそれ以上の大きさの外字を選ぶ
    const a = bitmaps.map(x => ({ score: (x.width * x.height) - (strike.width * strike.height), bitmap: x }));
    a.sort((a, b) => a.score - b.score);
    const bestSmall = a.find(x => x.score >= 0);
    if (bestSmall) {
        return bestSmall.bitmap;
    }
    // 見つからなければ妥協して一番大きいのを返す
    return a[a.length - 1]?.bitmap as DRCSGlyph;
}

function writeCBDT(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    writer.writeUInt16BE(3);
    writer.writeUInt16BE(0);
    // SmallGlyphMetrics
    const strikes = getStrikes(glyphs);
    for (const strike of strikes) {
        for (let i = 1; i <= glyphs.length; i++) {
            const g = findBestBitmap(glyphs, strike, i);
            writer.writeUInt8(strike.height);
            writer.writeUInt8(strike.width);
            writer.writeUInt8(0); // bearingX
            writer.writeUInt8(strike.height + Math.round(-strike.width * 123 / 1024)); // bearingY
            writer.writeUInt8(strike.width); // advance
            for (let y = 0; y < strike.height; y++) {
                for (let x = 0; x < strike.width; x++) {
                    // ひとまず線形補間でストライクの大きさに合わせた拡大縮小を行う
                    const y1 = y / strike.height * g.height;
                    const x1 = x / strike.width * g.width;
                    const fx = x1 - Math.floor(x1);
                    const fy = y1 - Math.floor(y1);
                    let b = 0;
                    b += g.bitmap[Math.floor(x1) + Math.floor(y1) * g.width] * (1 - fx) * (1 - fy);
                    b += g.bitmap[Math.min(g.width - 1, Math.floor(x1 + 1)) + Math.floor(y1) * g.width] * (fx) * (1 - fy);
                    b += g.bitmap[Math.floor(x1) + Math.min(g.height - 1, Math.floor(y1 + 1)) * g.width] * (1 - fx) * (fy);
                    b += g.bitmap[Math.min(g.width - 1, Math.floor(x1 + 1)) + Math.min(g.height - 1, Math.floor(y1 + 1)) * g.width] * (fx) * (fy);
                    writer.writeUInt8(Math.round(b / (g.depth - 1) * 255));
                }
            }
        }
    }
}

function writeGLYF(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    for (let i = 0; i <= glyphs.length; i++) {
        writer.writeUInt16BE(0); // numberOfContours
        writer.writeInt16BE(0); // xMin
        writer.writeInt16BE(-123); // yMin
        writer.writeInt16BE(1024); // xMax
        writer.writeInt16BE(901); // yMax
        writer.writeUInt16BE(0); // InstructionLength
    }
}

function writeLOCA(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    writer.writeUInt32BE(2 * 6 * 1);
    for (let i = 1; i <= glyphs.length + 1; i++) {
        writer.writeUInt32BE(2 * 6 * i);
    }
}

function encodePNG({ width, height, bitmap, depth }: DRCSGlyph): Buffer {
    const buffer = Buffer.alloc(33 /* IHDR */ + 12 /* IDAT */ + 2 + height * (5 + width * 2 + 1 /* filter */) + 4 + 12 /* IEND */);
    let off = 0;
    // 臼NG
    off = buffer.writeUInt8(0x89, off);
    off = buffer.writeUInt8(0x50, off);
    off = buffer.writeUInt8(0x4e, off);
    off = buffer.writeUInt8(0x47, off);
    off = buffer.writeUInt8(0x0d, off);
    off = buffer.writeUInt8(0x0a, off);
    off = buffer.writeUInt8(0x1a, off);
    off = buffer.writeUInt8(0x0a, off);

    off = buffer.writeUInt32BE(13, off);
    const ihdrOff = off;
    off += buffer.write("IHDR", off, "ascii");
    off = buffer.writeUInt32BE(width, off);
    off = buffer.writeUInt32BE(height, off);
    // 8-bit grayscale, alpha
    off = buffer.writeUInt8(8, off);
    off = buffer.writeUInt8(4, off);
    // deflate, no filter, interlace
    off = buffer.writeUInt8(0, off);
    off = buffer.writeUInt8(0, off);
    off = buffer.writeUInt8(0, off);
    off = buffer.writeInt32BE(CRC32.buf(buffer.subarray(ihdrOff, off)), off);
    off = buffer.writeUInt32BE(2 + height * (5 + width * 2 + 1 /* filter */) + 4, off);
    const idatOff = off;
    off += buffer.write("IDAT", off, "ascii");
    off = buffer.writeUInt8(0x78, off);
    off = buffer.writeUInt8(0x01, off);
    let a = 1, b = 0;
    for (let y = 0; y < height; y++) {
        off = buffer.writeUInt8(y === height - 1 ? 1 : 0, off);
        off = buffer.writeUInt16LE(width * 2 + 1, off);
        off = buffer.writeUInt16LE(~(width * 2 + 1) & 0xffff, off);
        off = buffer.writeUInt8(0x00, off);
        b = (b + a) % 65521;
        for (let x = 0; x < width; x++) {
            off = buffer.writeUInt8(255, off)
            a = (a + 255) % 65521;
            b = (b + a) % 65521;
            const v = Math.floor(bitmap[x + y * width] / (depth - 1) * 255);
            off = buffer.writeUInt8(v, off)
            a = (a + v) % 65521;
            b = (b + a) % 65521;
        }
    }
    off = buffer.writeInt32BE((b << 16) + a, off);
    off = buffer.writeInt32BE(CRC32.buf(buffer.subarray(idatOff, off)), off);
    off = buffer.writeUInt32BE(0, off);
    off += buffer.write("IEND", off, "ascii");
    off = buffer.writeInt32BE(CRC32.buf(buffer.subarray(off - 4, off)), off);
    return buffer;
}

function writeSVG(glyphs: DRCSGlyphs[], writer: BinaryWriter) {
    // SVGTableHeader
    writer.writeUInt16BE(0); // version
    writer.writeUInt32BE(2 + 4 + 4); // svgDocumentListOffset
    writer.writeUInt32BE(0); // reserved
    // SVGDocumentList
    const offsetSVGDocumentList = writer.position;
    writer.writeUInt16BE(glyphs.length);
    for (let glyphId = 1; glyphId <= glyphs.length; glyphId++) {
        writer.writeUInt16BE(glyphId); // startGlyphID
        writer.writeUInt16BE(glyphId); // endGlyphID
        writer.writeUInt32BE(0); // svgDocOffset
        writer.writeUInt32BE(0); // svgDocLength
    }
    let offsets: { glyphId: number, offset: number, size: number }[] = [];
    for (let glyphId = 1; glyphId <= glyphs.length; glyphId++) {
        const glyph = glyphs[glyphId - 1].glyphs.slice().sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
        const png = encodePNG(glyph);
        let svg = `<svg id="glyph${glyphId}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 ${glyph.height} ${glyph.width} ${glyph.height}">
<defs>
<mask id="mask">
<image x="0" y="${-Math.round(-glyph.width * 123 / 1024)}" width="${glyph.width + 1}" height="${glyph.height + 1}" xlink:href="data:image/png;base64,${png.toString("base64")}"/>
</mask>
</defs>
<rect x="0" y="${-Math.round(-glyph.width * 123 / 1024)}" width="${glyph.width + 1}" height="${glyph.height + 1}" mask="url(#mask)" />
</svg>`;
        offsets.push({ glyphId, offset: writer.writeASCII(svg), size: svg.length });
    }
    const prev = writer.seek(offsetSVGDocumentList + 2);
    for (const g of offsets) {
        writer.writeUInt16BE(g.glyphId); // startGlyphID
        writer.writeUInt16BE(g.glyphId); // endGlyphID
        writer.writeUInt32BE(g.offset - offsetSVGDocumentList); // svgDocOffset
        writer.writeUInt32BE(g.size); // svgDocLength
    }
    writer.seek(prev);
}

// 以下のフォントサイズのみが運用される (STD-B24 第二分冊 第二編 付属3 4.1.2参照)
export enum FontId {
    RoundGothic = 1, // 丸ゴシック
    SquareGothic = 2, // 角ゴシック
    BoldRoundGothic = 3, // 太丸ゴシック
}

export function loadDRCS(drcs: Buffer, filterId?: number): DRCSGlyphs[] {
    let off = 0;
    const nCode = drcs.readUInt8(off);
    off += 1;
    const ret: DRCSGlyphs[] = [];
    for (let i = 0; i < nCode; i++) {
        const charCode1 = drcs.readUInt8(off);
        off += 1;
        const charCode2 = drcs.readUInt8(off);
        off += 1;
        const nFont = drcs.readUInt8(off);
        off += 1;
        const glyphs: DRCSGlyphs = { ku: charCode1 - 0x20, ten: charCode2 - 0x20, glyphs: [] };
        for (let j = 0; j < nFont; j++) {
            const b = drcs.readUInt8(off);
            off += 1;
            const fontId = (b >> 4) as FontId;
            const mode = b & 15;
            //console.log(`${charCode1} ${charCode2} ${fontId}`);
            // charCode1 - 0x20, charCode2 - 0x20でJISの区点
            // これに0xA0を足すとEUC-JP
            // modeは1のみが運用される
            if (mode === 0 || mode === 1) {
                // depthは2のみが運用される(4階調)
                const depth = drcs.readUInt8(off);
                off += 1;
                // 以下のフォントサイズのみが運用される (STD-B24 第二分冊 第二編 付属3 4.6.10 表4-10参照)
                // 丸ゴシック(1) 16px, 20px, 24px, 30px, 36px
                // 太丸ゴシック(3) 30px
                // 角ゴシック(2) 20px, 24px
                // DRCSは全角のみが運用される
                const width = drcs.readUInt8(off);
                off += 1;
                const height = drcs.readUInt8(off);
                off += 1;
                const depthBits = Math.ceil(Math.log2(depth + 2));
                let posBits = off * 8;
                const bitmap = new Array(width * height);
                if (filterId == null || (fontId as number) === filterId) {
                    glyphs.glyphs.push({ fontId, width, height, depth: depth + 2, bitmap });
                }
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const bits = readBits(posBits, depthBits, drcs);
                        bitmap[x + y * width] = bits;
                        posBits += depthBits;
                    }
                }
                off = (posBits + 7) >> 3;
            } else {
                // ジオメトリックは運用されない
                throw new Error("geometric is not operated");
            }
        }
        if (glyphs.glyphs.length !== 0) {
            ret.push(glyphs);
        }
    }
    return ret;
}