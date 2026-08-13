import { VideoPlayer } from "./video_player";

export class NullVideoPlayer extends VideoPlayer {
    public setSource(source: string): void {
        this.video.innerHTML = "";
        const sourceElement = document.createElement("source");
        sourceElement.type = "video/mp4";
        sourceElement.src = source + ".null";
        this.video.appendChild(sourceElement);
    }
}
