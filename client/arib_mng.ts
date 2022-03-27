import CRC32 from "crc-32";
import { Buffer } from "buffer";
import { preparePLTE, prepareTRNS } from "./arib_png";
import { BinaryWriter } from "./drcs";

type MHDR = {
    frameWidth: number,
    frameHeight: number,
    ticksPerSecond: number,
    nominalLayerCount: number,
    nominalFrameCount: number,
    nominalPlayTime: number,
    simplicityProfile: number,
};

type TERM = {
    terminationAction: number,
    actionAfterIterations: number,
    delay: number,
    iterationMax: number,
};

type FRAM = {
    framingMode: number,
    interframeDelay: number,
};

type DEFI = {
    objectId: number,
    doNotShowFlag: number,
    concreteFlag: number,
    xLocation: number,
    yLocation: number,
};

// STD-B24, TR-B14, TR-B15で規定されたMNGのサブセットとAPNGに完全な互換性はないため以下の場合変換できない
// * IHDRがフレームごとに存在するためビット深度が違う画像が混在した場合
//      * 8以外はほぼ使われないと思われる
// * x_location, y_locationが負または画像がwidth, heightをはみ出す場合
//      * MNG中のPNGオブジェクトサイズは不変と規定されている(TR-B14, TR-B15)のでそんな変なMNGはまず想定しなくて良い
export function aribMNGToAPNG(mng: Buffer, clut: number[][]): Buffer | null {
    const plte = preparePLTE(clut);
    const trns = prepareTRNS(clut);
    const writer = new BinaryWriter();
    let inOff = 0;
    // 臼NG
    writer.writeUInt8(0x89);
    writer.writeUInt8(0x50);
    writer.writeUInt8(0x4e);
    writer.writeUInt8(0x47);
    writer.writeUInt8(0x0d);
    writer.writeUInt8(0x0a);
    writer.writeUInt8(0x1a);
    writer.writeUInt8(0x0a);
    inOff += 8;
    let mhdr: MHDR | undefined;
    let term: TERM | undefined;
    let fram: FRAM = {
        framingMode: 1,
        interframeDelay: 1,
    };
    let defi: DEFI = {
        objectId: 0,
        doNotShowFlag: 0,
        concreteFlag: 0,
        xLocation: 0,
        yLocation: 0,
    };
    let frame = 0;
    let seqNumber = 0;
    let actlOffset: number | undefined;
    while (inOff < mng.byteLength) {
        let chunkLength = mng.readUInt32BE(inOff);
        let chunkType = mng.toString("ascii", inOff + 4, inOff + 8);
        if (chunkType === "PLTE" || chunkType == "tRNS") {
            // PLTEとtRNSは削除
        } else if (chunkType === "MHDR") {
            mhdr = {
                frameWidth: mng.readUInt32BE(inOff + 8 + 0),
                frameHeight: mng.readUInt32BE(inOff + 8 + 4),
                ticksPerSecond: mng.readUInt32BE(inOff + 8 + 8), // 0以外
                nominalLayerCount: mng.readUInt32BE(inOff + 8 + 12), // 0に固定
                nominalFrameCount: mng.readUInt32BE(inOff + 8 + 16), // 0に固定
                nominalPlayTime: mng.readUInt32BE(inOff + 8 + 20), // 0に固定
                simplicityProfile: mng.readUInt32BE(inOff + 8 + 24), // 0に固定
            };
            writer.writeUInt32BE(13);
            const ihdrOff = writer.position;
            writer.writeASCII("IHDR");
            writer.writeUInt32BE(mhdr.frameWidth);
            writer.writeUInt32BE(mhdr.frameHeight);
            // 色深度は1,2,4,8が運用されるがAPNGではIHDRは1つのみ定義できるため8に固定せざるを得ない
            writer.writeUInt8(8);
            // 以下は固定値で運用される
            writer.writeUInt8(3); // カラータイプ
            writer.writeUInt8(0); // 圧縮方法
            writer.writeUInt8(0); // フィルタリング方法
            writer.writeUInt8(0); // インターレース方法
            writer.writeInt32BE(CRC32.buf(writer.subarray(ihdrOff))); // CRC32
            writer.writeUInt32BE(8);
            actlOffset = writer.writeASCII("acTL");
            // この部分は後で書き換える
            writer.writeUInt32BE(0); // num_frames
            writer.writeUInt32BE(0); // num_plays
            writer.writeInt32BE(0); // CRC32
            writer.writeBuffer(plte);
            writer.writeBuffer(trns);
        } else if (chunkType === "MEND") {
        } else if (chunkType === "TERM") {
            term = {
                terminationAction: mng.readUInt8(inOff + 8 + 0), // 3に固定
                actionAfterIterations: mng.readUInt8(inOff + 8 + 1), // 0に固定
                delay: mng.readUInt32BE(inOff + 8 + 2), // 0に固定
                iterationMax: mng.readUInt32BE(inOff + 8 + 6),
            };
        } else if (chunkType === "FRAM") {
            let framingMode = mng.readUInt8(inOff + 8 + 0); // 0, 1, 3
            if (framingMode !== 0) {
                fram.framingMode = framingMode;
            }
            if (chunkLength >= 10) {
                const subframeName = mng.readUInt8(inOff + 8 + 1); // 0に固定 ("")
                const changeInterfameName = mng.readUInt8(inOff + 8 + 2); // 2に固定 interframeDelayのデフォルトを設定する
                const changeSyncTimeoutAndTermination = mng.readUInt8(inOff + 8 + 3); // 0に固定 変更しない
                const changeSubframeClippingBoundaries = mng.readUInt8(inOff + 8 + 4); // 0に固定 変更しない
                const changeSyncIdList = mng.readUInt8(inOff + 8 + 5); // 0に固定 変更しない
                const interframeDelay = mng.readUInt32BE(inOff + 8 + 6); // tick
                if (changeInterfameName == 2) {
                    fram.interframeDelay = interframeDelay;
                }
            }
        } else if (chunkType === "DEFI") {
            defi = {
                objectId: mng.readUInt16BE(inOff + 8 + 0), // 0に固定
                doNotShowFlag: mng.readUInt8(inOff + 8 + 2), // 0に固定
                concreteFlag: mng.readUInt8(inOff + 8 + 3), // 0に固定
                xLocation: mng.readUInt32BE(inOff + 8 + 4),
                yLocation: mng.readUInt32BE(inOff + 8 + 8),
            };
        } else if (chunkType === "IHDR") {
            const width = mng.readUInt32BE(inOff + 8 + 0);
            const height = mng.readUInt32BE(inOff + 8 + 4);
            const bitDepth = mng.readUInt8(inOff + 8 + 8);
            if (mhdr == null) {
                return null;
            }
            if (bitDepth !== 8) {
                return null;
            }
            writer.writeUInt32BE(26);
            const fctlOff = writer.position;
            writer.writeASCII("fcTL");
            writer.writeUInt32BE(seqNumber); // sequence_number
            writer.writeUInt32BE(width); // width
            writer.writeUInt32BE(height); // height
            writer.writeUInt32BE(defi.xLocation); // x_offset
            writer.writeUInt32BE(defi.yLocation); // y_offset
            writer.writeUInt16BE(fram.interframeDelay); // delay_num 分子
            writer.writeUInt16BE(mhdr.ticksPerSecond); // delay_den 分母
            // 0: 消去しない
            // 1: 透過色で消去
            // 2: 前のフレームの状態に戻す
            // framing mode = 1 単純に上書き
            if (fram.framingMode === 1) {
                writer.writeUInt8(0); // dispose_op
            } else {
                // framing mode = 3 透明色で消去
                writer.writeUInt8(1); // dispose_op
            }
            // 0: α値も全て上書き
            // 1: α値を使って合成
            // 多分1
            writer.writeUInt8(1); // blend_op
            writer.writeInt32BE(CRC32.buf(writer.subarray(fctlOff))); // CRC32
            seqNumber++;
        } else if (chunkType === "IDAT") {
            if (frame === 0) {
                writer.writeBuffer(mng.subarray(inOff, inOff + chunkLength + 4 + 4 + 4));
            } else {
                // fdAT
                writer.writeUInt32BE(4 + chunkLength);
                const fdatOff = writer.writeASCII("fdAT");
                writer.writeUInt32BE(seqNumber);
                writer.writeBuffer(mng.subarray(inOff + 4 + 4, inOff + 4 + 4 + chunkLength));
                writer.writeInt32BE(CRC32.buf(writer.subarray(fdatOff))); // CRC32
                seqNumber++;
            }
            frame++;
        } else {
        }
        inOff += chunkLength + 4 + 4 + 4;
    }
    writer.writeUInt32BE(0);
    writer.writeASCII("IEND");
    writer.writeInt32BE(CRC32.buf(writer.subarray(writer.position - 4)));
    const output = writer.getBuffer();
    if (actlOffset != null) {
        output.writeUInt32BE(frame, actlOffset + 4); // num_frames
        if (term == null) {
            // termination action = 0 ループしない
            output.writeUInt32BE(1, actlOffset + 8); // num_plays
        } else if (term.iterationMax !== 0x7fffffff) {
            // termination action = 3
            output.writeUInt32BE(term.iterationMax, actlOffset + 8); // num_plays
        }
        output.writeInt32BE(CRC32.buf(output.subarray(actlOffset, actlOffset + 12)), actlOffset + 12); // CRC32
    }
    return output;
}

