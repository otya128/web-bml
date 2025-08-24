import Koa from 'koa';
import Router from 'koa-router';
import fs, { mkdirSync } from "fs"
import fsAsync from "fs/promises";
import 'dotenv/config'
import path from "path";
import stream from "stream";
import websocket, { WebSocketContext } from "koa-easy-ws";
import * as wsApi from "./ws_api";
import { WebSocket } from "ws";
import http from "http";
import https from "https";
import dns from "dns/promises";
import { randomUUID } from 'crypto';
import { DataBroadcastingStream, LiveStream } from './stream/live_stream';
import { HLSLiveStream } from './stream/hls_stream';
import { decodeTS } from './decode_ts';

let port = Number.parseInt(process.env.PORT ?? "");
if (Number.isNaN(port)) {
    port = 23234;
}
const host = process.env.HOST ?? "localhost";
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const hlsDir = process.env.HLS_DIR ?? "./hls";
// 40772はLinuxのエフェメラルポート
const mirakBaseUrl = (process.env.MIRAK_URL ?? "http://localhost:40772/").replace(/\/+$/, "") + "/api/";
const epgBaseUrl = (process.env.EPG_URL ?? "http://localhost:8888/").replace(/\/+$/, "") + "/api/";

const inputFile = process.argv[2] ?? process.env.INPUT_FILE;

const ws = websocket();

// EPGStationのパラメータ参照
const args = [
    "-dual_mono_mode", "main",
    "-i", "pipe:0",
    "-sn",
    "-threads", "0",
    "-c:a", "aac",
    "-ar", "48000",
    "-b:a", "192k",
    "-ac", "2",
    "-c:v", "libx264",
    "-vf", "yadif,scale=-2:720",
    "-b:v", "3000k",
    "-profile:v", "baseline",
    "-preset", "veryfast",
    "-tune", "fastdecode,zerolatency",
    "-movflags", "frag_keyframe+empty_moov+faststart+default_base_moof",
    "-y",
    "-analyzeduration", "10M",
    "-probesize", "32M",
    "-f", "mp4",
    "pipe:1",
];

const webmArgs = [
    "-dual_mono_mode", "main",
    "-i", "pipe:0",
    "-sn",
    "-threads", "0",
    "-c:a", "libvorbis",
    "-ar", "48000",
    "-b:a", "192k",
    "-ac", "2",
    "-c:v", "libvpx-vp9",
    "-vf", "yadif,scale=-2:720",
    "-b:v", "3000k",
    "-y",
    "-analyzeduration", "10M",
    "-probesize", "32M",
    "-f", "webm",
    "-cpu-used", "8",
    "-deadline", "realtime",
    "-copyts",
    "pipe:1",
];

const mpegtsArgs = [
    "-re",
    "-dual_mono_mode", "main",
    "-f", "mpegts",
    "-analyzeduration", "500000",
    "-i", "pipe:0",
    "-map", "0:v?",
    "-map", "0:a?",
    "-map", "0:s:0?",
    "-map", "0:d:0?",
    "-c:s", "copy",
    "-c:d", "copy",
    "-ignore_unknown",
    "-fflags", "nobuffer",
    "-flags", "low_delay",
    "-max_delay", "250000",
    "-max_interleave_delta", "1",
    "-threads", "0",
    "-c:a", "aac",
    "-ar", "48000",
    "-b:a", "192k",
    "-ac", "2",
    "-c:v", "libx264",
    "-flags", "+cgop",
    "-vf", "yadif,scale=-2:720",
    "-b:v", "3000k",
    "-preset", "veryfast",
    "-y",
    "-f", "mpegts",
    "pipe:1",
];

function getHLSArguments(segmentFilename: string, manifestFilename: string): string[] {
    return [
        "-re",
        "-dual_mono_mode", "main",
        "-i", "pipe:0",
        "-sn",
        "-map", "0",
        "-threads", "0",
        "-ignore_unknown",
        "-max_muxing_queue_size", "1024",
        "-f", "hls",
        "-hls_time", "3",
        "-hls_list_size", "17",
        "-hls_allow_cache", "1",
        "-hls_segment_filename", segmentFilename,
        "-hls_flags", "delete_segments",
        "-c:a", "aac",
        "-ar", "48000",
        "-b:a", "192k",
        "-ac", "2",
        "-c:v", "libx264",
        "-vf", "yadif,scale=-2:720",
        "-b:v", "3000k",
        "-preset", "veryfast",
        "-flags", "+loop-global_header",
        manifestFilename,
    ]
};


