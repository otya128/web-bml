import { jisToUnicodeMap } from "./jis_to_unicode_map";
import { unicodeToJISMap } from "./unicode_to_jis_map";

// EUC-JPからstringに変換する
export function decodeEUCJP(input: Uint8Array): string {
    if (input.length === 0) {
        return "";
    }
    let buffer = new Uint16Array(input.length);
    buffer[0] = 1;
    const isBE = new Uint8Array(buffer.buffer)[0] === 0;
    let outOff = 0;
    const replacementCharacter = 0xfffd; // �
    for (let i = 0; i < input.length; i++) {
        if (input[i] >= 0xa1 && input[i] <= 0xfe) {
            const ku = input[i] - 0xa0;
            i++;
            if (i >= input.length) {
                buffer[outOff++] = replacementCharacter;
                break;
            }
            if (input[i] < 0xa1 || input[i] > 0xfe) {
                buffer[outOff++] = replacementCharacter;
                continue;
            }
            const ten = input[i] - 0xa0;
            const uni = jisToUnicodeMap[(ku - 1) * 94 + (ten - 1)];
            if (typeof uni === "number") {
                if (uni >= 0) {
                    buffer[outOff++] = uni;
                } else {
                    buffer[outOff++] = replacementCharacter;
                }
            } else {
                for (const u of uni) {
                    buffer[outOff++] = u;
                }
            }
        } else if (input[i] < 0x80) {
            buffer[outOff++] = input[i];
        } else if (input[i] === 0x8e) {
            // 半角カナカナは運用しない (STD-B24 第二分冊(2/2) 第二編 付属1 13.2.1 表13-1, TR-B14 第二分冊 3.4.1.2 表3-12)
            buffer[outOff++] = replacementCharacter;
            i++;
        } else if (input[i] === 0x8f) {
            // 3バイト文字(JIS X 0212-1990)は運用しない (STD-B24 第二分冊(2/2) 第二編 付属1 13.2.1 表13-1, TR-B14 第二分冊 3.4.1.2 表3-12)
            buffer[outOff++] = replacementCharacter;
            i += 2;
        } else {
            buffer[outOff++] = replacementCharacter;
        }
    }
    return new TextDecoder(isBE ? "utf-16be" : "utf-16le").decode(buffer.subarray(0, outOff));
}

export function encodeEUCJP(input: string): Uint8Array {
    const buf = new Uint8Array(input.length * 2);
    let off = 0;
    for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);
        const a = unicodeToJISMap[c];
        if (a == null && c < 0x80) {
            buf[off++] = c;
            continue;
        }
        const jis = (a ?? 0x222e) + (0xa0a0 - 0x2020); // 〓
        if (jis >= 0x100) {
            buf[off++] = jis >> 8;
            buf[off++] = jis & 0xff;
        } else {
            buf[off++] = jis;
        }
    }
    return buf.subarray(0, off);
}

export function stripStringEUCJP(input: string, maxBytes: number): string {
    // 1, 2バイト文字しか存在しない
    if (input.length * 2 < maxBytes) {
        return input;
    }
    let bytes = 0;
    for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);
        const size = c < 0x80 ? 1 : 2;
        if (bytes + size > maxBytes) {
            return input.substring(0, i);
        }
        bytes += size;
    }
    return input;
}
