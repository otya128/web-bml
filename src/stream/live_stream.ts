import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { Transform } from "stream";

export class LiveStream {
    encoderProcess: ChildProcessWithoutNullStreams;
    public constructor(ffmpeg: string, args: string[], tsStream: Transform) {
        this.encoderProcess = spawn(ffmpeg, args);
        tsStream.unpipe();
        tsStream.pipe(this.encoderProcess.stdin);
        tsStream.resume();
        this.encoderProcess.stderr.on("data", (data) => process.stderr.write(data));
    }

    public destroy() {
        this.encoderProcess.stdout.unpipe();
        this.encoderProcess.kill();
    }
}
