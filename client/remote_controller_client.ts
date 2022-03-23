import { Indicator } from "./bml_browser";
import { AribKeyCode, keyCodeToAribKey, BMLDocument } from "./document";
import { VideoPlayer } from "./player/video_player";
import { RemoteControllerMessage } from "./remote_controller";

export class RemoteControl implements Indicator {
    public bmlDocument?: BMLDocument;
    public player?: VideoPlayer;
    element: HTMLElement;
    receivingStatusElement: HTMLElement;
    constructor(element: HTMLElement, receivingStatusElement: HTMLElement, bmlDocument?: BMLDocument, player?: VideoPlayer) {
        this.bmlDocument = bmlDocument;
        this.player = player;
        this.element = element;
        this.receivingStatusElement = receivingStatusElement;

        this.element.querySelectorAll("button").forEach(x => {
            x.addEventListener("click", () => {
                if (x.id === "unmute" || x.id === "mute" || x.id === "play" || x.id === "pause" || x.id === "cc" || x.id === "disable-cc" || x.id === "zoom-100" || x.id === "zoom-150" || x.id === "zoom-200") {
                    this.process({ type: x.id });
                } else {
                    this.process({ type: "button", keyCode: Number.parseInt(x.id.split("key")[1]) });
                }
            });
        });
    }
    private process(remoteController: RemoteControllerMessage) {
        if (remoteController != null) {
            if (remoteController.type === "unmute") {
                this.player?.unmute();
            } else if (remoteController.type === "mute") {
                this.player?.mute();
            } else if (remoteController.type === "pause") {
                this.player?.pause();
            } else if (remoteController.type === "play") {
                this.player?.play();
            } else if (remoteController.type === "cc") {
                this.player?.showCC();
            } else if (remoteController.type === "disable-cc") {
                this.player?.hideCC();
            } else if (remoteController.type === "zoom-100") {
                document.documentElement.style.transform = "";
                this.player?.scale(1);
            } else if (remoteController.type === "zoom-150") {
                document.documentElement.style.transform = "scale(150%)";
                document.documentElement.style.transformOrigin = "left top";
                this.player?.scale(1.5);
            } else if (remoteController.type === "zoom-200") {
                document.documentElement.style.transform = "scale(200%)";
                document.documentElement.style.transformOrigin = "left top";
                this.player?.scale(2);
            } else if (remoteController.type === "button") {
                this.bmlDocument?.processKeyDown(remoteController.keyCode as AribKeyCode);
                this.bmlDocument?.processKeyUp(remoteController.keyCode as AribKeyCode);
            } else if (remoteController.type === "keydown") {
                const k = keyCodeToAribKey(remoteController.key);
                if (k != -1) {
                    this.bmlDocument?.processKeyDown(k);
                }
            } else if (remoteController.type === "keyup") {
                const k = keyCodeToAribKey(remoteController.key);
                if (k != -1) {
                    this.bmlDocument?.processKeyUp(k);
                }
            }
        }
    }
    url = "";
    receiving = false;
    eventName: string | null = "";
    loading = false;
    private update() {
        const indicator = this.element.querySelector(".remote-control-indicator");
        if (indicator != null) {
            indicator.textContent = this.url + (this.loading ? "を読み込み中..." : "") + "\n" + (this.eventName ?? "番組名未取得");
        }
        if (this.receiving) {
            this.receivingStatusElement.style.display = "";
        } else {
            this.receivingStatusElement.style.display = "none";
        }
    }
    public setUrl(name: string, loading: boolean): void {
        this.url = name;
        this.loading = loading;
        this.update();
    }
    public setReceivingStatus(receiving: boolean): void {
        this.receiving = receiving;
        this.update();
    }
    public setEventName(eventName: string | null): void {
        this.eventName = eventName;
        this.update();
    }
}
