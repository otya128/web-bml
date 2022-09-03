import { TextDecodeFunction, TextEncodeFunction } from "./text";
import { decodeZipCode, ZipCode, zipCodeInclude } from "./zip_code";

enum BinaryTableUnit {
    Byte = "B",
    Bit = "b",
    Variable = "V",
}

enum BinaryTableType {
    Boolean = "B",
    UnsignedInteger = "U",
    Integer = "I",
    String = "S",
    ZipCode = "Z",
    Pad = "P",
}
type BinaryTableField = {
    unit: BinaryTableUnit,
    length: number,
    type: BinaryTableType,
}

enum SearchOperator {
    Equal = 0,
    NotEqual,
    Less, // <
    LessEqual, // <=
    Greater, // >
    GreaterEqual, // >=
    And, // &
    Or, // |
    Xor, // ^
    Nand, // ~&
    Nor, // ~|
    Nxor, // ~^

    StringMatches = 32,
    StringIncludes,
    StringStarsWith,
    StringEndsWith,
    StringNotMatch,
    StringNotInclude,

    BoolEqualTo = 64,
    BoolNotEqualTo,

    ZipInclude = 96,
    ZipNotInclude = 97,
}

function readBits(posBits: number, bits: number, buffer: Uint8Array): [value: number, posBits: number] {
    let value = 0;
    for (let i = 0; i < bits; i++) {
        value <<= 1;
        value |= (buffer[posBits >> 3] & (1 << (7 - (posBits & 7)))) ? 1 : 0;
        posBits++;
    }
    return [value, posBits];
}

function writeBits(posBits: number, bits: number, buffer: Uint8Array, value: number): number {
    for (let i = bits - 1; i >= 0; i--) {
        const b = 1 << (7 - (posBits & 7));
        buffer[posBits >> 3] &= ~b;
        if (value & (1 << i)) {
            buffer[posBits >> 3] |= b;
        }
        posBits++;
    }
    return posBits;
}

export function parseBinaryStructure(structure: string): BinaryTableField[] | null {
    const sep = structure.split(",");
    const fields: BinaryTableField[] = [];
    for (const s of sep) {
        const groups = s.match(/^(?<type>[BUISZP]):(?<length>[1-9][0-9]*)(?<unit>[BbVv])$/)?.groups;
        if (!groups) {
            return null;
        }
        const type = groups["type"] as BinaryTableType;
        const length = Number.parseInt(groups["length"]);
        let unit = groups["unit"] as BinaryTableUnit;
        if (unit === "v" as BinaryTableUnit) {
            unit = BinaryTableUnit.Variable;
        }
        fields.push({ type, length, unit })
    }
    return fields;
}

export function readBinaryFields(buffer: Uint8Array, fields: BinaryTableField[], decodeText: TextDecodeFunction, posBits?: number): [result: any[], posBits: number] {
    posBits = posBits ?? 0;
    const columns: any[] = [];
    for (const field of fields) {
        let fieldData: any = null;
        switch (field.type) {
            case BinaryTableType.Boolean:
                if (field.unit !== BinaryTableUnit.Bit) {
                    throw new Error("FIXME");
                }
                if (field.length !== 1) {
                    throw new Error("FIXME");
                }
                [fieldData, posBits] = readBits(posBits, field.length, buffer);
                fieldData = fieldData != 0;
                break;
            case BinaryTableType.UnsignedInteger:
                let lengthInBits: number;
                if (field.unit === BinaryTableUnit.Bit) {
                    lengthInBits = field.length;
                } else if (field.unit === BinaryTableUnit.Byte) {
                    lengthInBits = field.length * 8;
                } else {
                    throw new Error("FIXME");
                }
                if (lengthInBits > 32) {
                    throw new Error("FIXME");
                }
                [fieldData, posBits] = readBits(posBits, lengthInBits, buffer);
                break;
            case BinaryTableType.Integer:
                if (field.unit !== BinaryTableUnit.Byte) {
                    throw new Error("must be byte");
                }
                if ((posBits & 7) !== 0) {
                    throw new Error("must be byte aligned");
                }
                if (field.length === 1) {
                    fieldData = buffer[posBits >> 3] << (32 - 8) >> (32 - 8);
                    posBits += 8;
                } else if (field.length === 2) {
                    fieldData = ((buffer[(posBits >> 3) + 0] << 8) | buffer[(posBits >> 3) + 1]) << (32 - 16) >> (32 - 16);
                    posBits += 16;
                } else if (field.length === 4) {
                    fieldData = ((buffer[(posBits >> 3) + 0] << 24) | (buffer[(posBits >> 3) + 1] << 16) | (buffer[(posBits >> 3) + 2] << 8) | (buffer[(posBits >> 3) + 3] << 0));
                    posBits += 32;
                } else {
                    throw new Error("length must be 1, 2, or 4");
                }
                break;
            case BinaryTableType.String:
                if ((posBits & 7) !== 0) {
                    throw new Error("string must be byte aligned");
                }
                let lengthByte: number;
                if (field.unit === BinaryTableUnit.Byte) {
                    lengthByte = field.length;
                } else if (field.unit === BinaryTableUnit.Variable) {
                    [lengthByte, posBits] = readBits(posBits, field.length * 8, buffer);
                } else {
                    throw new Error("string must be byte or variable");
                }
                const decoded = decodeText(buffer.subarray(posBits >> 3, (posBits >> 3) + lengthByte));
                // なにも設定されていなければ空文字列(TR-B14, TR-B15) => null文字以降切り捨てとする
                const nullIndex = decoded.indexOf("\u0000");
                if (nullIndex !== -1) {
                    fieldData = decoded.substring(0, nullIndex);
                } else {
                    fieldData = decoded;
                }
                posBits += lengthByte * 8;
                break;
            case BinaryTableType.Pad:
                if (field.unit === BinaryTableUnit.Byte) {
                    posBits += field.length * 8;
                } else if (field.unit === BinaryTableUnit.Bit) {
                    posBits += field.length;
                } else {
                    throw new Error("variable not allowed");
                }
                break;
            case BinaryTableType.ZipCode:
                {
                    if ((posBits & 7) !== 0) {
                        throw new Error("zip code must be byte aligned");
                    }
                    if (field.unit !== BinaryTableUnit.Variable) {
                        throw new Error("zip code must be variable");
                    }
                    let lengthByte: number;
                    [lengthByte, posBits] = readBits(posBits, field.length * 8, buffer);
                    const zip = buffer.subarray((posBits >> 3), (posBits >> 3) + lengthByte);
                    fieldData = decodeZipCode(zip);
                    posBits += lengthByte * 8;
                }
                break;
        }
        if (fieldData != null) {
            columns.push(fieldData);
        }
    }
    return [columns, posBits];
}

