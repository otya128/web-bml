// STD-B24 第二編 付属2 5.4.3.4で定められている挙動をするようにする
// charCodeAtとfromCharCodeを上書きするのでやばい
// 比較もEUC-JPベースでやる必要はある
import { unicodeToJISMap } from "../src/unicode_to_jis_map";
import { jisToUnicodeMap } from "../src/jis_to_unicode_map";
const originalCharCodeAt = String.prototype.charCodeAt;
const originalFromCharCode = String.fromCharCode;

function eucJPCharCodeAt(this: string, index: number): number {
    const orig = originalCharCodeAt.call(this, index);
    if (Number.isNaN(orig)) {
        return orig;
    }
    if (orig < 0x100) {
        return orig;
    }
    const jis = unicodeToJISMap[orig];
    if (jis == null) {
        return jis;
    }
    return jis + (0xa0a0 - 0x2020);
}

function eucJPFromCharCode(...codes: number[]): string {
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

export function overrideString() {
    // EUC-JPベースで動いてるらしい
    String.prototype.charCodeAt = eucJPCharCodeAt;
    String.fromCharCode = eucJPFromCharCode;
}
