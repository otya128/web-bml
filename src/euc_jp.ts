import { jisToUnicodeMap } from "./jis_to_unicode_map";
// EUC-JPからstringに変換する
export function decodeEUCJP(input: Uint8Array): string {
    let buffer = new Uint16Array(input.length);
    let outOff = 0;
    for (let i = 0; i < input.length; i++) {
        if (input[i] >= 0xa1 && input[i] <= 0xfe) {
            const ku = input[i] - 0xa0;
            i++;
            if (i >= input.length) {
                buffer[outOff++] = 0xfffd; // �
                break;
            }
            const ten = input[i] - 0xa0;
            const uni = jisToUnicodeMap[(ku - 1) * 94 + (ten - 1)];
            if (uni.length === 1) {
                buffer[outOff++] = uni.charCodeAt(0);
            } else if (uni.length === 0) {
                buffer[outOff++] = 0xfffd; // �
            } else {
                for (let j = 0; j < uni.length; j++) {
                    buffer[outOff++] = uni.charCodeAt(j);
                }
            }
        } else if (input[i] < 0x80) {
            buffer[outOff++] = input[i];
        } else if (input[i] === 0x8e) {
            // 半角カナカナ
            throw new Error("A");
        } else {
            throw new Error("A");
        }
    }
    return new TextDecoder("utf-16").decode(buffer.subarray(0, outOff));
}