export function writeBinaryFields(data: any[], fields: BinaryTableField[], encodeText: TextEncodeFunction): Uint8Array {
    if (data.length < fields.length) {
        throw new Error("FIXME");
    }

    let sizeBits = 0;
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        switch (field.type) {
            case BinaryTableType.Boolean:
                if (field.unit !== BinaryTableUnit.Bit) {
                    throw new Error("FIXME");
                }
                if (field.length !== 1) {
                    throw new Error("FIXME");
                }
                sizeBits++;
                break;
            case BinaryTableType.UnsignedInteger:
                if (field.unit === BinaryTableUnit.Bit) {
                    sizeBits += field.length;
                } else if (field.unit === BinaryTableUnit.Byte) {
                    sizeBits += field.length * 8;
                } else {
                    throw new Error("FIXME");
                }
                break;
            case BinaryTableType.Integer:
                if (field.unit !== BinaryTableUnit.Byte) {
                    throw new Error("must be byte");
                }
                if ((sizeBits & 7) !== 0) {
                    throw new Error("must be byte aligned");
                }
                if (field.length === 1) {
                    sizeBits += 8;
                } else if (field.length === 2) {
                    sizeBits += 16;
                } else if (field.length === 4) {
                    sizeBits += 32;
                } else {
                    throw new Error("length must be 1, 2, or 4");
                }
                break;
            case BinaryTableType.String:
                if ((sizeBits & 7) !== 0) {
                    throw new Error("string must be byte aligned");
                }
                if (field.unit === BinaryTableUnit.Byte) {
                    sizeBits += field.length * 8;
                } else if (field.unit === BinaryTableUnit.Variable) {
                    sizeBits += field.length * 8;
                    let encoded = new Uint8Array(encodeText(data[i]));
                    sizeBits += encoded.length * 8;
                } else {
                    throw new Error("string must be byte or variable");
                }
                break;
            case BinaryTableType.Pad:
                if (field.unit === BinaryTableUnit.Byte) {
                    sizeBits += field.length * 8;
                } else if (field.unit === BinaryTableUnit.Bit) {
                    sizeBits += field.length;
                } else {
                    throw new Error("variable not allowed");
                }
                break;
            case BinaryTableType.ZipCode:
                throw new Error("Z is not allowed");
        }
    }
    const buffer = new Uint8Array((sizeBits + 7) >> 3);
    let posBits = 0;
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        switch (field.type) {
            case BinaryTableType.Boolean:
                if (field.unit !== BinaryTableUnit.Bit) {
                    throw new Error("FIXME");
                }
                if (field.length !== 1) {
                    throw new Error("FIXME");
                }
                posBits = writeBits(posBits, 1, buffer, data[i] ? 1 : 0);
                break;
            case BinaryTableType.UnsignedInteger:
                let lengthInBits: number;
                if (field.unit === BinaryTableUnit.Bit) {
                    lengthInBits = field.length;
                } else if (field.unit === BinaryTableUnit.Byte) {
                    lengthInBits = field.length * 8;
                } else {
                    throw new Error("FIXME");
                }
                if (lengthInBits > 32) {
                    throw new Error("FIXME");
                }
                posBits = writeBits(posBits, lengthInBits, buffer, Number(data[i]));
                break;
            case BinaryTableType.Integer:
                if (field.unit !== BinaryTableUnit.Byte) {
                    throw new Error("must be byte");
                }
                if ((posBits & 7) !== 0) {
                    throw new Error("must be byte aligned");
                }
                if (field.length === 1) {
                    buffer[posBits >> 3] = Number(data[i]);
                    posBits += 8;
                } else if (field.length === 2) {
                    buffer[posBits >> 3] = Number(data[i] >> 8);
                    posBits += 8;
                    buffer[posBits >> 3] = Number(data[i]);
                    posBits += 8;
                } else if (field.length === 4) {
                    buffer[posBits >> 3] = Number(data[i] >> 24);
                    posBits += 8;
                    buffer[posBits >> 3] = Number(data[i] >> 16);
                    posBits += 8;
                    buffer[posBits >> 3] = Number(data[i] >> 8);
                    posBits += 8;
                    buffer[posBits >> 3] = Number(data[i]);
                    posBits += 8;
                } else {
                    throw new Error("length must be 1, 2, or 4");
                }
                break;
            case BinaryTableType.String:
                if ((posBits & 7) !== 0) {
                    throw new Error("string must be byte aligned");
                }
                const encoded = encodeText(data[i]);
                if (field.unit === BinaryTableUnit.Byte) {
                    if (encoded.length === field.length) {
                        buffer.set(encoded, posBits >> 3);
                        posBits += field.length * 8;
                    } else if (encoded.length > field.length) {
                        // 切り捨てる (TR-B14 第三分冊 8.1.15.6参照)
                        // EUC-JP的に不完全な文字列だと死にそう
                        buffer.set(encoded.subarray(0, field.length), posBits >> 3);
                        posBits += field.length * 8;
                    } else {
                        // スペースを付加 (TR-B14 第三分冊 8.1.15.6参照)
                        buffer.set(encoded, posBits >> 3);
                        posBits += encoded.length * 8;
                        for (let i = encoded.length; i < field.length; i++) {
                            buffer[posBits >> 3] = 0x20;
                            posBits += 8;
                        }
                    }
                } else if (field.unit === BinaryTableUnit.Variable) {
                    posBits = writeBits(posBits, field.length * 8, buffer, encoded.length);
                    buffer.set(encoded, posBits >> 3);
                    posBits += encoded.length * 8;
                } else {
                    throw new Error("string must be byte or variable");
                }
                break;
            case BinaryTableType.Pad:
                if (field.unit === BinaryTableUnit.Byte) {
                    posBits += field.length * 8;
                } else if (field.unit === BinaryTableUnit.Bit) {
                    posBits += field.length;
                } else {
                    throw new Error("variable not allowed");
                }
                break;
            case BinaryTableType.ZipCode:
                throw new Error("Z is not allowed");
        }
    }
    return buffer;
}


