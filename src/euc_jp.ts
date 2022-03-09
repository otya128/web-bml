import { jisToUnicodeMap } from "./jis_to_unicode_map";
// EUC-JPからstringに変換する
export function decodeEUCJP(input: Uint8Array): string {
    let buffer = new Uint16Array(input.length);
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
    return new TextDecoder("utf-16").decode(buffer.subarray(0, outOff));
}