function unicast(client: WebSocket, msg: wsApi.ResponseMessage) {
    client.send(JSON.stringify(msg));
}

const app = new Koa();
const router = new Router<any, WebSocketContext>();
function readFileAsync(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        fs.readFile(path, null, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    })
}


router.get('/arib.js', async ctx => {
    ctx.body = fs.createReadStream("dist/arib.js");
    ctx.set('Content-Type', 'text/javascript; charset=utf-8')
});

router.get('/arib.js.map', async ctx => {
    ctx.body = fs.createReadStream("dist/arib.js.map");
    ctx.set('Content-Type', 'application/json; charset=utf-8')
});

router.get('/play_local.js', async ctx => {
    ctx.body = fs.createReadStream("dist/play_local.js");
    ctx.set('Content-Type', 'text/javascript; charset=utf-8')
});

router.get('/play_local.js.map', async ctx => {
    ctx.body = fs.createReadStream("dist/play_local.js.map");
    ctx.set('Content-Type', 'application/json; charset=utf-8')
});

router.get("/rounded-mplus-1m-arib.ttf", async ctx => {
    ctx.body = fs.createReadStream("dist/rounded-mplus-1m-arib.ttf");
});

// モトヤマルベリ
router.get("/KosugiMaru-Regular.woff2", async ctx => {
    const stat = await fsAsync.stat("fonts/KosugiMaru-Regular.woff2");
    ctx.response.length = stat.size;
    ctx.body = fs.createReadStream("fonts/KosugiMaru-Regular.woff2");
    ctx.set("Content-Type", "font/woff2")
});
router.get("/KosugiMaru-Bold.woff2", async ctx => {
    const stat = await fsAsync.stat("fonts/KosugiMaru-Bold.woff2");
    ctx.response.length = stat.size;
    ctx.body = fs.createReadStream("fonts/KosugiMaru-Bold.woff2");
    ctx.set("Content-Type", "font/woff2")
});
// モトヤシーダ
router.get("/Kosugi-Regular.woff2", async ctx => {
    const stat = await fsAsync.stat("fonts/Kosugi-Regular.woff2");
    ctx.response.length = stat.size;
    ctx.body = fs.createReadStream("fonts/Kosugi-Regular.woff2");
    ctx.set("Content-Type", "font/woff2")
});

router.get(/^\/api\/get\/(?<url>https?:\/\/.+)$/, async ctx => {
    const url = /^\/api\/get\/(?<url>https?:\/\/.+)$/.exec(ctx.originalUrl)?.groups?.url;
    if (url == null || (!url.startsWith("http://") && !url.startsWith("https://"))) {
        ctx.status = 400;
        return;
    }
    const opts: https.RequestOptions = {
        headers: {
            "Accept": "*/*", // text/X-arib-bml?
            "Accept-Language": "ja",
            "Pragma": "no-cache",
        },
        rejectUnauthorized: false,
    };
    const allowedRequestHeaders = new Set(["if-modified-since", "cache-control"]);
    for (let i = 0; i < ctx.req.rawHeaders.length; i += 2) {
        const key = ctx.req.rawHeaders[i];
        const value = ctx.req.rawHeaders[i + 1];
        if (allowedRequestHeaders.has(key.toLowerCase())) {
            // @ts-expect-error
            opts.headers[key] = value;
        }
    }
    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const client = provideHttpClient(url);
        const req = client.get(url, opts, resolve);
        req.on("error", reject);
    });
    if (res.statusCode != null) {
        ctx.status = res.statusCode;
    }
    const allowedResponseHeaders = new Set(["accept-ranges", "authentication-info", "last-modified", "pragma", "date", "cache-control", "age", "expire", "content-language", "content-location", "content-type"]);
    for (let i = 0; i < res.rawHeaders.length; i += 2) {
        const key = res.rawHeaders[i];
        const value = res.rawHeaders[i + 1];
        if (allowedResponseHeaders.has(key.toLowerCase())) {
            ctx.set(key, value);
        }
    }
    await pipeAsync(res, ctx.res, { end: true });
});

