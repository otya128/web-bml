import { AribKeyCode, keyCodeToAribKey, BMLDocument } from "./document";
import { VideoPlayer } from "./player/video_player";
import { RemoteControllerMessage } from "./remote_controller";

let currentRemoteControllerMessage: string | null = null;

function setRemoteControllerMessage(msg: string | null) {
    const remote = remoteControllerFrame.contentDocument?.getElementById("active");
    if (remote != null) {
        remote.textContent = msg;
    }
    currentRemoteControllerMessage = msg;
}

function createRemoteController(): HTMLIFrameElement {
    const controller = document.createElement("iframe");
    controller.src = "/remote_controller.html";
    controller.style.width = "280px";
    controller.style.height = "540px";
    controller.style.left = "1000px";
    controller.style.position = "absolute";
    controller.style.zIndex = "1000";
    return controller;
}

class RemoteControl {
    bmlDocument: BMLDocument;
    constructor(bmlDocument: BMLDocument, player: VideoPlayer) {
        this.bmlDocument = bmlDocument;
        window.addEventListener("message", (ev) => {
            const remoteController = ev.data?.remoteController as (RemoteControllerMessage | undefined);
            if (remoteController != null) {
                if (remoteController.type === "unmute") {
                    player?.unmute();
                } else if (remoteController.type === "mute") {
                    player?.mute();
                } else if (remoteController.type === "pause") {
                    player?.pause();
                } else if (remoteController.type === "play") {
                    player?.play();
                } else if (remoteController.type === "cc") {
                    player?.showCC();
                } else if (remoteController.type === "disable-cc") {
                    player?.hideCC();
                } else if (remoteController.type === "zoom-100") {
                    document.documentElement.style.transform = "";
                    player?.scale(1);
                } else if (remoteController.type === "zoom-150") {
                    document.documentElement.style.transform = "scale(150%)";
                    document.documentElement.style.transformOrigin = "left top";
                    player?.scale(1.5);
                } else if (remoteController.type === "zoom-200") {
                    document.documentElement.style.transform = "scale(200%)";
                    document.documentElement.style.transformOrigin = "left top";
                    player?.scale(2);
                } else if (remoteController.type === "button") {
                    bmlDocument.processKeyDown(remoteController.keyCode as AribKeyCode);
                    bmlDocument.processKeyUp(remoteController.keyCode as AribKeyCode);
                } else if (remoteController.type === "keydown") {
                    const k = keyCodeToAribKey(remoteController.key);
                    if (k != -1) {
                        bmlDocument.processKeyDown(k);
                    }
                } else if (remoteController.type === "keyup") {
                    const k = keyCodeToAribKey(remoteController.key);
                    if (k != -1) {
                        bmlDocument.processKeyUp(k);
                    }
                } else if (remoteController.type === "load") {
                    setRemoteControllerMessage(currentRemoteControllerMessage);
                }
            }
        });

        const remoteControllerFrame = createRemoteController();
        document.documentElement.append(remoteControllerFrame);
    }
}