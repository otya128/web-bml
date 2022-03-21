export { };
import * as resource from "./resource";
// @ts-ignore
import { EPGStationRecordedParam, MirakLiveParam, Param, ResponseMessage } from "../server/ws_api";
import { MP4VideoPlayer } from "./player/mp4";
import { MPEGTSVideoPlayer } from "./player/mpegts";
import { HLSVideoPlayer } from "./player/hls";
import { NullVideoPlayer } from "./player/null";
import { BMLBrowser } from "./bml_browser";
import { VideoPlayer } from "./player/video_player";
function getParametersFromUrl(url: string): Param | {} {
    const pathname = new URL(url).pathname;
    const demultiplexServiceId = Number.parseInt(new URL(url).searchParams.get("demultiplexServiceId") ?? "");
    const baseParam = { demultiplexServiceId: undefined as (number | undefined) };
    if (Number.isInteger(demultiplexServiceId)) {
        baseParam.demultiplexServiceId = demultiplexServiceId;
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

const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/ws?param=" + encodeURIComponent(JSON.stringify(getParametersFromUrl(location.href))));

let player: VideoPlayer | undefined;
const videoContainer = document.querySelector("#arib-video-container")! as HTMLElement;
const bmlBrowser = new BMLBrowser(document.body, videoContainer);
ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data) as ResponseMessage;
    bmlBrowser.onMessage(msg);

    if (msg.type === "videoStreamUrl") {
        const videoElement = videoContainer.querySelector("video") as HTMLVideoElement; // a
        const container = document.querySelector("#arib-video-cc-container") as HTMLElement;
        switch (new URLSearchParams(location.search).get("format")) {
            case "mp4":
                player = new MP4VideoPlayer(videoElement, container);
                break;
            case "hls":
                player = new HLSVideoPlayer(videoElement, container);
                break;
            case "null":
                player = new NullVideoPlayer(videoElement, container);
                break;
            default:
            case "mpegts-h264":
                player = new MPEGTSVideoPlayer(videoElement, container);
                break;
        }
        player.setSource(msg.videoStreamUrl);
        player.play();
        videoElement.style.display = "";
    }
});
bmlBrowser.launchStartupDocument();
