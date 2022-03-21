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

function playBuffer(context: AudioContext, buf: Float32Array) {
    const buffer = context.createBuffer(1, buf.length, context.sampleRate)
    buffer.copyToChannel(buf, 0)
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
}

function sine(sampleRate: number, i: number, freq: number) {
    var sampleFreq = sampleRate / freq;
    return Math.sin(i / (sampleFreq / (Math.PI * 2)));
}

export function playRomSound(soundId: number) {
    switch (soundId) {
        case 5:
            playSound5();
            break;
        case 7:
            playSound7();
            break;
        case 9:
            playSound9();
            break;
        default:
            break;
    }
}

// 選択音
function playSound5() {
    const context = new AudioContext();
    const buf = new Float32Array(context.sampleRate * 0.2), volume = 0.1;
    const len = context.sampleRate * 0.2;
    for (let i = 0; i < len; i++) {
        buf[i] += sine(context.sampleRate, i, 4680) * volume * (1 - i / len); // envelope
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(context.sampleRate, i, 4160) * volume * (1 - i / len);
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(context.sampleRate, i, 3640) * volume * 0.25  * (1 - i / len);
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(context.sampleRate, i, 520) * volume * (1 - i / len);
    }
    playBuffer(context, buf);
}

// 6は5の連続

// 決定音
function playSound7() {
    const context = new AudioContext();
    const buf = new Float32Array(context.sampleRate * 0.2), volume = 0.1;
    for (let i = 0; i < context.sampleRate * 0.05; i++) {
        buf[i] += sine(context.sampleRate, i, 2100) * volume;
    }
    for (let i = context.sampleRate * 0.04; i < context.sampleRate * 0.2; i++) {
        buf[i] += sine(context.sampleRate, i, 1400) * volume;
    }
    for (let i = context.sampleRate * 0.04; i < context.sampleRate * 0.2; i++) {
        buf[i] += sine(context.sampleRate, i, 4200) * volume * 0.6;
    }
    playBuffer(context, buf);
}

// 8は7の連続

// 選択音
function playSound9() {
    const context = new AudioContext();
    const buf = new Float32Array(context.sampleRate * 0.09), volume = 0.1;
    const len = context.sampleRate * 0.09;
    for (let i = 0; i < len; i++) {
        buf[i] += sine(context.sampleRate, i, 5200) * volume * (1 - i / len); // envelope
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(context.sampleRate, i, 3120) * volume * (1 - i / len);
    }
    for (let i = 0; i < len; i++) {
        buf[i] += sine(context.sampleRate, i, 1040) * volume * (1 - i / len);
    }
    playBuffer(context, buf);
}

// 10は9の連続
