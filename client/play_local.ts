import { ResponseMessage } from "../server/ws_api";
import { BMLBrowser, BMLBrowserFontFace, EPG } from "./bml_browser";
import { RemoteControl } from "./remote_controller_client";
import { keyCodeToAribKey } from "./content";
import { decodeTS } from "../server/decode_ts";
import { CaptionPlayer } from "./player/caption_player";
import { OverlayInputApplication } from "./overlay_input";

// BML文書と動画と字幕が入る要素
const browserElement = document.getElementById("data-broadcasting-browser")!;
// 動画が入っている要素
const videoContainer = browserElement.querySelector(".arib-video-container") as HTMLElement;
// BMLが非表示になっているときに動画を前面に表示するための要素
const invisibleVideoContainer = browserElement.querySelector(".arib-video-invisible-container") as HTMLElement;
// BML文書が入る要素
const contentElement = browserElement.querySelector(".data-broadcasting-browser-content") as HTMLElement;
// BML用フォント
const roundGothic: BMLBrowserFontFace = { source: "url('/KosugiMaru-Regular.woff2'), local('MS Gothic')" };
const boldRoundGothic: BMLBrowserFontFace = { source: "url('/KosugiMaru-Bold.woff2'), local('MS Gothic')" };
const squareGothic: BMLBrowserFontFace = { source: "url('/Kosugi-Regular.woff2'), local('MS Gothic')" };

// リモコン
const remoteControl = new RemoteControl(document.getElementById("remote-control")!, browserElement.querySelector(".remote-control-receiving-status")!);

const epg: EPG = {
    tune(originalNetworkId, transportStreamId, serviceId) {
        console.error("tune", originalNetworkId, transportStreamId, serviceId);
        return false;
    }
};

const inputApplication = new OverlayInputApplication(browserElement.querySelector(".overlay-input-container") as HTMLElement);

const bmlBrowser = new BMLBrowser({
    containerElement: contentElement,
    mediaElement: videoContainer,
    indicator: remoteControl,
    fonts: {
        roundGothic,
        boldRoundGothic,
        squareGothic
    },
    epg,
    inputApplication,
});

remoteControl.content = bmlBrowser.content;
// trueであればデータ放送の上に動画を表示させる非表示状態
bmlBrowser.addEventListener("invisible", (evt) => {
    console.log("invisible", evt.detail);
    const s = invisibleVideoContainer.style;
    if (evt.detail) {
        s.display = "block";
        invisibleVideoContainer.appendChild(videoContainer);
    } else {
        s.display = "none";
        const obj = bmlBrowser.getVideoElement();
        if (obj != null) {
            obj.appendChild(videoContainer);
        }
    }
});

bmlBrowser.addEventListener("load", (evt) => {
    console.log("load", evt.detail);
    browserElement.style.width = evt.detail.resolution.width + "px";
    browserElement.style.height = evt.detail.resolution.height + "px";
    ccContainer.style.width = evt.detail.resolution.width + "px";
    ccContainer.style.height = evt.detail.resolution.height + "px";
});

window.addEventListener("keydown", (event) => {
    if (inputApplication.isLaunching) {
        return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }
    const k = keyCodeToAribKey(event.key);
    if (k == -1) {
        return;
    }
    event.preventDefault();
    bmlBrowser.content.processKeyDown(k);
});

window.addEventListener("keyup", (event) => {
    const k = keyCodeToAribKey(event.key);
    if (k == -1) {
        return;
    }
    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
    }
    bmlBrowser.content.processKeyUp(k);
});

const videoElement = videoContainer.querySelector("video") as HTMLVideoElement;
const ccContainer = browserElement.querySelector(".arib-video-cc-container") as HTMLElement;
const player = new CaptionPlayer(videoElement, ccContainer);
let pcr: number | undefined;
let baseTime: number | undefined;
let basePCR: number | undefined;
remoteControl.player = player;
player.setPRAAudioNode(new AudioContext().destination);

function onMessage(msg: ResponseMessage) {
    if (msg.type === "pes") {
        player.push(msg.streamId, Uint8Array.from(msg.data), msg.pts);
    } else if (msg.type === "pcr") {
        pcr = (msg.pcrBase + msg.pcrExtension / 300) / 90;
    }
    bmlBrowser.emitMessage(msg);
}

const tsInput = document.getElementById("ts") as HTMLInputElement;
const tsUrl = document.getElementById("url") as HTMLInputElement;
const tsUrlSubmit = document.getElementById("url-submit") as HTMLInputElement;
const tsUrlErr = document.getElementById("url-err") as HTMLPreElement;

async function delayAsync(msec: number): Promise<void> {
    return new Promise<void>((resolve, _) => {
        setTimeout(resolve, msec);
    });
}

async function openReadableStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    const params = new URLSearchParams(location.search);
    const serviceId = Number.parseInt(params.get("demultiplexServiceId") ?? "");
    const tsStream = decodeTS({ sendCallback: onMessage, parsePES: true, serviceId: isNaN(serviceId) ? undefined : serviceId });
    tsStream.on("data", () => { });
    while (true) {
        const r = await reader.read();
        if (r.done) {
            return;
        }
        const chunk = r.value;
        // 1秒分くらい一気にデコードしてしまうので100パケット程度に分割
        const chunkSize = 188 * 100;
        for (let i = 0; i < chunk.length; i += chunkSize) {
            const prevPCR = pcr;
            tsStream._transform(chunk.subarray(i, i + chunkSize), null, () => { });
            const curPCR = pcr;
            const nowTime = performance.now();
            if (prevPCR == null) {
                baseTime = nowTime;
                basePCR = curPCR;
            } else if (curPCR != null && prevPCR < curPCR && baseTime != null && basePCR != null) {
                const playingSpeed = 1.0;
                const delay = ((curPCR - basePCR) / playingSpeed) - (nowTime - baseTime);
                if (delay >= 1) {
                    await delayAsync(Math.min(delay, 10000));
                } else if (delay < -1000) {
                    // あまりにずれた場合基準を再設定する
                    baseTime = nowTime;
                    basePCR = curPCR;
                }
            } else if (curPCR != null && prevPCR > curPCR) {
                baseTime = nowTime;
                basePCR = curPCR;
            }
            if (prevPCR !== curPCR && curPCR != null) {
                player.updateTime(curPCR);
            }
        }
    }
}
tsInput.addEventListener("change", () => {
    const file = tsInput.files?.item(0);
    if (file == null) {
        return;
    }
    tsInput.disabled = true;
    const stream = file.stream();
    openReadableStream(stream);
});
if (tsUrlSubmit != null) {
    tsUrlSubmit.addEventListener("click", async () => {
        if (!tsUrl.value.startsWith("http://") && !tsUrl.value.startsWith("https://")) {
            tsUrlErr.textContent = "URLが不正です";
            return;
        }
        tsUrlErr.textContent = "";
        tsUrlSubmit.disabled = true;
        try {
            var response = await fetch(tsUrl.value);
        } catch (e) {
            tsUrlSubmit.disabled = false;
            console.error(e);
            tsUrlErr.textContent = String(e);
            return;
        }
        const stream = response.body;
        if (stream == null) {
            tsUrlSubmit.disabled = false;
        } else {
            await openReadableStream(stream);
        }
    });
}
