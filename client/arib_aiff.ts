// STD-B24 TR-B14 TR-B15で規定されるAIFFのサブセットを再生する
// 12 kHz 1ch 16-bit

type COMM = {
    numChannels: number,
    numSampleFrames: number,
    sampleSize: number,
    sampleRate: number,
};

function decodeAIFF(aiff: Uint8Array<ArrayBuffer>): { comm: COMM, soundData: Uint8Array<ArrayBuffer> } | null {
    let off = 0;
    const ckID = String.fromCharCode(...aiff.subarray(off, off + 4));
    if (ckID !== "FORM") {
        return null;
    }
    off += 4;
    const aiffView = new DataView(aiff.buffer, aiff.byteOffset, aiff.byteLength);
    const ckDataSize = aiffView.getUint32(off);
    off += 4;
    const endOffset = Math.min(off + ckDataSize, aiff.length);
    const formType = String.fromCharCode(...aiff.subarray(off, off + 4));
    if (formType !== "AIFC") {
        return null;
    }
    off += 4;
    let comm: COMM | undefined;
    let soundData: Uint8Array<ArrayBuffer> | undefined;
    while (off < endOffset) {
        const ckID = String.fromCharCode(...aiff.subarray(off, off + 4));
        off += 4;
        const ckDataSize = aiffView.getUint32(off);
        off += 4;
        const nextOff = off + ckDataSize;
        if (ckID === "COMM") {
            const numChannels = aiffView.getUint16(off);
            off += 2;
            const numSampleFrames = aiffView.getUint32(off); // samples/channel
            off += 4;
            const sampleSize = aiffView.getUint16(off); // bits/sample
            off += 2;
            soundData = new Uint8Array(Math.trunc((numSampleFrames * numChannels * sampleSize + 7) / 8));
            const sampleRateRaw = aiff.subarray(off, off + 10); // sample_frames/sec
            const sampleRateRawView = new DataView(sampleRateRaw.buffer, sampleRateRaw.byteOffset, sampleRateRaw.byteLength);
            const exponent = (sampleRateRawView.getUint16(0) & 0x7fff) - 16383 - 63;
            let fraction = sampleRateRawView.getBigUint64(2);
            if (sampleRateRaw[0] & 0x80) {
                fraction = -fraction;
            }
            let sampleRate = fraction;
            if (exponent > 0) {
                sampleRate *= BigInt(Math.pow(2, exponent));
            } else if (exponent < 0) {
                sampleRate /= BigInt(Math.pow(2, -exponent));
            }
            comm = {
                numChannels,
                numSampleFrames,
                sampleSize,
                sampleRate: Number(sampleRate),
            };
            off += 10;
            const compressionType = String.fromCharCode(...aiff.subarray(off, off + 4));
            if (compressionType !== "NONE") {
                return null;
            }
            // compressionName
        } else if (ckID === "SSND") {
            if (comm == null) {
                return null;
            }
            if (soundData == null) {
                return null;
            }
            const offset = aiffView.getUint32(off);
            off += 4;
            const blockSize = aiffView.getUint32(off);
            off += 4;
            soundData.set(aiff.subarray(off, nextOff), offset);
        }
        off = nextOff;
    }
    if (comm == null || soundData == null) {
        return null;
    }
    return { comm, soundData };
}

export function playAIFF(destination: AudioNode, aiff: Uint8Array<ArrayBuffer>): AudioBufferSourceNode | null {
    const a = decodeAIFF(aiff);
    if (a == null) {
        return null;
    }
    const { comm, soundData } = a;
    // 12 kHz 1ch 16-bitで運用される
    if (comm.numChannels !== 1) {
        return null;
    }
    if (comm.sampleSize !== 16) {
        return null;
    }
    const soundDataF32 = new Float32Array(comm.numSampleFrames);
    for (let i = 0; i < comm.numSampleFrames; i++) {
        soundDataF32[i] = (((soundData[i * 2] << 8) | (soundData[i * 2 + 1])) << 16 >> 16) / 32768;
    }
    const buffer = destination.context.createBuffer(1, soundDataF32.length, comm.sampleRate);
    buffer.copyToChannel(soundDataF32, 0);
    const source = destination.context.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    source.start(0);
    return source;
}
