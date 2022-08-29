import { decodeEUCJP, encodeEUCJP } from "./euc_jp";
import { decodeShiftJIS, encodeShiftJIS } from "./shift_jis";
import { Profile } from "./resource";

export type TextDecodeFunction = (input: Uint8Array) => string;
export type TextEncodeFunction = (input: string) => Uint8Array;

export function getTextDecoder(profile: Profile | undefined): TextDecodeFunction {
    if (profile === Profile.TrProfileC) {
        return decodeEUCJP;
    } else {
        return decodeShiftJIS;
    }
}

export function getTextEncoder(profile: Profile | undefined): TextEncodeFunction {
    if (profile === Profile.TrProfileC) {
        return encodeEUCJP;
    } else {
        return encodeShiftJIS;
    }
}