type Frame = {
    image: string,
    delay: number,
    keep: boolean,
    x: number,
    y: number,
};

export type MNGAnimation = { keyframes: Keyframe[], options: KeyframeAnimationOptions, width: number, height: number, blobs: string[] };

export function aribMNGToCSSAnimation(mng: Buffer, clut: number[][]): MNGAnimation | null {
    const frames: Frame[] = [];
    const plte = preparePLTE(clut);
    const trns = prepareTRNS(clut);
    // 臼NG\r\n\x1a\n
    const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    let inOff = 0;
    inOff += 8;
    let mhdr: MHDR | undefined;
    let term: TERM | undefined;
    let fram: FRAM = {
        framingMode: 1,
        interframeDelay: 1,
    };
    let defi: DEFI = {
        objectId: 0,
        doNotShowFlag: 0,
        concreteFlag: 0,
        xLocation: 0,
        yLocation: 0,
    };
    let ihdr: Buffer | undefined;
    let animationLength = 0;
    while (inOff < mng.byteLength) {
        let chunkLength = mng.readUInt32BE(inOff);
        let chunkType = mng.toString("ascii", inOff + 4, inOff + 8);
        if (chunkType === "PLTE" || chunkType == "tRNS") {
            // PLTEとtRNSは削除
        } else if (chunkType === "MHDR") {
            mhdr = {
                frameWidth: mng.readUInt32BE(inOff + 8 + 0),
                frameHeight: mng.readUInt32BE(inOff + 8 + 4),
                ticksPerSecond: mng.readUInt32BE(inOff + 8 + 8), // 0以外
                nominalLayerCount: mng.readUInt32BE(inOff + 8 + 12), // 0に固定
                nominalFrameCount: mng.readUInt32BE(inOff + 8 + 16), // 0に固定
                nominalPlayTime: mng.readUInt32BE(inOff + 8 + 20), // 0に固定
                simplicityProfile: mng.readUInt32BE(inOff + 8 + 24), // 0に固定
            };
        } else if (chunkType === "MEND") {
        } else if (chunkType === "TERM") {
            term = {
                terminationAction: mng.readUInt8(inOff + 8 + 0), // 3に固定
                actionAfterIterations: mng.readUInt8(inOff + 8 + 1), // 0に固定
                delay: mng.readUInt32BE(inOff + 8 + 2), // 0に固定
                iterationMax: mng.readUInt32BE(inOff + 8 + 6),
            };
        } else if (chunkType === "FRAM") {
            let framingMode = mng.readUInt8(inOff + 8 + 0); // 0, 1, 3
            if (framingMode !== 0) {
                fram.framingMode = framingMode;
            }
            if (chunkLength >= 10) {
                const subframeName = mng.readUInt8(inOff + 8 + 1); // 0に固定 ("")
                const changeInterfameName = mng.readUInt8(inOff + 8 + 2); // 2に固定 interframeDelayのデフォルトを設定する
                const changeSyncTimeoutAndTermination = mng.readUInt8(inOff + 8 + 3); // 0に固定 変更しない
                const changeSubframeClippingBoundaries = mng.readUInt8(inOff + 8 + 4); // 0に固定 変更しない
                const changeSyncIdList = mng.readUInt8(inOff + 8 + 5); // 0に固定 変更しない
                const interframeDelay = mng.readUInt32BE(inOff + 8 + 6); // tick
                if (changeInterfameName == 2) {
                    fram.interframeDelay = interframeDelay;
                }
            }
        } else if (chunkType === "DEFI") {
            defi = {
                objectId: mng.readUInt16BE(inOff + 8 + 0), // 0に固定
                doNotShowFlag: mng.readUInt8(inOff + 8 + 2), // 0に固定
                concreteFlag: mng.readUInt8(inOff + 8 + 3), // 0に固定
                xLocation: mng.readUInt32BE(inOff + 8 + 4),
                yLocation: mng.readUInt32BE(inOff + 8 + 8),
            };
        } else if (chunkType === "IHDR") {
            ihdr = mng.subarray(inOff, inOff + chunkLength + 4 + 4 + 4);
        } else if (chunkType === "IDAT") {
            if (ihdr != null) {
                const idat = mng.subarray(inOff, inOff + chunkLength + 4 + 4 + 4);
                const frameImage = new Blob([pngSignature, ihdr, plte, trns, idat], { type: "image/png" });
                frames.push({
                    delay: fram.interframeDelay,
                    x: defi.xLocation,
                    y: defi.yLocation,
                    image: URL.createObjectURL(frameImage),
                    // framing mode = 1 単純に上書き
                    // framing mode = 3 透明色で消去
                    keep: fram.framingMode !== 3,
                });
                animationLength += fram.interframeDelay;
            }
        } else {
        }
        inOff += chunkLength + 4 + 4 + 4;
    }
    const keyframes: Keyframe[] = [];
    const backgroundImage: string[] = [];
    const backgroundPosition: string[] = [];
    let offset = 0;
    for (const frame of frames) {
        backgroundImage.unshift("url(" + CSS.escape(frame.image) + ")");
        backgroundPosition.unshift(`${frame.x}px ${frame.y}px`);
        keyframes.push({
            backgroundImage: backgroundImage.join(","),
            backgroundPosition: backgroundPosition.join(","),
            backgroundRepeat: "no-repeat",
            offset: offset / animationLength,
            easing: "step-end",
        });
        if (!frame.keep) {
            backgroundImage.length = 0;
            backgroundPosition.length = 0;
        }
        offset += frame.delay;
    }
    let options: KeyframeAnimationOptions = {};
    if (term == null) {
        // termination action = 0 ループしない
        options.iterations = 1;
    } else if (term.iterationMax !== 0x7fffffff) {
        options.iterations = term.iterationMax;
    } else {
        options.iterations = Infinity;
    }
    if (mhdr == null) {
        return null;
    }
    options.duration = (1000 * animationLength) / mhdr.ticksPerSecond;
    options.fill = "forwards";
    return { keyframes, options, width: mhdr.frameWidth, height: mhdr.frameHeight, blobs: frames.map(x => x.image) };
}
