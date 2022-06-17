import { BaseParam, EPGStationRecordedParam, MirakLiveParam, Param, ResponseMessage } from "../server/ws_api";
import { MP4VideoPlayer } from "./player/mp4";
import { MPEGTSVideoPlayer } from "./player/mpegts";
import { HLSVideoPlayer } from "./player/hls";
import { NullVideoPlayer } from "./player/null";
import { BMLBrowser, BMLBrowserFontFace, EPG, IP } from "./bml_browser";
import { VideoPlayer } from "./player/video_player";
import { RemoteControl } from "./remote_controller_client";
import { keyCodeToAribKey } from "./content";
import { OverlayInputApplication } from "./overlay_input";

function getParametersFromUrl(urlString: string): Param | {} {
    const url = new URL(urlString);
    const pathname = url.pathname;
    const params = url.searchParams;
    const demultiplexServiceId = Number.parseInt(params.get("demultiplexServiceId") ?? "");
    const seek = Number.parseInt(params.get("seek") ?? "");
    const baseParam: BaseParam = {};
    if (Number.isInteger(demultiplexServiceId)) {
        baseParam.demultiplexServiceId = demultiplexServiceId;
    }
    if (Number.isInteger(seek)) {
        baseParam.seek = seek;
    }
    const mirakGroups = /^\/channels\/(?<type>.+?)\/(?<channel>.+?)\/(services\/(?<serviceId>.+?)\/)?stream\/*$/.exec(pathname)?.groups;
    if (mirakGroups != null) {
        const type = decodeURIComponent(mirakGroups.type);
        const channel = decodeURIComponent(mirakGroups.channel);
        const serviceId = Number.parseInt(decodeURIComponent(mirakGroups.serviceId));
        return {
            type: "mirakLive",
            channel,
            channelType: type,
            serviceId: Number.isNaN(serviceId) ? undefined : serviceId,
            ...baseParam
        } as MirakLiveParam;
    } else {
        const epgGroups = /^\/videos\/(?<videoId>.+?)\/*$/.exec(pathname)?.groups;
        if (epgGroups != null) {
            const videoFileId = Number.parseInt(decodeURIComponent(epgGroups.videoId));
            if (!Number.isNaN(videoFileId)) {
                return {
                    type: "epgStationRecorded",
                    videoFileId,
                    ...baseParam
                } as EPGStationRecordedParam;
            }
        }
    }
    return baseParam;
}

const format = new URLSearchParams(location.search).get("format");
const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/ws?param=" + encodeURIComponent(JSON.stringify(getParametersFromUrl(location.href))));

let player: VideoPlayer | undefined;
// BML文書と動画と字幕が入る要素
const browserElement = document.getElementById("data-broadcasting-browser")!;
// 動画が入っている要素
const videoContainer = browserElement.querySelector(".arib-video-container") as HTMLElement;
// BMLが非表示になっているときに動画を前面に表示するための要素
const invisibleVideoContainer = browserElement.querySelector(".arib-video-invisible-container") as HTMLElement;
// BML文書が入る要素
const contentElement = browserElement.querySelector(".data-broadcasting-browser-content") as HTMLElement;
// BML用フォント
const roundGothic: BMLBrowserFontFace = { source: "url('/KosugiMaru-Regular.ttf'), url('/rounded-mplus-1m-arib.ttf'), local('MS Gothic')" };
const boldRoundGothic: BMLBrowserFontFace = { source: "url('/KosugiMaru-Regular.ttf'), url('/rounded-mplus-1m-arib.ttf'), local('MS Gothic')" };
const squareGothic: BMLBrowserFontFace = { source: "url('/Kosugi-Regular.ttf'), url('/rounded-mplus-1m-arib.ttf'), local('MS Gothic')" };

// リモコン
const remoteControl = new RemoteControl(document.getElementById("remote-control")!, browserElement.querySelector(".remote-control-receiving-status")!, browserElement.querySelector(".remote-control-networking-status") as HTMLElement);

const epg: EPG = {
    tune(originalNetworkId, transportStreamId, serviceId) {
        console.error("tune", originalNetworkId, transportStreamId, serviceId);
        return false;
    }
};

const apiIP: IP = {
    getConnectionType() {
        return 403;
    },
    isIPConnected() {
        return 1;
    },
    async transmitTextDataOverIP(uri, body) {
        try {
            const res = await window.fetch("/api/post/" + uri, {
                method: "POST",
                body,
            });
            return { resultCode: 1, statusCode: res.status.toString(), response: new Uint8Array(await res.arrayBuffer()) };
        } catch {
            return { resultCode: NaN, statusCode: "", response: new Uint8Array() };
        }
    },
    async get(uri) {
        try {
            const res = await window.fetch("/api/get/" + uri, {
                method: "GET",
            });
            return { statusCode: res.status, headers: res.headers, response: new Uint8Array(await res.arrayBuffer()) };
        } catch {
            return {};
        }
    },
    async confirmIPNetwork(destination, isICMP, timeoutMillis) {
        try {
            const res = await window.fetch("/api/confirm?" + new URLSearchParams({
                destination,
                isICMP: isICMP ? "true" : "false",
                timeoutMillis: timeoutMillis.toString()
            }), {
                method: "GET",
            });
            const result = await res.json();
            return result;
        } catch {
            return null;
        }
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
    ip: apiIP,
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

function onMessage(msg: ResponseMessage) {
    bmlBrowser.emitMessage(msg);
    if (msg.type === "videoStreamUrl") {
        const videoElement = videoContainer.querySelector("video") as HTMLVideoElement;
        const ccContainer = browserElement.querySelector(".arib-video-cc-container") as HTMLElement;
        switch (format) {
            case "mp4":
                player = new MP4VideoPlayer(videoElement, ccContainer);
                break;
            case "hls":
                player = new HLSVideoPlayer(videoElement, ccContainer);
                break;
            case "null":
                player = new NullVideoPlayer(videoElement, ccContainer);
                break;
            case "mpegts-h264":
            default:
                player = new MPEGTSVideoPlayer(videoElement, ccContainer);
                break;
        }
        player.setSource(msg.videoStreamUrl);
        player.setPRAAudioNode(new AudioContext().destination);
        player.play();
        videoElement.style.display = "";
        remoteControl.player = player;
    }
}

ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data) as ResponseMessage;
    onMessage(msg);
});