export class BinaryTable {
    rows: any[][];
    fields: BinaryTableField[];

    constructor(table: Uint8Array, structure: string, decodeText: TextDecodeFunction) {
        const { rows, fields } = BinaryTable.constructBinaryTable(table, structure, decodeText);
        this.rows = rows;
        this.fields = fields;
    }

    static constructBinaryTable(buffer: Uint8Array, structure: string, decodeText: TextDecodeFunction): { rows: any[][], fields: BinaryTableField[] } {
        const sep = structure.split(",");
        if (sep.length < 2) {
            throw new Error("FIXME");
        }
        if (!sep[0].match(/^(?<lengthByte>[1-9][0-9]*|0)$/)) {
            throw new Error("FIXME");
        }
        const lengthByte = Number.parseInt(sep[0]);
        let posBits = 0;
        const fields = parseBinaryStructure(structure.substring(structure.indexOf(",") + 1));
        if (!fields) {
            throw new Error("FIXME: failed to parse structure");
        }
        const rows: Array<Array<any>> = [];
        while (posBits < buffer.length * 8) {
            let length = 0;
            if (lengthByte) {
                [length, posBits] = readBits(posBits, 8 * lengthByte, buffer);
            }
            let [columns, read] = readBinaryFields(buffer, fields, decodeText, posBits);
            posBits = lengthByte ? posBits + length * 8 : read;
            rows.push(columns);
        }
        return { rows, fields };
        //const regex = /^(?<lengthByte>[1-9][0-9]*|0)(,(?<type>[BUISZP]):(?<length>[1-9][0-9]*)(?<unit>[BbV]))+$/;
    }

