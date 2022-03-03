
import encoding from "encoding-japanese";
export interface BinaryTableConstructor {
    new(table_ref: string, structure: string): IBinaryTable;// | null;
}
export interface IBinaryTable {
    nrow: number;
    ncolumn: number;
    close(): number;
    toNumber(row: number, column: number): number;
    toString(row: number, column: number): string | null;
    toArray(startRow: number, numRow: number): any[] | null;
    search(startRow: number, ...args: any[]): number;
}

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


export class BinaryTable implements IBinaryTable {
    rows: any[][];
    fields: BinaryTableField[];
    constructor(table_ref: string, structure: string) {
        var xhr = new XMLHttpRequest();
        if (table_ref.startsWith("~")) {
            table_ref = ".." + table_ref.substring(1);
        }
        let xhrBuffer: Uint8Array | null = null;
        xhr.open("GET", table_ref + "?base64", false);
        xhr.onload = (e) => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const arrayBuffer = xhr.response;
                    if (arrayBuffer) {
                        xhrBuffer = Uint8Array.from(window.atob(arrayBuffer), c => c.charCodeAt(0));
                    }
                } else {
                    console.error(xhr.statusText);
                }
            }
        };
        xhr.onerror = (e) => {
            console.error(xhr.statusText);
        };
        xhr.send(null);
        if (!xhrBuffer) {
            throw new Error("FIXME");
        }
        let buffer: Uint8Array = xhrBuffer as Uint8Array;
        const sep = structure.split(",");
        if (sep.length < 2) {
            throw new Error("FIXME");
        }
        if (!sep[0].match(/^(?<lengthByte>[1-9][0-9]*|0)$/)) {
            throw new Error("FIXME");
        }
        const lengthByte = Number.parseInt(sep[0]);
        let posBits = 0;
        const fields: BinaryTableField[] = [];
        this.fields = fields;
        for (const s of sep.slice(1)) {
            const groups = s.match(/^(?<type>[BUISZP]):(?<length>[1-9][0-9]*)(?<unit>[BbVv])$/)?.groups;
            if (!groups) {
                throw new Error("FIXME");
            }
            const type = groups["type"] as BinaryTableType;
            const length = Number.parseInt(groups["length"]);
            let unit = groups["unit"] as BinaryTableUnit;
            if (unit === "v" as BinaryTableUnit) {
                unit = BinaryTableUnit.Variable;
            }
            fields.push({ type, length, unit })
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
        const rows: Array<Array<any>> = [];
        while (posBits < buffer.length * 8) {
            let length = 0;
            if (lengthByte) {
                [length, posBits] = readBits(posBits, 8 * lengthByte, buffer);
            }
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
                            throw new Error("string must be byte or variale");
                        }
                        fieldData = encoding.convert(buffer.slice(posBits >> 3, (posBits >> 3) + lengthByte), { type: "string", to: "UNICODE", from: "EUCJP" });
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
                        throw new Error("notimplemented");
                }
                if (fieldData != null) {
                    columns.push(fieldData);
                }
            }
            rows.push(columns);
        }
        this.rows = rows;
        //const regex = /^(?<lengthByte>[1-9][0-9]*|0)(,(?<type>[BUISZP]):(?<length>[1-9][0-9]*)(?<unit>[BbV]))+$/;
    }

    public get nrow(): number {
        return this.fields.length;
    }

    public get ncolumn(): number {
        return this.rows.length;
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
    public toArray(startRow: number, numRow: number): any[] | null {
        throw new Error("notimpl");
        return [0];
    }
    public search(startRow: number, ...args: any[]): number {
        throw new Error("notimpl");
        return 0;
    }

}
