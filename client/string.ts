// STD-B24 第二編 付属2 5.4.3.4で定められている挙動をするようにする
// 比較もEUC-JPベースでやる必要はある
import { unicodeToJISMap } from "./unicode_to_jis_map";
import { jisToUnicodeMap } from "./jis_to_unicode_map";
import { decodeShiftJIS, encodeShiftJIS } from "./shift_jis";
export const originalCharCodeAt = String.prototype.charCodeAt;
export const originalFromCharCode = String.fromCharCode;

export function eucJPCharCodeAt(this: string, index: number): number {
    const orig = originalCharCodeAt.call(this, index);
    if (Number.isNaN(orig)) {
        return orig;
    }
    const jis = unicodeToJISMap[orig];
    if (jis == null) {
        return orig;
    }
    return jis + (0xa0a0 - 0x2020);
}

export function eucJPFromCharCode(...codes: number[]): string {
    return originalFromCharCode(...codes.flatMap(code => {
        const code1 = (code >> 8) & 0xff;
        const code2 = code & 0xff;
        if (code1 >= 0xa1 && code1 <= 0xfe) {
            if (code2 >= 0xa1 && code2 <= 0xfe) {
                const j = jisToUnicodeMap[(code1 - 0xa1) * 94 + code2 - 0xa1];
                if (typeof j === "number") {
                    return [j];
                }
                return j;
            }
        }
        return [code];
    }));
}

export function shiftJISCharCodeAt(this: string, index: number): number {
    const orig = originalCharCodeAt.call(this, index);
    if (Number.isNaN(orig)) {
        return orig;
    }
    const result = encodeShiftJIS(originalFromCharCode(orig));
    if (result.length >= 2) {
        return (result[0] << 8) | result[1];
    }
    return result[0];
}

export function shiftJISFromCharCode(...codes: number[]): string {
    return originalFromCharCode(...codes.flatMap(code => {
        const code2 = (code >> 8) & 0xff;
        const code1 = code & 0xff;
        if (code2 !== 0) {
            return [decodeShiftJIS(new Uint8Array([code2, code1])).charCodeAt(0)];
        } else if (code >= 0x80) {
            return [decodeShiftJIS(new Uint8Array([code])).charCodeAt(0)];
        } else {
            return [code];
        }
    }));
}
