export type ZipRange = {
    from: number,
    to: number,
}

export type ZipCode = {
    list: ZipRange[],
    excludeList: ZipRange[],
}

function decodeZipList(buffer: Uint8Array, length: number): ZipRange[] {
    let result: ZipRange[] = [];
    let off = 0;
    let prevFlag = 0;
    while (off < length) {
        if (buffer[off] & 0x80) {
            let digits = buffer[off] & 0x7f;
            off++;
            let flag = buffer[off] >> 4;
            let a = buffer[off] & 0xf;
            off++;
            let b = buffer[off] >> 4;
            let c = buffer[off] & 0xf;
            off++;
            let d = buffer[off] >> 4;
            let e = buffer[off] & 0xf;
            let digitList = [a, b, c, d, e];
            off++;
            switch (flag) {
                // 3digit list
                case 0x8:
                    for (const d of digitList) {
                        if (d >= 10 && d <= 0xe) {
                            throw new Error("d >= 10 && d <= 0xe 3digit list");
                        }
                        if (d === 0xf) {
                            continue;
                        }
                        result.push({ from: (digits * 10 + d) * 10000, to: (digits * 10 + d + 1) * 10000 - 1});
                    }
                    break;
                // 3digit range
                case 0x9:
                    if (a !== 0xf) {
                        throw new Error("a !== 0xf 3digit range");
                    }
                    if (b === 0xf || c === 0xf) {
                        throw new Error("b === 0xf || c === 0xf 3digit range");
                    }
                    result.push({ from: (digits * 10 + b) * 10000, to: (digits * 10 + c + 1) * 10000 - 1 });
                    if (d === 0xf || e === 0xf) {
                    } else if (d !== 0xf && e !== 0xf) {
                        result.push({ from: (digits * 10 + d) * 10000, to: (digits * 10 + e + 1) * 10000 - 1 });
                    } else {
                        throw new Error("not allowed d, e 3digit range");
                    }
                    break;
                // 5digit list
                case 0xA:
                    if (a === 0xf || b === 0xf || c === 0xf) {
                        throw new Error("a === 0xf || b === 0xf || c === 0xf 5digit list");
                    }
                    result.push({ from: (digits * 1000 + a * 100 + b * 10 + c) * 100, to: (digits * 1000 + a * 100 + b * 10 + c + 1) * 100 - 1 });
                    if (d === 0xf || e === 0xf) {
                    } else if (d !== 0xf && e !== 0xf) {
                        result.push({ from: (digits * 1000 + a * 100 + d * 10 + e) * 100, to: (digits * 1000 + a * 100 + d * 10 + e + 1) * 100 - 1});
                    } else {
                        throw new Error("not allowed d, e 5digit range");
                    }
                    break;
                // 5digit range From
                case 0xB:
                    if (a === 0xf || b === 0xf || c === 0xf || d !== 0xf || e !== 0xf) {
                        throw new Error("a === 0xf || b === 0xf || c === 0xf || d !== 0xf || e !== 0xf 5digit range");
                    }
                    result.push({ from: (digits * 1000 + a * 100 + b * 10 + c) * 100, to: (digits * 1000 + a * 100 + b * 10 + c) * 100 });
                    break;
                // 5digit range To
                case 0xC:
                    if (prevFlag !== 0xB) {
                        throw new Error("prevFlag !== 0xB 5digit range");
                    }
                    if (a === 0xf || b === 0xf || c === 0xf || d !== 0xf || e !== 0xf) {
                        throw new Error("a === 0xf || b === 0xf || c === 0xf || d !== 0xf || e !== 0xf 5digit range");
                    }
                    result[result.length - 1].to = (digits * 1000 + a * 100 + b * 10 + c + 1) * 100 - 1;
                    break;
                // 7digit range From
                case 0xD:
                case 0xF:
                    if (a === 0xf || b === 0xf || c === 0xf || d === 0xf || e === 0xf) {
                        throw new Error("a === 0xf || b === 0xf || c === 0xf || d === 0xf || e === 0xf 7digit range/list");
                    }
                    result.push({ from: digits * 100000 + a * 10000 + b * 1000 + c * 100 + d * 10 + e, to: digits * 100000 + a * 10000 + b * 1000 + c * 100 + d * 10 + e });
                    break;
                // 7digit range To
                case 0xE:
                    if (prevFlag !== 0xD) {
                        throw new Error("prevFlag !== 0xD 7digit range");
                    }
                    if (a === 0xf || b === 0xf || c === 0xf || d === 0xf || e === 0xf) {
                        throw new Error("a === 0xf || b === 0xf || c === 0xf || d === 0xf || e === 0xf 7digit range");
                    }
                    result[result.length - 1].to = digits * 100000 + a * 10000 + b * 1000 + c * 100 + d * 10 + e;
                    break;
            }
            prevFlag = flag;
        } else {
            let from = buffer[off] & 0x7f;
            off++;
            let to = buffer[off] & 0x7f;
            result.push({ from: from * 100000, to: (to + 1) * 100000 - 1 });
            off++;
            if (buffer[off] & 0x80) {
                let from2 = buffer[off] & 0x7f;
                off++;
                let to2 = buffer[off] & 0x7f;
                off++;
                result.push({ from: from2 * 100000, to: (to2 + 1) * 100000 - 1 });
            } else {
                off += 2;
            }
        }
    }
    return result;
}

export function decodeZipCode(buffer: Uint8Array): ZipCode {
    let length = buffer[0];
    let excludeListLength = buffer[1];
    return {
        excludeList: decodeZipList(buffer.slice(2), excludeListLength),
        list: decodeZipList(buffer.slice(2 + excludeListLength), length)
    };
}

function zipRangeInclude(zipRange: ZipRange[], compared: number): boolean {
    return zipRange.some(zip => zip.from <= compared && zip.to >= compared);
}

export function zipCodeInclude(zipCode: ZipCode, compared: number): boolean {
    return zipRangeInclude(zipCode.list, compared) && !zipRangeInclude(zipCode.excludeList, compared);
}
