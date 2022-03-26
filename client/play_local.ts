import { ResponseMessage } from "../server/ws_api";
import { BMLBrowser, BMLBrowserFontFace, EPG } from "./bml_browser";
import { VideoPlayer } from "./player/video_player";
import { RemoteControl } from "./remote_controller_client";
import { keyCodeToAribKey } from "./document";
import { decodeTS } from "../server/decode_ts";

// BML文書と動画と字幕が入る要素
const browserElement = document.getElementById("data-broadcasting-browser")!;
// 動画が入っている要素
const videoContainer = browserElement.querySelector(".arib-video-container") as HTMLElement;
// BMLが非表示になっているときに動画を前面に表示するための要素
const invisibleVideoContainer = browserElement.querySelector(".arib-video-invisible-container") as HTMLElement;
// BML文書が入る要素
const contentElement = browserElement.querySelector(".data-broadcasting-browser-content") as HTMLElement;
// BML用フォント
const roundGothic: BMLBrowserFontFace = { source: "url('KosugiMaru-Regular.ttf'), url('/rounded-mplus-1m-arib.ttf'), local('MS Gothic')" };
const boldRoundGothic: BMLBrowserFontFace = { source: "url('KosugiMaru-Regular.ttf'), url('/rounded-mplus-1m-arib.ttf'), local('MS Gothic')" };
const squareGothic: BMLBrowserFontFace = { source: "url('Kosugi-Regular.ttf'), url('/rounded-mplus-1m-arib.ttf'), local('MS Gothic')" };

// リモコン
const remoteControl = new RemoteControl(document.getElementById("remote-control")!, browserElement.querySelector(".remote-control-receiving-status")!);

const epg: EPG = {
    tune(originalNetworkId, transportStreamId, serviceId) {
        console.error("tune", originalNetworkId, transportStreamId, serviceId);
        return false;
    }
};

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
});

remoteControl.bmlDocument = bmlBrowser.bmlDocument;
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
    browserElement.style.minWidth = evt.detail.resolution.width + "px";
    browserElement.style.maxWidth = evt.detail.resolution.width + "px";
    browserElement.style.minHeight = evt.detail.resolution.height + "px";
    browserElement.style.maxHeight = evt.detail.resolution.height + "px";
});

window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }
    const k = keyCodeToAribKey(event.key);
    if (k == -1) {
        return;
    }
    event.preventDefault();
    bmlBrowser.bmlDocument.processKeyDown(k);
});

window.addEventListener("keyup", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.key === "Tab") {
        return;
    }
    const k = keyCodeToAribKey(event.key);
    if (k == -1) {
        return;
    }
    event.preventDefault();
    bmlBrowser.bmlDocument.processKeyUp(k);
});

function onMessage(msg: ResponseMessage) {
    bmlBrowser.emitMessage(msg);
}
const tsInput = document.getElementById("ts") as HTMLInputElement;
const tsUrl = document.getElementById("url") as HTMLInputElement;
const tsUrlSubmit = document.getElementById("url-submit") as HTMLInputElement;
const tsUrlErr = document.getElementById("url-err") as HTMLPreElement;

async function openReadableStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    const tsStream = decodeTS(onMessage);
    while (true) {
        const r = await reader.read();
        if (r.done) {
            return;
        }
        const chunk = r.value;
        if (chunk != null) {
            tsStream._transform(chunk, null, () => { });
        }
    }
}
tsInput.addEventListener("change", () => {
    const file = tsInput.files?.item(0);
    if (file == null) {
        return;
    }
    tsInput.disabled = true;
    const stream = file.stream() as unknown as ReadableStream<Uint8Array>;
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
bmlBrowser.launchStartupDocument();
