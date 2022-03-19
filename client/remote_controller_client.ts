import { browserState } from "./browser";
import { AribKeyCode, keyCodeToAribKey, processKeyDown, processKeyUp } from "./document";
import { RemoteControllerMessage } from "./remote_controller";

let currentRemoteControllerMessage: string | null = null;

export function setRemoteControllerMessage(msg: string | null) {
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

window.addEventListener("message", (ev) => {
    const remoteController = ev.data?.remoteController as (RemoteControllerMessage | undefined);
    if (remoteController != null) {
        if (remoteController.type === "unmute") {
            browserState.player?.unmute();
        } else if (remoteController.type === "mute") {
            browserState.player?.mute();
        } else if (remoteController.type === "pause") {
            browserState.player?.pause();
        } else if (remoteController.type === "play") {
            browserState.player?.play();
        } else if (remoteController.type === "cc") {
            browserState.player?.showCC();
        } else if (remoteController.type === "disable-cc") {
            browserState.player?.hideCC();
        } else if (remoteController.type === "zoom-100") {
        } else if (remoteController.type === "zoom-150") {
        } else if (remoteController.type === "zoom-200") {
        } else if (remoteController.type === "button") {
            processKeyDown(remoteController.keyCode as AribKeyCode);
            processKeyUp(remoteController.keyCode as AribKeyCode);
        } else if (remoteController.type === "keydown") {
            const k = keyCodeToAribKey(remoteController.key);
            if (k != -1) {
                processKeyDown(k);
            }
        } else if (remoteController.type === "keyup") {
            const k = keyCodeToAribKey(remoteController.key);
            if (k != -1) {
                processKeyUp(k);
            }
        } else if (remoteController.type === "load") {
            setRemoteControllerMessage(currentRemoteControllerMessage);
        }
    }
});

const remoteControllerFrame = createRemoteController();
document.documentElement.append(remoteControllerFrame);
