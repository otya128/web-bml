import Hls from "hls.js";
import * as aribb24js from "aribb24.js";
import { VideoPlayer } from "./video_player";

type RendererOption = ConstructorParameters<typeof aribb24js.CanvasRenderer>[0];

export class HLSVideoPlayer extends VideoPlayer {
    captionRenderer: aribb24js.CanvasRenderer | null = null;
    public setSource(source: string): void {
        const captionOption: RendererOption = {
            normalFont: "丸ゴシック",
            enableAutoInBandMetadataTextTrackDetection: !Hls.isSupported(),
            forceStrokeColor: "black",
        };
        const renderer = new aribb24js.CanvasRenderer(captionOption);
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
}
