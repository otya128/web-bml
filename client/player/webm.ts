import { VideoPlayer } from "./video_player";
import * as aribb24js from "aribb24.js";
import { playRomSound } from "../romsound";

export class WebmVideoPlayer extends VideoPlayer {
    captionRenderer: aribb24js.SVGRenderer | null = null;
    superimposeRenderer: aribb24js.SVGRenderer | null = null;

    private PRACallback = (index: number): void => {
        if (this.audioNode == null || this.container.style.display === "none") {
            return;
        }
        playRomSound(index, this.audioNode);
    }

    public setSource(source: string): void {
        this.video.innerHTML = "";
        const sourceElement = document.createElement("source");
        sourceElement.type = "video/webm";
        sourceElement.src = source + ".webm";
        this.video.appendChild(sourceElement);

        const captionOption: aribb24js.SVGRendererOption = {
            normalFont: "丸ゴシック",
            forceStrokeColor: true,
            PRACallback: this.PRACallback,
        };
        captionOption.data_identifier = 0x80;
        const captionRenderer = new aribb24js.SVGRenderer(captionOption);
        const superimposeOption: aribb24js.SVGRendererOption = {
            normalFont: "丸ゴシック",
            forceStrokeColor: true,
            PRACallback: this.PRACallback,
        };
        superimposeOption.data_identifier = 0x81;
        const superimposeRenderer = new aribb24js.SVGRenderer(superimposeOption);
        this.captionRenderer = captionRenderer;
        this.superimposeRenderer = superimposeRenderer;
        captionRenderer.attachMedia(this.video);
        superimposeRenderer.attachMedia(this.video);
        this.container.appendChild(captionRenderer.getSVG());
        this.container.appendChild(superimposeRenderer.getSVG());
    }

    public push(streamId: number, data: Uint8Array, pts?: number) {
        if (streamId == 0xbd && pts != null) {
            this.captionRenderer?.pushData(0, data, (pts % Math.pow(2, 33)) / 90 / 1000);
        } else if (streamId == 0xbf) {
            this.superimposeRenderer?.pushData(0, data, this.video.currentTime);
        }
    }

    public showCC(): void {
        this.captionRenderer?.show();
        this.superimposeRenderer?.show();
        this.container.style.display = "";
    }

    public hideCC(): void {
        this.captionRenderer?.hide();
        this.superimposeRenderer?.hide();
        this.container.style.display = "none";
    }

    private audioNode?: AudioNode;

    public override setPRAAudioNode(audioNode?: AudioNode): void {
        this.audioNode = audioNode;
    }
}