    public get nrow(): number {
        return this.rows.length;
    }

    public get ncolumn(): number {
        return this.fields.length;
    }
    public close(): number {
        return 0;
    }
    public toNumber(row: number, column: number): number {
        return Number((this.rows[row] ?? [])[column]);
    }
    public toString(row: number, column: number): string | null {
        return (this.rows[row] ?? [])[column]?.toString();
    }
    public toArray(startRow: number, numRow: number): any[][] | null {
        return this.rows.slice(startRow, startRow + numRow).map(x => {
            return x.map((v, i) => {
                if (this.fields[i].type === BinaryTableType.ZipCode) {
                    return null;
                } else {
                    return v;
                }
            })
        });
    }
    public search(startRow: number, ...args: any[]): number {
        if (args.length % 3 !== 0 || args.length < 6) {
            throw new TypeError("argument");
        }
        // 条件は4つまで
        if (args.length > (1 + 3 + 4 * 4)) {
            throw new TypeError("argument");
        }
        const logic = args[args.length - 3] as boolean;
        const limitCount = args[args.length - 2] as number;
        const resultArray = args[args.length - 1] as any[];
        resultArray.length = 0;
        for (let i = startRow; i < this.rows.length; i++) {
            let results = new Array(args.length / 3 - 1);
            for (let c = 0; c < args.length - 3; c += 3) {
                const searchedColumn = args[c] as number;
                const compared = args[c + 1] as any;
                const operator = args[c + 2] as SearchOperator;
                const column = this.rows[i][searchedColumn];
                let result = false;
                switch (operator) {
                    case SearchOperator.Equal:
                        result = column == Number(compared);
                        break;
                    case SearchOperator.NotEqual:
                        result = column != Number(compared);
                        break;
                    case SearchOperator.Less: // <
                        result = column < Number(compared);
                        break;
                    case SearchOperator.LessEqual: // <=
                        result = column <= Number(compared);
                        break;
                    case SearchOperator.Greater: // >
                        result = column > Number(compared);
                        break;
                    case SearchOperator.GreaterEqual: // >=
                        result = column >= Number(compared);
                        break;
                    case SearchOperator.And: // &
                        result = !!(column & Number(compared));
                        break;
                    case SearchOperator.Or: // |
                        result = !!(column | Number(compared));
                        break;
                    case SearchOperator.Xor: // ^
                        result = !!(column ^ Number(compared));
                        break;
                    case SearchOperator.Nand: // ~&
                        result = !!~(column & Number(compared));
                        break;
                    case SearchOperator.Nor: // ~|
                        result = !!~(column | Number(compared));
                        break;
                    case SearchOperator.Nxor: // ~^
                        result = !!~(column ^ Number(compared));
                        break;
                    case SearchOperator.StringMatches:
                        result = column === String(compared);
                        break;
                    case SearchOperator.StringIncludes:
                        result = String(column).includes(compared);
                        break;
                    case SearchOperator.StringStarsWith:
                        result = String(column).startsWith(compared);
                        break;
                    case SearchOperator.StringEndsWith:
                        result = String(column).endsWith(compared);
                        break;
                    case SearchOperator.StringNotMatch:
                        result = column !== String(compared);
                        break;
                    case SearchOperator.StringNotInclude:
                        result = !String(column).includes(compared);
                        break;
                    case SearchOperator.BoolEqualTo:
                        result = column === Boolean(compared);
                        break;
                    case SearchOperator.BoolNotEqualTo:
                        result = column !== Boolean(compared);
                        break;
                    case SearchOperator.ZipInclude:
                        result = zipCodeInclude(column as ZipCode, Number(compared))
                        break;
                    case SearchOperator.ZipNotInclude:
                        result = !zipCodeInclude(column as ZipCode, Number(compared))
                        break;
                }
                results[c / 3] = result;
            }
            // logic: true => OR
            // logic: false => AND
            let result: boolean;
            if (logic) {
                result = results.some(x => x);
            } else {
                result = results.every(x => x);
            }
            if (result) {
                resultArray.push(this.rows[i].map((v, j) => {
                    if (this.fields[j].type === BinaryTableType.ZipCode) {
                        let found = false;
                        for (let c = 0; c < args.length - 3; c += 3) {
                            const searchedColumn = args[c] as number;
                            if (searchedColumn === j) {
                                if (results[c / 3]) {
                                    return true;
                                } else {
                                    // 同じ列に対して複数の検索条件が指定される可能性
                                    found = true;
                                }
                            }
                        }
                        if (found) {
                            return false;
                        }
                        return null;
                    }
                    return v;
                }));
            }
            if (resultArray.length >= limitCount) {
                return i;
            }
        }
        return -1;
    }

}
