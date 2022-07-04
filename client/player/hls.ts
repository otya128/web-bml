import Hls from "hls.js";
import * as aribb24js from "aribb24.js";
import { VideoPlayer } from "./video_player";
import { playRomSound } from "../romsound";

export class HLSVideoPlayer extends VideoPlayer {
    captionRenderer: aribb24js.SVGRenderer | null = null;

    private PRACallback = (index: number): void => {
        if (this.audioNode == null || this.container.style.display === "none") {
            return;
        }
        playRomSound(index, this.audioNode);
    }

    public setSource(source: string): void {
        const captionOption: aribb24js.SVGRendererOption = {
            normalFont: "丸ゴシック",
            enableAutoInBandMetadataTextTrackDetection: !Hls.isSupported(),
            forceStrokeColor: true,
            PRACallback: this.PRACallback,
        };
        const renderer = new aribb24js.SVGRenderer(captionOption);
        this.captionRenderer = renderer;
        renderer.attachMedia(this.video);
        if (Hls.isSupported()) {
            var hls = new Hls({
                manifestLoadingTimeOut: 60 * 1000,
            });
            hls.on(Hls.Events.FRAG_PARSING_METADATA, (_event, data) => {
                for (const sample of data.samples) {
                    renderer.pushID3v2Data(sample.pts, sample.data);
                }
            });
            hls.loadSource(source + ".m3u8");
            hls.attachMedia(this.video);
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = source + ".m3u8";
        }
    }

    public showCC(): void {
        this.captionRenderer?.show();
    }

    public hideCC(): void {
        this.captionRenderer?.hide();
    }

    private audioNode?: AudioNode;

    public override setPRAAudioNode(audioNode?: AudioNode): void {
        this.audioNode = audioNode;
    }
}
