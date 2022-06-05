import Mpegts from "mpegts.js";
import * as aribb24js from "aribb24.js";
import { VideoPlayer } from "./video_player";
import { playRomSound } from "../romsound";

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

export class MPEGTSVideoPlayer extends VideoPlayer {
    captionRenderer: aribb24js.CanvasRenderer | null = null;
    superimposeRenderer: aribb24js.CanvasRenderer | null = null;
    resizeObserver?: ResizeObserver;

    private PRACallback = (index: number): void => {
        if (this.audioNode == null || this.container.style.display === "none") {
            return;
        }
        playRomSound(index, this.audioNode);
    }

    public setSource(source: string): void {
        if (Mpegts.getFeatureList().mseLivePlayback) {
            var player = Mpegts.createPlayer({
                type: "mse",
                isLive: true,
                url: new URL(source + ".h264.m2ts", location.href).toString(),
            }, {
                enableWorker: true,
                liveBufferLatencyChasing: true,
                liveBufferLatencyMinRemain: 1.0,
                liveBufferLatencyMaxLatency: 2.0,
            });
            player.attachMediaElement(this.video);
            player.load();
            player.play();

            // 字幕対応
            const captionOption: aribb24js.CanvasRendererOption = {
                normalFont: "丸ゴシック",
                forceStrokeColor: true,
                PRACallback: this.PRACallback,
            };
            captionOption.data_identifier = 0x80;
            const captionRenderer = new aribb24js.CanvasRenderer(captionOption);
            const superimposeOption: aribb24js.CanvasRendererOption = {
                normalFont: "丸ゴシック",
                forceStrokeColor: true,
                PRACallback: this.PRACallback,
            };
            superimposeOption.data_identifier = 0x81;
            const superimposeRenderer = new aribb24js.CanvasRenderer(superimposeOption);
            this.captionRenderer = captionRenderer;
            this.superimposeRenderer = superimposeRenderer;
            captionRenderer.attachMedia(this.video);
            superimposeRenderer.attachMedia(this.video);
            this.container.appendChild(captionRenderer.getViewCanvas()!);
            this.container.appendChild(superimposeRenderer.getViewCanvas()!);
            // 字幕は小さい動画の上ではなく画面全体に表示される
            this.resizeObserver = new ResizeObserver(() => {
                this.resizeCanvas();
            });
            this.resizeObserver.observe(this.video);
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
    resizeCanvas = () => {
        const vc = this.captionRenderer?.getViewCanvas();
        if (vc) {
            vc.width = 960 * this.scaleFactor;
            vc.height = 540 * this.scaleFactor;
        }
        const vc2 = this.superimposeRenderer?.getViewCanvas();
        if (vc2) {
            vc2.width = 960 * this.scaleFactor;
            vc2.height = 540 * this.scaleFactor;
        }
    };
    public showCC(): void {
        this.captionRenderer?.show();
        this.superimposeRenderer?.show();
        this.container.style.display = "";
        this.container.style.setProperty("z-index", "1000", "important");
        this.resizeCanvas();
    }
    public hideCC(): void {
        this.captionRenderer?.hide();
        this.superimposeRenderer?.hide();
        this.container.style.display = "none";
        this.container.style.setProperty("z-index", "-1", "important");
        this.resizeCanvas();
    }
    scaleFactor: number = 1;
    public scale(factor: number) {
        this.scaleFactor = factor;
        this.resizeCanvas();
    }

    private audioNode?: AudioNode;

    public override setPRAAudioNode(audioNode?: AudioNode): void {
        this.audioNode = audioNode;
    }
}
