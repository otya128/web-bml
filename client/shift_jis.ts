import { jisToUnicodeMap } from "./jis_to_unicode_map";
import { unicodeToJISMap } from "./unicode_to_jis_map";

export function decodeShiftJIS(input: Uint8Array): string {
    if (input.length === 0) {
        return "";
    }
    const replacementCharacter = "\ufffd"; // �
    let buffer = "";
    for (let i = 0; i < input.length; i++) {
        if (input[i] >= 0x81 && input[i] <= 0xef) {
            let ku;
            if (input[i] >= 0x81 && input[i] <= 0x9f) {
                ku = (input[i] - 0x81) * 2 + 1;
            } else if (input[i] >= 0xe0 && input[i] <= 0xef) {
                ku = (input[i] - 0xe0) * 2 + 63;
            } else if (input[i] >= 0xa1 && input[i] <= 0xdf) {
                buffer += String.fromCharCode(input[i] - 0xa0 + 0xff60);
                continue;
            } else {
                buffer += replacementCharacter;
                continue;
            }
            i++;
            if (i >= input.length) {
                buffer += replacementCharacter;
                break;
            }
            let ten;
            if (input[i] >= 0x40 && input[i] <= 0x7e) {
                ten = input[i] - 0x40 + 1;
            } else if (input[i] >= 0x80 && input[i] <= 0x9e) {
                ten = input[i] - 0x80 + 64;
            } else if (input[i] >= 0x9f && input[i] <= 0xfc) {
                ku++;
                ten = input[i] - 0x9f + 1;
            } else {
                buffer += replacementCharacter;
                continue;
            }
            const uni = jisToUnicodeMap[(ku - 1) * 94 + (ten - 1)];
            if (typeof uni === "number") {
                if (uni >= 0) {
                    buffer += String.fromCharCode(uni);
                } else {
                    buffer += replacementCharacter;
                }
            } else {
                for (const u of uni) {
                    buffer += String.fromCharCode(u);
                }
            }
        } else if (input[i] < 0x80) {
            buffer += String.fromCharCode(input[i]);
        } else {
            buffer += replacementCharacter;
        }
    }
    return buffer;
}

export function encodeShiftJIS(input: string): Uint8Array {
    const buf = new Uint8Array(input.length * 2);
    let off = 0;
    for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);
        if (c >= 0xff61 && c <= 0xff9f) {
            buf[off++] = c - 0xff60 + 0xa0;
            continue;
        }
        const a = unicodeToJISMap[c];
        if (a == null && c < 0x80) {
            buf[off++] = c;
            continue;
        }
        const jis = (a ?? 0x222e) - 0x2020; // 〓
        const ku = jis >>> 8;
        const ten = jis & 0xff;
        if (ku >= 1 && ku <= 62) {
            buf[off++] = (ku >>> 1) + 0x81 - 1;
        } else if (ku >= 63 && ku <= 94) {
            buf[off++] = (ku >>> 1) - 63 + 0xe0;
        }
        if (ku % 2 === 1) {
            if (ten >= 1 && ten <= 63) {
                buf[off++] = ten + 0x40 - 1;
            } else {
                buf[off++] = ten + 0x80 - 64;
            }
        } else {
            buf[off++] = ten + 0x9f - 1;
        }
    }
    return buf.subarray(0, off);
}

export function stripStringShiftJIS(input: string, maxBytes: number): string {
    // 1, 2バイト文字しか存在しない
    if (input.length * 2 < maxBytes) {
        return input;
    }
    let bytes = 0;
    for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);
        const size = c < 0x80 || (c >= 0xff61 && c <= 0xff9f) ? 1 : 2;
        if (bytes + size > maxBytes) {
            return input.substring(0, i);
        }
        bytes += size;
    }
    return input;
}
