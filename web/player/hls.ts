import Hls from "hls.js";
import * as aribb24js from "aribb24.js";

type RendererOption = ConstructorParameters<typeof aribb24js.CanvasRenderer>[0];

export function play(videoStreamUrl: string, videoElement: HTMLVideoElement) {
        const captionOption: RendererOption = {
            normalFont: "丸ゴシック",
            enableAutoInBandMetadataTextTrackDetection: !Hls.isSupported(),
            forceStrokeColor: "black",
        };
        var renderer = new aribb24js.CanvasRenderer(captionOption);
        renderer.attachMedia(videoElement);
        renderer.show();
        if (Hls.isSupported()) {
            var hls = new Hls({
                manifestLoadingTimeOut: 60 * 1000,
            });
            hls.on(Hls.Events.FRAG_PARSING_METADATA, (_event, data) => {
                for (const sample of data.samples) {
                    renderer.pushID3v2Data(sample.pts, sample.data);
                }
            });
            hls.loadSource(videoStreamUrl + ".m3u8");
            hls.attachMedia(videoElement);
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = videoStreamUrl + ".m3u8";
        }
}
