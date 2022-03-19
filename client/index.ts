export { };
import * as resource from "./resource";
// @ts-ignore
import { JSInterpreter } from "./interpreter/js_interpreter";
import { browser, browserState } from "./browser";
import { launchDocument } from "./document";
import { ResponseMessage } from "../server/ws_api";
import { MP4VideoPlayer } from "./player/mp4";
import { MPEGTSVideoPlayer } from "./player/mpegts";
import { HLSVideoPlayer } from "./player/hls";
import { NullVideoPlayer } from "./player/null";

// const interpreter = new NativeInterpreter(browser);
const interpreter = new JSInterpreter(browser);
browserState.interpreter = interpreter;
resource.fetchResourceAsync("/40/0000").then(() => {
    if (resource.fetchLockedResource("/40/0000/startup.bml")) {
        launchDocument("/40/0000/startup.bml");
    } else {
        launchDocument("/40/0000");
    }
});

resource.resourceEventTarget.addEventListener("message", ((event: CustomEvent) => {
    const msg = event.detail as ResponseMessage;
    if (msg.type === "videoStreamUrl") {
        const videoElement = document.querySelector("video") as HTMLVideoElement; // a
        const container = document.querySelector("#arib-video-cc-container") as HTMLElement;
        switch (new URLSearchParams(location.search).get("format")) {
            case "mp4":
                browserState.player = new MP4VideoPlayer(videoElement, container);
                break;
            case "hls":
                browserState.player = new HLSVideoPlayer(videoElement, container);
                break;
            case "null":
                browserState.player = new NullVideoPlayer(videoElement, container);
                break;
            default:
            case "mpegts-h264":
                browserState.player = new MPEGTSVideoPlayer(videoElement, container);
                break;
        }
        browserState.player.setSource(msg.videoStreamUrl);
        browserState.player.play();
        videoElement.style.display = "";
    }
}) as EventListener);

browserState.broadcasterDatabase.openDatabase();
