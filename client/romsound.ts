/*
 * 受信機内蔵音 TR-B14 第二分冊 第三編 第2部 3.3.5
 * 0: 速報チャイム1
 * 1: 速報チャイム2
 * 2: 速報チャイム3
 * 3: 速報チャイム4
 * 4: 速報チャイム5
 * 5: ボタン操作音1
 * 6: ボタン操作音2
 * 7: ボタン操作音3
 * 8: ボタン操作音4
 * 9: ボタン操作音5
 * 10:ボタン操作音6
 * 11:ボタン操作音7
 * 12:ボタン操作音8
 * 13:アラート音
 * 14:
 * 15:
**/

const sampleRate = 12000 * 2;

function playBuffer(destination: AudioDestinationNode, buf: Float32Array, sampleRate: number) {
    const buffer = destination.context.createBuffer(1, buf.length, sampleRate)
    buffer.copyToChannel(buf, 0)
    const source = destination.context.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    source.start(0);
}

function sine(sampleRate: number, i: number, freq: number) {
    var sampleFreq = sampleRate / freq;
    return Math.sin(i / (sampleFreq / (Math.PI * 2)));
}

const romSoundCache = new Map<number, Float32Array>();

export function playRomSound(soundId: number, destination: AudioDestinationNode) {
    let cache = romSoundCache.get(soundId);
    if (cache == null) {
        switch (soundId) {
            case 5:
                cache = generateSound5(sampleRate);
                break;
            case 7:
                cache = generateSound7(sampleRate);
                break;
            case 9:
                cache = generateSound9(sampleRate);
                break;
            default:
                break;
        }
        if (cache != null) {
            romSoundCache.set(soundId, cache);
        }
    }
    if (cache != null) {
        playBuffer(destination, cache, sampleRate);
        return;
    }
}

// 選択音
function generateSound5(sampleRate: number): Float32Array {
    const buf = new Float32Array(sampleRate * 0.2), volume = 0.1;
    const len = sampleRate * 0.2;
    for (let i = 0; i < len; i++) {
        buf[i] += sine(sampleRate, i, 4680) * volume * (1 - i / len); // envelope
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(sampleRate, i, 4160) * volume * (1 - i / len);
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(sampleRate, i, 3640) * volume * 0.25 * (1 - i / len);
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(sampleRate, i, 520) * volume * (1 - i / len);
    }
    return buf;
}

// 6は5の連続

// 決定音
function generateSound7(sampleRate: number): Float32Array {
    const buf = new Float32Array(sampleRate * 0.2), volume = 0.1;
    for (let i = 0; i < sampleRate * 0.05; i++) {
        buf[i] += sine(sampleRate, i, 2100) * volume;
    }
    for (let i = sampleRate * 0.04; i < sampleRate * 0.2; i++) {
        buf[i] += sine(sampleRate, i, 1400) * volume;
    }
    for (let i = sampleRate * 0.04; i < sampleRate * 0.2; i++) {
        buf[i] += sine(sampleRate, i, 4200) * volume * 0.6;
    }
    return buf;
}

// 8は7の連続

// 選択音
function generateSound9(sampleRate: number): Float32Array {
    const buf = new Float32Array(sampleRate * 0.09), volume = 0.1;
    const len = sampleRate * 0.09;
    for (let i = 0; i < len; i++) {
        buf[i] += sine(sampleRate, i, 5200) * volume * (1 - i / len); // envelope
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(sampleRate, i, 3120) * volume * (1 - i / len);
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(sampleRate, i, 1040) * volume * (1 - i / len);
    }
    return buf;
}

// 10は9の連続
