import { CanvasProvider, CanvasRenderer } from "aribb24.js";
import { VideoPlayer } from "./video_player";

type RendererOption = ConstructorParameters<typeof CanvasRenderer>[0];

// 別途PESを受け取って字幕を描画する
// あんまり厳密じゃない
export class CaptionPlayer extends VideoPlayer {
    viewCanvas: HTMLCanvasElement;
    captionOption: RendererOption;
    public constructor(video: HTMLVideoElement, container: HTMLElement) {
        super(video, container);
        this.viewCanvas = document.createElement("canvas");
        this.viewCanvas.style.position = "absolute";
        this.viewCanvas.style.top = this.viewCanvas.style.left = "0";
        this.viewCanvas.style.pointerEvents = "none";
        this.viewCanvas.style.width = "100%";
        this.viewCanvas.style.height = "100%";
        this.scale(1);
        this.container.append(this.viewCanvas);
        this.captionOption = {
            normalFont: "丸ゴシック",
            forceStrokeColor: "black",
        };
    }

    public setSource(_source: string): void {
    }

    pes: Uint8Array | undefined;
    pts: number | undefined;

    public push(streamId: number, pes: Uint8Array, pts: number) {
        if (streamId === 0xbd) {
            this.pes = pes;
            this.pts = pts;
            this.render();
        }
    }

    private render() {
        if (this.pes != null && this.pts != null) {
            const canvasProvider = new CanvasProvider(this.pes, this.pts);
            canvasProvider.render({
                ...this.captionOption,
                canvas: this.viewCanvas,
                width: 960 * this.scaleFactor,
                height: 540 * this.scaleFactor,
            });
        }
    }

    public showCC(): void {
        this.container.style.display = "";
    }

    public hideCC(): void {
        this.container.style.display = "none";
    }

    scaleFactor: number = 1;
    public scale(factor: number) {
        this.scaleFactor = factor;
        this.viewCanvas.width = 960 * this.scaleFactor;
        this.viewCanvas.height = 540 * this.scaleFactor;
        this.render();
    }
}