router.post(/^\/api\/post\/(?<url>https?:\/\/.+)$/, async ctx => {
    const url = /^\/api\/post\/(?<url>https?:\/\/.+)$/.exec(ctx.originalUrl)?.groups?.url;
    if (url == null || (!url.startsWith("http://") && !url.startsWith("https://"))) {
        ctx.status = 400;
        return;
    }
    const body = await streamToBuffer(ctx.req);
    if (body.byteLength > 4096 + "Denbun=".length) {
        ctx.status = 413;
        return;
    }
    const opts: https.RequestOptions = {
        method: "POST",
        headers: {
            "Accept": "*/*",
            "Pragma": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": `${body.byteLength}`,
        },
        rejectUnauthorized: false,
    };
    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const client = provideHttpClient(url);
        const req = client.request(url, opts, resolve);
        req.on("error", reject);
        req.write(body);
        req.end();
    });
    if (res.statusCode != null) {
        ctx.status = res.statusCode;
    }
    const allowedResponseHeaders = new Set(["accept-ranges", "authentication-info", "last-modified", "pragma", "date", "cache-control", "age", "expire", "content-language", "content-location", "content-type"]);
    for (let i = 0; i < res.rawHeaders.length; i += 2) {
        const key = res.rawHeaders[i];
        const value = res.rawHeaders[i + 1];
        if (allowedResponseHeaders.has(key.toLowerCase())) {
            ctx.set(key, value);
        }
    }
    await pipeAsync(res, ctx.res, { end: true });
});

router.get("/api/confirm", async ctx => {
    if (typeof ctx.query.destination !== "string" || typeof ctx.query.isICMP !== "string" || typeof ctx.query.timeoutMillis !== "string") {
        ctx.status = 400;
        return;
    }
    const destination = ctx.query.destination;
    const isICMP = ctx.query.isICMP === "true";
    const timeoutMillis = Number(ctx.query.timeoutMillis);
    const resolver = new dns.Resolver({ timeout: timeoutMillis });
    const begin = performance.now();
    const result = await (resolver.resolve4(destination).catch(_ => null));
    const end = performance.now();
    const response: { success: boolean, ipAddress: string | null, responseTimeMillis: number | null } | null = {
        success: result != null,
        ipAddress: result != null ? (result[0] ?? null) : null,
        responseTimeMillis: result != null ? Math.floor(end - begin) : null,
    };
    ctx.body = response;
});

router.get('/video_list.js', async ctx => {
    ctx.body = fs.createReadStream("dist/video_list.js");
    ctx.set('Content-Type', 'text/javascript; charset=utf-8')
});

router.get('/video_list.js.map', async ctx => {
    ctx.body = fs.createReadStream("dist/video_list.js.map");
    ctx.set('Content-Type', 'application/json; charset=utf-8')
});

router.get("/", async ctx => {
    ctx.body = fs.createReadStream("public/video_list.html");
    ctx.set("Content-Type", "text/html; charset=utf-8");
});

router.get("/channels/:channelType/:channel/stream", async ctx => {
    ctx.body = fs.createReadStream("public/index.html");
    ctx.set("Content-Type", "text/html; charset=utf-8");
});

router.get("/channels/:channelType/:channel/services/:id/stream", async ctx => {
    ctx.body = fs.createReadStream("public/index.html");
    ctx.set("Content-Type", "text/html; charset=utf-8");
});

router.get("/videos/:videoFileId", async ctx => {
    ctx.body = fs.createReadStream("public/index.html");
    ctx.set("Content-Type", "text/html; charset=utf-8");
});

router.get("/play", async ctx => {
    ctx.body = fs.createReadStream("public/index.html");
    ctx.set("Content-Type", "text/html; charset=utf-8");
});

router.get("/play_local", async ctx => {
    ctx.body = fs.createReadStream("public/play_local.html");
    ctx.set("Content-Type", "text/html; charset=utf-8");
});

function pipeAsync(from: stream.Readable, to: stream.Writable, options?: { end?: boolean }): Promise<void> {
    return new Promise((resolve, reject) => {
        from.pipe(to, options);
        from.on('error', reject);
        from.on('end', resolve);
    });
}

app.use(ws);

// UUID => stream
const streams = new Map<string, DataBroadcastingStream>();
const max_number_of_streams = 4;

