import Mpegts from "mpegts.js";
import * as aribb24js from "aribb24.js";

type RendererOption = ConstructorParameters<typeof aribb24js.CanvasRenderer>[0];
// Based on EPGStation

/**
 * 字幕スーパー用の処理
 * 元のソースは下記参照
 * https://twitter.com/magicxqq/status/1381813912539066373
 * https://github.com/l3tnun/EPGStation/commit/352bf9a69fdd0848295afb91859e1a402b623212#commitcomment-50407815
 */
function parseMalformedPES(data: any): any {
    let pes_header_data_length = data[2];
    let payload_start_index = 3 + pes_header_data_length;
    let payload_length = data.byteLength - payload_start_index;
    let payload = data.subarray(payload_start_index, payload_start_index + payload_length);
    return payload;
}

export function play(videoStreamUrl: string, videoElement: HTMLVideoElement) {
    if (Mpegts.getFeatureList().mseLivePlayback) {
        var player = Mpegts.createPlayer({
            type: "mse",
            isLive: true,
            url: new URL(videoStreamUrl + ".h264.m2ts", location.href).toString(),
        }, {
            enableWorker: true,
            liveBufferLatencyChasing: true,
            liveBufferLatencyMinRemain: 1.0,
            liveBufferLatencyMaxLatency: 2.0,
        });
        player.attachMediaElement(videoElement);
        player.load();
        player.play();

        // 字幕対応
        const captionOption: RendererOption = {
            normalFont: "丸ゴシック",
            forceStrokeColor: "black",
        };
        captionOption.data_identifier = 0x80;
        const captionRenderer = new aribb24js.CanvasRenderer(captionOption);
        const superimposeOption: RendererOption = {
            normalFont: "丸ゴシック",
            forceStrokeColor: "black",
        };
        superimposeOption.data_identifier = 0x81;
        const superimposeRenderer = new aribb24js.CanvasRenderer(superimposeOption);
        captionRenderer.attachMedia(videoElement);
        superimposeRenderer.attachMedia(videoElement);
        captionRenderer.show();
        superimposeRenderer.show();
        /**
         * 字幕スーパー用の処理
         * 元のソースは下記参照
         * https://twitter.com/magicxqq/status/1381813912539066373
         * https://github.com/l3tnun/EPGStation/commit/352bf9a69fdd0848295afb91859e1a402b623212#commitcomment-50407815
         */
        player.on(Mpegts.Events.PES_PRIVATE_DATA_ARRIVED, data => {
            if (data.stream_id === 0xbd && data.data[0] === 0x80 && captionRenderer !== null) {
                // private_stream_1, caption
                captionRenderer.pushData(data.pid, data.data, data.pts / 1000);
            } else if (data.stream_id === 0xbf && superimposeRenderer !== null) {
                // private_stream_2, superimpose
                let payload = data.data;
                if (payload[0] !== 0x81) {
                    payload = parseMalformedPES(data.data);
                }
                if (payload[0] !== 0x81) {
                    return;
                }
                superimposeRenderer.pushData(data.pid, payload, data.nearest_pts / 1000);
            }
        });

    }
}