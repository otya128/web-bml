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
    endTime: number | undefined;

    peses: {
        pes: Uint8Array,
        pts: number,
        endTime: number,
    }[] = [];

    pcr: number | undefined;

    public updateTime(pcr: number) {
        this.pcr = pcr;
        let pesIndex: number = -1;
        if (this.pes != null && this.pts != null && this.endTime != null && this.pcr != null && this.pts + this.endTime < this.pcr) {
            // CS
            this.viewCanvas.getContext("2d")!.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
            this.pes = undefined;
            this.pts = undefined;
            this.endTime = undefined;
        }
        this.peses = this.peses.filter(x => x.pts >= pcr && x.pts <= pcr + x.endTime);
        for (let i = 0; i < this.peses.length; i++) {
            if (this.peses[i].pts > pcr) {
                pesIndex = i;
                break;
            }
        }
        if (pesIndex >= 0) {
            this.peses.splice(0, pesIndex);
            if (this.pes !== this.peses[0].pes) {
                this.pes = this.peses[0].pes;
                this.pts = this.peses[0].pts;
                this.endTime = this.peses[0].endTime;
                this.render();
            }
        }
    }

    public push(streamId: number, pes: Uint8Array, pts: number) {
        if (streamId === 0xbd) {
            pts /= 90;
            if (this.pcr == null) {
                return;
            }
            const provider: CanvasProvider = new CanvasProvider(pes, 0);
            const estimate = provider.render({
                ... this.captionOption,
                width: undefined,
                height: undefined,
            });
            if (estimate == null) {
                return;
            }
            this.peses.push({ pes, pts, endTime: Number.isFinite(estimate.endTime) ? estimate.endTime * 1000 : Number.MAX_SAFE_INTEGER });
            this.peses.sort((a, b) => a.pts - b.pts);
        }
    }

    private render() {
        if (this.pes != null && this.pts != null && this.endTime != null && this.pcr != null) {
            const canvasProvider = new CanvasProvider(this.pes, this.pts);
            canvasProvider.render({
                ...this.captionOption,
                canvas: this.viewCanvas,
                width: this.viewCanvas.width,
                height: this.viewCanvas.height,
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