function closeDataBroadcastingLiveStream(dbs: DataBroadcastingStream) {
    if (!streams.has(dbs.id)) {
        return;
    }
    console.log("close live stream ", dbs.id);
    dbs.tsStream.unpipe();
    dbs.liveStream?.destroy();
    dbs.liveStream = undefined;
}

function closeDataBroadcastingStream(dbs: DataBroadcastingStream) {
    if (!streams.has(dbs.id)) {
        return;
    }
    closeDataBroadcastingLiveStream(dbs);
    console.log("close", dbs.id);
    // readStream->tsStream->ffmpeg->response
    dbs.readStream.unpipe();
    dbs.readStream.destroy();
    dbs.ws.close(4000);
    streams.delete(dbs.id);
}

function registerDataBroadcastingStream(dbs: DataBroadcastingStream): boolean {
    if (streams.size >= max_number_of_streams) {
        console.error("The maximum number of streams has been exceeded.");
        const oldest = [...streams.values()].sort((a, b) => (a.registeredAt.getTime() - b.registeredAt.getTime()));
        if (oldest[0] != null) {
            const msg = {
                type: "error",
                message: "The maximum number of streams has been exceeded.",
            } as wsApi.ResponseMessage;
            unicast(oldest[0].ws, msg);
            closeDataBroadcastingStream(oldest[0]);
        } else {
            return false;
        }
    }
    streams.set(dbs.id, dbs);
    return true;
}

function addProgramIdArgument(args: string[], serviceId?: number): string[] {
    if (serviceId == null) {
        return args;
    }
    const newArgs = args.slice();
    newArgs[newArgs.indexOf("-map") + 1] = `0:p:${serviceId}`;
    return newArgs;
}

router.get(/^\/streams\/(?<id>[^\/]+)\.(?<ext>mp4|webm)$/, async (ctx) => {
    const dbs = streams.get(ctx.params.id);
    if (dbs == null) {
        return;
    }
    if (dbs.liveStream) {
        closeDataBroadcastingLiveStream(dbs);
    }
    const { tsStream, readStream } = dbs;
    ctx.set("Content-Type", "video/" + ctx.params.ext);
    ctx.status = 200;

    tsStream.unpipe();
    dbs.liveStream = new LiveStream(ffmpeg, addProgramIdArgument(ctx.params.ext === "webm" ? webmArgs : args, dbs.serviceId), dbs.tsStream);
    const ls = dbs.liveStream;
    dbs.liveStream.encoderProcess.on("error", (err) => {
        console.error("encoder proc err", err);
        tsStream.unpipe(ls.encoderProcess.stdin);
        ls.encoderProcess.stdout.unpipe();
    });
    ls.encoderProcess.on("close", (err) => {
        console.error("close proc err", err);
        tsStream.unpipe(ls.encoderProcess.stdin);
        ls.encoderProcess.stdout.unpipe();
    });
    readStream.resume();
    ctx.res.on("error", (err) => {
        console.log("error res", dbs.id, dbs.source, err);
        closeDataBroadcastingLiveStream(dbs);
    });
    try {
        await pipeAsync(dbs.liveStream.encoderProcess.stdout, ctx.res, { end: true });
    } catch {
    }
    closeDataBroadcastingLiveStream(dbs);
});


router.get("/streams/:id.h264.m2ts", async (ctx) => {
    const dbs = streams.get(ctx.params.id);
    if (dbs == null) {
        return;
    }
    if (dbs.liveStream) {
        closeDataBroadcastingLiveStream(dbs);
    }
    const { tsStream, readStream } = dbs;
    ctx.set("Content-Type", "video/mp2t");
    ctx.status = 200;

    tsStream.unpipe();
    dbs.liveStream = new LiveStream(ffmpeg, addProgramIdArgument(mpegtsArgs, dbs.serviceId), dbs.tsStream);
    const ls = dbs.liveStream;
    dbs.liveStream.encoderProcess.on("error", (err) => {
        console.error("encoder proc err", err);
        tsStream.unpipe(ls.encoderProcess.stdin);
        ls.encoderProcess.stdout.unpipe();
    });
    ls.encoderProcess.on("close", (err) => {
        console.error("close proc err", err);
        tsStream.unpipe(ls.encoderProcess.stdin);
        ls.encoderProcess.stdout.unpipe();
    });
    readStream.resume();
    ctx.res.on("error", (err) => {
        console.log("error res", dbs.id, dbs.source, err);
        closeDataBroadcastingLiveStream(dbs);
    });
    try {
        await pipeAsync(dbs.liveStream.encoderProcess.stdout, ctx.res, { end: true });
    } catch {
    }
    closeDataBroadcastingLiveStream(dbs);
});

