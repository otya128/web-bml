import { Buffer } from "buffer";
import { preparePLTE, prepareTRNS } from "./arib_png";

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

type Frame = {
    image: string,
    delay: number,
    keep: boolean,
    x: number,
    y: number,
};

export type MNGAnimation = { keyframes: Keyframe[], options: KeyframeAnimationOptions, width: number, height: number, blobs: string[] };

export function aribMNGToCSSAnimation(mng: Buffer<ArrayBuffer>, clut: number[][]): MNGAnimation | null {
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
    let ihdr: Buffer<ArrayBuffer> | undefined;
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
                const image = URL.createObjectURL(frameImage);

                // 初回アニメーションのフレーム遷移時に一瞬何も表示されなくなりちらつきが発生してしまうためとりあえずあらかじめ画像を読んでデコードされることを期待しておく
                // ChromeとFirefoxで動くので大丈夫そう
                new Image().src = image;

                frames.push({
                    delay: fram.interframeDelay,
                    x: defi.xLocation,
                    y: defi.yLocation,
                    image,
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
