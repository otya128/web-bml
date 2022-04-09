import { SVGProvider, SVGRenderer } from "aribb24.js";
import { VideoPlayer } from "./video_player";

type RendererOption = ConstructorParameters<typeof SVGRenderer>[0];

// 別途PESを受け取って字幕を描画する
// あんまり厳密じゃない
export class CaptionPlayer extends VideoPlayer {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    captionOption: RendererOption;
    public constructor(video: HTMLVideoElement, container: HTMLElement) {
        super(video, container);
        this.scale(1);
        this.container.append(this.svg);
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
        if (this.pes != null && this.pts != null && this.endTime != null && this.pcr != null && this.pts + this.endTime < this.pcr) {
            // CS
            this.svg.replaceChildren();
            this.pes = undefined;
            this.pts = undefined;
            this.endTime = undefined;
        }
        let pesIndex: number = this.peses.findIndex(x => x.pts > pcr);
        if (pesIndex === -1) {
            pesIndex = this.peses.length;
        }
        if (pesIndex > 0) {
            const pes = this.peses[pesIndex - 1];
            this.pes = pes.pes;
            this.pts = pes.pts;
            this.endTime = pes.endTime;
            if (this.peses.splice(0, pesIndex).find(x => x.pts <= pcr + x.endTime) != null) {
                this.svg.replaceChildren();
            }
            this.render();
        }
    }

    public push(streamId: number, pes: Uint8Array, pts: number) {
        if (streamId === 0xbd) {
            pts /= 90;
            if (this.pcr == null) {
                return;
            }
            const provider: SVGProvider = new SVGProvider(pes, 0);
            const estimate = provider.render({
                ... this.captionOption,
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
            const svgProvider = new SVGProvider(this.pes, this.pts);
            svgProvider.render({
                ...this.captionOption,
                svg: this.svg,
            });
        }
    }

    public showCC(): void {
        this.container.style.display = "";
    }

    public hideCC(): void {
        this.container.style.display = "none";
    }
}