mkdirSync(hlsDir, { recursive: true });
function cleanUpHLS() {
    for (const entry of fs.readdirSync(hlsDir, { withFileTypes: true })) {
        if (entry.name.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.m3u8|-[0-9]{9}\.ts)$/)) {
            fs.unlinkSync(path.join(hlsDir, entry.name));
        }
    }
}
cleanUpHLS();

router.get(/^\/streams\/(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(?<segment>[0-9]{9})\.ts$/, async (ctx) => {
    const dbs = streams.get(ctx.params.id);
    if (dbs == null) {
        return;
    }
    ctx.body = await readFileAsync(path.join(hlsDir, ctx.params.id + "-" + ctx.params.segment + ".ts"));
});

function delayAsync(ms: number): Promise<void> {
    return new Promise((resolve, _reject) => {
        setTimeout(resolve, ms);
    });
}

router.get("/streams/:id.m3u8", async (ctx) => {
    const dbs = streams.get(ctx.params.id);
    if (dbs == null) {
        return;
    }
    const { tsStream, readStream } = dbs;
    if (dbs.liveStream instanceof HLSLiveStream) {
        ctx.body = await readFileAsync(path.join(hlsDir, dbs.id + ".m3u8"));
        return;
    }
    if (dbs.liveStream) {
        closeDataBroadcastingLiveStream(dbs);
    }
    tsStream.unpipe();
    const hlsLiveStream = new HLSLiveStream(ffmpeg, addProgramIdArgument(getHLSArguments(path.join(hlsDir, dbs.id + "-%09d.ts"), path.join(hlsDir, dbs.id + ".m3u8")), dbs.serviceId), dbs.tsStream);
    readStream.resume();
    dbs.liveStream = hlsLiveStream;
    const pollingTime = 100;
    let limitTime = 60 * 1000;
    while (limitTime > 0) {
        if (fs.existsSync(path.join(hlsDir, dbs.id + ".m3u8"))) {
            ctx.body = await readFileAsync(path.join(hlsDir, dbs.id + ".m3u8"));
            return;
        }
        await delayAsync(pollingTime);
        limitTime -= pollingTime;
    }
});



router.get("/streams/:id.null", async (ctx) => {
    const dbs = streams.get(ctx.params.id);
    if (dbs == null) {
        return;
    }
    const { tsStream } = dbs;
    if (dbs.liveStream) {
        closeDataBroadcastingLiveStream(dbs);
    }
    tsStream.unpipe();
    tsStream.resume();
});

async function streamToString(stream: stream.Readable): Promise<string> {
    return (await streamToBuffer(stream)).toString("utf-8");
}

async function streamToBuffer(stream: stream.Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

function provideHttpClient(options: string | http.RequestOptions | URL) {
    if (typeof options === "string") {
        return options.startsWith('https:') ? https : http
    } else {
        return options.protocol === 'https:' ? https : http
    }
}

function httpGetAsync(url: string | http.RequestOptions | URL): Promise<http.IncomingMessage>;

function httpGetAsync(url: string | URL, options: http.RequestOptions): Promise<http.IncomingMessage>;

function httpGetAsync(url: string | http.RequestOptions | URL, options?: http.RequestOptions): Promise<http.IncomingMessage> {
    return new Promise<http.IncomingMessage>((resolve, reject) => {
        const client = provideHttpClient(url);
        const req = options == null ? client.get(url, resolve) : client.get(url as string | URL, options, resolve);
        req.on("error", reject);
    });
}

router.get("/api/channels", async (ctx) => {
    const response = await httpGetAsync(mirakBaseUrl + "channels");
    ctx.body = JSON.parse(await streamToString(response));
    if (response.statusCode != null) {
        ctx.status = response.statusCode;
    }
});

router.get("/api/recorded", async (ctx) => {
    const response = await httpGetAsync(epgBaseUrl + "recorded?" + ctx.querystring);
    ctx.body = JSON.parse(await streamToString(response));
    if (response.statusCode != null) {
        ctx.status = response.statusCode;
    }
});

router.get("/api/streams", async (ctx) => {
    ctx.body = [...streams.values()].sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime()).map(x => (
        {
            id: x.id,
            registeredAt: x.registeredAt.getTime(),
            encoderProcessId: x.liveStream?.encoderProcess.pid,
            source: x.source,
        }
    ));
    ctx.status = 200;
});

router.get('/api/ws', async (ctx) => {
    if (!ctx.ws) {
        return;
    }
    let readStream: stream.Readable;
    let size = 0;
    let source: string;
    let serviceId: number | undefined;
    let seek: number | undefined;
    // とりあえず手動validate
    const query: any = typeof ctx.query.param === "string" ? (JSON.parse(ctx.query.param) ?? {}) : {};
    if (typeof query.demultiplexServiceId == "number") {
        serviceId = (query as wsApi.Param).demultiplexServiceId;
    }
    if (typeof query.seek == "number") {
        seek = (query as wsApi.Param).seek;
    }
    if (query.type === "mirakLive" && typeof query.channelType === "string" && typeof query.channel === "string" && (query.serviceId == null || typeof query.serviceId == "number")) {
        const q = query as wsApi.MirakLiveParam;
        if (q.serviceId == null) {
            source = mirakBaseUrl + `channels/${encodeURIComponent(q.channelType)}/${encodeURIComponent(q.channel)}/stream`;
        } else {
            source = mirakBaseUrl + `channels/${encodeURIComponent(q.channelType)}/${encodeURIComponent(q.channel)}/services/${q.serviceId}/stream`;
            serviceId = undefined;
        }
        const res = await httpGetAsync(source);
        readStream = res;
    } else if (query.type === "epgStationRecorded" && typeof query.videoFileId === "number") {
        const q = query as wsApi.EPGStationRecordedParam;
        source = epgBaseUrl + `videos/${q.videoFileId}`;
        const opts: http.RequestOptions = {
            headers: {
                "Range": `bytes=${seek ?? 0}-`
            }
        };
        const res = await httpGetAsync(source, opts);
        readStream = res;
        const len = Number.parseInt(res.headers["content-length"] || "NaN");
        if (Number.isFinite(len)) {
            size = len;
        }
    } else {
        if (inputFile === "-" || inputFile == null) {
            source = "stdin";
            readStream = process.stdin;
        } else {
            source = inputFile;
            readStream = fs.createReadStream(inputFile, {
                start: seek ?? 0,
            });
            size = fs.statSync(inputFile).size;
        }
    }
    const ws = await ctx.ws();
    const id = randomUUID();

    readStream.pause();
    const tsStream = decodeTS({ sendCallback: (msg) => ws.send(JSON.stringify(msg)), serviceId, parsePES: true });
    readStream.pipe(tsStream);

    const dbs: DataBroadcastingStream = {
        id,
        registeredAt: new Date(),
        readStream,
        tsStream,
        size,
        ws,
        source,
        serviceId,
    };
    if (!registerDataBroadcastingStream(dbs)) {
        const msg = {
            type: "error",
            message: "The maximum number of streams has been exceeded.",
        } as wsApi.ResponseMessage;
        unicast(dbs.ws, msg);
        closeDataBroadcastingStream(dbs);
        return;
    }

    readStream.on("error", (err) => {
        console.error("err readStream", dbs.id, dbs.source);
        closeDataBroadcastingStream(dbs);
    });

    readStream.on("close", () => {
        console.error("close readStream", dbs.id, dbs.source);
        closeDataBroadcastingStream(dbs);
    });

    ws.on("error", (_code: number, _reason: Buffer) => {
        console.error("err ws", dbs.id, dbs.source);
        closeDataBroadcastingStream(dbs);
    });

    ws.on("close", (_code: number, _reason: Buffer) => {
        console.error("close ws", dbs.id, dbs.source);
        closeDataBroadcastingStream(dbs);
    });

    ws.on("message", (message) => {
        const _ = JSON.parse(message.toString("utf-8")) as wsApi.RequestMessage;
    });

    unicast(ws, {
        type: "videoStreamUrl",
        videoStreamUrl: "/streams/" + id,
    });
});

app
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(port, host);

console.log(`listening on ${host}:${port}`);
