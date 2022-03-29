// STD-B24 TR-B14 TR-B15で規定されるAIFFのサブセットを再生する
// 12 kHz 1ch 16-bit

type COMM = {
    numChannels: number,
    numSampleFrames: number,
    sampleSize: number,
    sampleRate: number,
};

function decodeAIFF(aiff: Buffer): { comm: COMM, soundData: Buffer } | null {
    let off = 0;
    const ckID = aiff.toString("ascii", off, off + 4);
    if (ckID !== "FORM") {
        return null;
    }
    off += 4;
    const ckDataSize = aiff.readUInt32BE(off);
    off += 4;
    const endOffset = Math.min(off + ckDataSize, aiff.length);
    const formType = aiff.toString("ascii", off, off + 4);
    if (formType !== "AIFC") {
        return null;
    }
    off += 4;
    let comm: COMM | undefined;
    let soundData: Buffer | undefined;
    while (off < endOffset) {
        const ckID = aiff.toString("ascii", off, off + 4);
        off += 4;
        const ckDataSize = aiff.readUInt32BE(off);
        off += 4;
        const nextOff = off + ckDataSize;
        if (ckID === "COMM") {
            const numChannels = aiff.readUInt16BE(off);
            off += 2;
            const numSampleFrames = aiff.readUInt32BE(off); // samples/channel
            off += 4;
            const sampleSize = aiff.readUInt16BE(off); // bits/sample
            off += 2;
            soundData = Buffer.alloc((numSampleFrames * numChannels * sampleSize + 7) / 8);
            const sampleRateRaw = aiff.subarray(off, off + 10); // sample_frames/sec
            const exponent = (sampleRateRaw.readUInt16BE(0) & 0x7fff) - 16383 - 63;
            let fraction = sampleRateRaw.readBigUInt64BE(2);
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
            const compressionType = aiff.toString("ascii", off, off + 4);
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
            const offset = aiff.readUInt32BE(off);
            off += 4;
            const blockSize = aiff.readUInt32BE(off);
            off += 4;
            aiff.copy(soundData, off, offset, nextOff);
        }
        off = nextOff;
    }
    if (comm == null || soundData == null) {
        return null;
    }
    return { comm, soundData };
}

export function playAIFF(context: AudioContext, aiff: Buffer): AudioBufferSourceNode | null {
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
    const buffer = context.createBuffer(1, soundDataF32.length, comm.sampleRate);
    buffer.copyToChannel(soundDataF32, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
    return source;
}
