import { VideoPlayer } from "./video_player";

export class MP4VideoPlayer extends VideoPlayer {
    public setSource(source: string): void {
        this.video.innerHTML = "";
        const sourceElement = document.createElement("source");
        sourceElement.type = "video/mp4";
        sourceElement.src = source + ".mp4";
        this.video.appendChild(sourceElement);
    }
}
