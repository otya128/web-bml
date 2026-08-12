import { ChildProcessByStdio, spawn } from "child_process";
import { Transform, Readable, Writable } from "stream";
import { WebSocket } from "ws";

export type DataBroadcastingStream = {
    id: string,
    registeredAt: Date,
    readStream: Readable,
    tsStream: Transform,
    size: number,
    ws: WebSocket,
    liveStream?: LiveStream,
    source: string,
    // 多重化されているストリームを入力する際のserviceId
    serviceId?: number,
};

export class LiveStream {
    encoderProcess: ChildProcessByStdio<Writable, Readable, null>;
    public constructor(ffmpeg: string, args: string[], tsStream: Transform) {
        this.encoderProcess = spawn(ffmpeg, args, {
            stdio: ["pipe", "pipe", process.env.FFMPEG_OUTPUT == "1" ? "inherit" : "ignore"]
        });
        tsStream.unpipe();
        tsStream.pipe(this.encoderProcess.stdin);
        this.encoderProcess.stdin.on("error", (err) => {
            console.error("enc stdin err", err);
        });
        tsStream.resume();
    }

    public destroy() {
        this.encoderProcess.stdout.unpipe();
        this.encoderProcess.kill();
    }
}
