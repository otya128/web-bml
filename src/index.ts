import Koa from 'koa';
import Router from 'koa-router';
import fs, { mkdirSync, readFileSync } from "fs"
import 'dotenv/config'
import { TextDecoder } from 'util';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { transpile } from "./transpile_ecm";
import { Declaration as CSSDeclaration } from "css";
import path from "path";
import { decodeEUCJP } from './euc_jp';
import { loadDRCS, toTTF } from './drcs';
import stream from "stream";
import { TsStream } from "@chinachu/aribts";
import websocket, { WebSocketContext } from "koa-easy-ws";
import * as wsApi from "./ws_api";
import { WebSocket } from "ws";
import { transpileCSS } from './transpile_css';
import { aribPNGToPNG } from './arib_png';
import { readCLUT } from './clut';
import http from "http";
import { randomUUID } from 'crypto';
import { DataBroadcastingStream, LiveStream } from './stream/live_stream';
import { HLSLiveStream } from './stream/hls_stream';
import { decodeTS } from './decode_ts';

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

const mpegtsArgs = [
    "-dual_mono_mode", "main",
    "-f", "mpegts",
    "-analyzeduration", "500000",
    "-i", "pipe:0",
    "-map", "0",
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

function getHLSArguments(hlsDir: string, segmentFilename: string, manifestFilename: string): string[] {
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
const ffmpeg = "ffmpeg";


function unicast(client: WebSocket, msg: wsApi.ResponseMessage) {
    client.send(JSON.stringify(msg));
}

const baseDir = process.env.BASE_DIR ?? "./data/";

type Component = {
    [key: string]: Module
};

type Module = {
    [key: string]: File
};

type File = {
    [key: string]: {}
};

const components: { [key: string]: Component } = {};

for (const componentDirent of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!componentDirent.isDirectory() || componentDirent.name.length !== 2) {
        continue;
    }
    const component: Component = {};
    components[componentDirent.name.toLowerCase()] = component;
    for (const moduleDirent of fs.readdirSync(path.join(baseDir, componentDirent.name), { withFileTypes: true })) {
        if (!moduleDirent.isDirectory() || moduleDirent.name.length !== 4) {
            continue;
        }
        const module: Module = {};
        component[moduleDirent.name.toLowerCase()] = module;
        for (const fileDirent of fs.readdirSync(path.join(baseDir, componentDirent.name, moduleDirent.name), { withFileTypes: true })) {
            if (!fileDirent.isFile()) {
                continue;
            }
            const file: File = {};
            module[fileDirent.name.toLowerCase()] = file;
        }
    }
}

const app = new Koa();
const router = new Router<any, WebSocketContext>();

function findXmlNode(xml: any[], nodeName: string): any {
    const result = [];
    for (const i of xml) {
        for (const k in i) {
            if (k === ":@") {
                continue;
            }
            if (k == nodeName) {
                result.push(i);
                break;
            }
        }
    }
    return result;
}

function renameXmlNode(node: any, name: string) {
    for (const k in node) {
        if (k === ":@") {
            continue;
        }
        node[name] = node[k];
        delete node[k];
    }
}

function getXmlNodeName(node: any): string | null {
    for (const k in node) {
        if (k === ":@") {
            continue;
        }
        return k;
    }
    return null;
}

function getXmlChildren(node: any): any[] {
    for (const k in node) {
        if (k == "#text") {
            return [];
        }
        if (k === ":@") {
            continue;
        }
        return node[k];
    }
    return [];
}

function visitXmlNodes(node: any, callback: (node: any) => void) {
    callback(node);
    for (const child of getXmlChildren(node)) {
        visitXmlNodes(child, callback);
    }
}


function readFileAsync2(path: string): Promise<Buffer> {
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

function decodeText(enc: string, data: Buffer | Uint8Array) {
    if (enc.match(/euc[-_]?jp/i)) {
        return decodeEUCJP(data);
    } else {
        return new TextDecoder(enc).decode(data);
    }
}

function readFileAsync(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        fs.readFile(path, null, (err, data) => {
            if (err) {
                reject(err);
            } else {
                const opts = {
                    ignoreAttributes: false,
                    attributeNamePrefix: "@_",
                    preserveOrder: true,
                    cdataPropName: "__cdata",
                    trimValues: false,
                    parseTagValue: false,
                };
                const parser = new XMLParser(opts);
                let parsed = parser.parse(data);
                parsed = parser.parse(decodeText(parsed[0][":@"]["@_encoding"], data));
                parsed[0][":@"]["@_encoding"] = "UTF-8";
                const builder = new XMLBuilder(opts);
                const bmlRoot = findXmlNode(parsed, "bml")[0];
                renameXmlNode(bmlRoot, "html");
                if (!bmlRoot[":@"]) {
                    bmlRoot[":@"] = {};
                }
                bmlRoot[":@"]["@_xmlns"] = "http://www.w3.org/1999/xhtml";
                const htmlChildren = bmlRoot["html"];
                const headChildren: any[] = findXmlNode(htmlChildren, "head")[0]["head"];
                const scripts: any[] = [];
                visitXmlNodes(bmlRoot, (node) => {
                    const children = getXmlChildren(node);
                    const nodeName = getXmlNodeName(node);
                    for (let i = 0; i < children.length; i++) {
                        const c = children[i];
                        const prev = i > 0 ? getXmlNodeName(children[i - 1]) : "";
                        const next = i + 1 < children.length ? getXmlNodeName(children[i + 1]) : "";
                        // STD-B24 第二分冊(2/2) 第二編 付属2 5.3.2参照
                        if ("#text" in c) {
                            if ((prev === "span" || prev === "a") && nodeName === "p") {
                                c["#text"] = c["#text"].replace(/^([ \t\n\r] +)/g, " ");
                                if ((next === "span" || next === "a" || next === "br") && nodeName === "p") {
                                    c["#text"] = c["#text"].replace(/([ \t\n\r] +)$/g, " ");
                                    c["#text"] = c["#text"].replace(/(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                                }
                            } else if ((next === "span" || next === "a" || next === "br") && nodeName === "p") {
                                c["#text"] = c["#text"].replace(/([ \t\n\r] +)$/g, " ");
                                c["#text"] = c["#text"].replace(/^([ \t\n\r]+)|(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                            } else {
                                // 制御符号は0x20, 0x0d, 0x0a, 0x09のみ
                                // 2バイト文字と2バイト文字との間の制御符号は削除する
                                c["#text"] = c["#text"].replace(/^([ \t\n\r]+)|([ \t\n\r] +)$|(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                            }
                        }
                    }
                    if (getXmlNodeName(node) == "script") {
                        scripts.push({ ...node });
                        renameXmlNode(node, "arib-script");
                    }
                    if (getXmlNodeName(node) == "style") {
                        renameXmlNode(node, "arib-style");
                    }
                    if (getXmlNodeName(node) == "link") {
                        if (!node[":@"]["@_rel"]) {
                            node[":@"]["@_rel"] = "stylesheet";
                        }
                    }
                    /*
                    // keyイベントは独自なのでエミュレートした方がよさそう
                    const attrs = node[":@"] as any;
                    if (attrs && Object.keys(attrs).some(x => x.toLowerCase().startsWith("@_onkey"))) {
                        attrs["@_tabindex"] = "-1";
                    } */
                });
                const bodyChildren = findXmlNode(htmlChildren, "body")[0]["body"];
                bodyChildren.push({
                    "script": [],
                    ":@": {
                        "@_src": "/arib.js"
                    }
                });
                for (const s of scripts) {
                    const __cdata = findXmlNode(s["script"], "__cdata");
                    for (const c of __cdata) {
                        const code = c["__cdata"][0]["#text"];
                        c["__cdata"][0]["#text"] = transpile(code);
                    }
                    bodyChildren.push(s);
                }
                headChildren.splice(0, 0, {
                    "link": [],
                    ":@": {
                        "@_href": "/default.css",
                        "@_rel": "stylesheet"
                    }
                }, {
                    "script": [
                        {
                            "#text": JSON.stringify(components)
                        }
                    ], ":@": {
                        "@_type": "application/json",
                        "@_id": "bml-server-data",
                    }
                });
                //console.log(JSON.stringify(parsed, null, 4));
                resolve(builder.build(parsed));
            }
        });
    });
}

function clutToDecls(table: number[][]): CSSDeclaration[] {
    const ret = [];
    let i = 0;
    for (const t of table) {
        const decl: CSSDeclaration = {
            type: "declaration",
            property: "--clut-color-" + i,
            value: `rgba(${t[0]},${t[1]},${t[2]},${t[3] / 255})`,
        };
        ret.push(decl);
        i++;
    }
    return ret;
}

router.get('/:component/:module/:filename', proc);
router.get('/:component/:moduleUnused/~/:module/:filename', async ctx => {
    const component = (ctx.params.component as string).toLowerCase();
    const module = (ctx.params.module as string).toLowerCase();
    const filename = (ctx.params.filename as string).toLowerCase();
    ctx.redirect(`/${component}/${module}/${filename}`);
});
async function proc(ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>) {
    const component = (ctx.params.component as string).toLowerCase();
    const module = (ctx.params.module as string).toLowerCase();
    const filename = (ctx.params.filename as string).toLowerCase();
    const componentId = parseInt(component, 16);
    const moduleId = parseInt(module, 16);
    if (Number.isNaN(componentId)) {
        ctx.body = "invalid componentId";
        ctx.status = 400;
        return;
    }
    if (Number.isNaN(moduleId)) {
        ctx.body = "invalid moduleId";
        ctx.status = 400;
        return;
    }
    if (ctx.headers["sec-fetch-dest"] === "script" || filename.endsWith(".ecm")) {
        const b = await readFileAsync2(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
        const file = new TextDecoder("euc-jp").decode(b);
        ctx.body = transpile(file);
        ctx.set("Content-Type", "text/X-arib-ecmascript");
    } else if (ctx.headers["sec-fetch-dest"] === "style" || filename.endsWith(".css")) {
        const b = await readFileAsync2(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
        const file = new TextDecoder("euc-jp").decode(b);
        ctx.body = transpileCSS(file, {
            inline: false, href: ctx.href, clutReader(cssValue: string) {
                return clutToDecls(readCLUT(readFileSync(`${process.env.BASE_DIR}/${cssValue}`)));
            }
        });
        ctx.set("Content-Type", "text/css");
    } else if (filename.endsWith(".bml")) {
        const file = await readFileAsync(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
        ctx.body = file;
        ctx.set('Content-Type', 'application/xhtml+xml')
    } else {
        if (typeof ctx.query.clut === "string") {
            const clut = ctx.query.clut;
            const png = await readFileAsync2(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
            ctx.body = aribPNGToPNG(png, readCLUT(await readFileAsync2(clut)));
            ctx.set("Content-Type", "image/png");
            return;
        }
        if (typeof ctx.query.css === "string") {
            const clut = await readFileAsync2(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
            const table = readCLUT(clut);
            ctx.body = clutToDecls(table);
        } else if (typeof ctx.query.base64 === "string") {
            ctx.body = (await readFileAsync2(`${process.env.BASE_DIR}/${component}/${module}/${filename}`)).toString('base64');
        } else if (typeof ctx.query.ttf === "string") {
            const filterId = parseInt(ctx.query.ttf);
            const drcs = await readFileAsync2(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
            ctx.body = toTTF(loadDRCS(drcs, Number.isFinite(filterId) ? filterId : undefined));
        } else {
            const s = fs.createReadStream(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
            s.on("error", () => {
                // chrome対策でダミー画像を用意する (text/html返すとiframeになる上に画像が表示できなくなる)
                ctx.set("Content-Type", "image/png");
                const dummyPng = [
                    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x18, 0x57, 0x63, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x5C, 0xCD, 0xFF, 0x69, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
                ];
                ctx.set("Content-Length", dummyPng.length.toString());
                ctx.res.write(Buffer.from(dummyPng));
                ctx.res.end();
            });
            ctx.body = s;
        }
        if (filename.endsWith(".png")) {
            ctx.set("Content-Type", "image/png");
        } else if (filename.endsWith(".jpg")) {
            ctx.set("Content-Type", "image/jpeg");
        }
    }
}

router.get('/arib.js', async ctx => {
    ctx.body = fs.createReadStream("dist/arib.js");
    ctx.set('Content-Type', 'text/javascript; charset=utf-8')
});

router.get('/arib.js.map', async ctx => {
    ctx.body = fs.createReadStream("dist/arib.js.map");
    ctx.set('Content-Type', 'application/json; charset=utf-8')
});

router.get('/remote_controller.js', async ctx => {
    ctx.body = fs.createReadStream("dist/remote_controller.js");
    ctx.set('Content-Type', 'text/javascript; charset=utf-8')
});

router.get('/remote_controller.js.map', async ctx => {
    ctx.body = fs.createReadStream("dist/remote_controller.js.map");
    ctx.set('Content-Type', 'application/json; charset=utf-8')
});

router.get("/remote_controller.html", async ctx => {
    ctx.body = fs.createReadStream("web/remote_controller.html");
    ctx.set("Content-Type", "text/html; charset=utf-8");
});

router.get('/default.css', async ctx => {
    ctx.body = fs.createReadStream("web/default.css");
    ctx.set('Content-Type', 'text/css; charset=utf-8')
});

router.get("/rounded-mplus-1m-arib.ttf", async ctx => {
    ctx.body = fs.createReadStream("dist/rounded-mplus-1m-arib.ttf");
});

// モトヤマルベリ
router.get("/KosugiMaru-Regular.ttf", async ctx => {
    ctx.body = fs.createReadStream("dist/KosugiMaru-Regular.ttf");
});
// モトヤシーダ
router.get("/Kosugi-Regular.ttf", async ctx => {
    ctx.body = fs.createReadStream("dist/Kosugi-Regular.ttf");
});
router.get('/api/sleep', async ctx => {
    let ms = Number(ctx.query.ms ?? "0");
    await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, ms);
    });
    ctx.body = "OK";
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
    ctx.body = fs.createReadStream("web/video_list.html");
    ctx.set("Content-Type", "text/html; charset=utf-8");
});

router.get("/channels/:channelType/:channel/stream", async ctx => {
    ctx.body = fs.createReadStream("web/index.html");
    ctx.set("Content-Type", "application/xhtml+xml; charset=utf-8");
});

router.get("/channels/:channelType/:channel/services/:id/stream", async ctx => {
    ctx.body = fs.createReadStream("web/index.html");
    ctx.set("Content-Type", "application/xhtml+xml; charset=utf-8");
});

router.get("/videos/:videoFileId", async ctx => {
    ctx.body = fs.createReadStream("web/index.html");
    ctx.set("Content-Type", "application/xhtml+xml; charset=utf-8");
});

function pipeAsync(from: stream.Readable, to: stream.Writable, options?: { end?: boolean }): Promise<void> {
    return new Promise((resolve, reject) => {
        from.pipe(to, options);
        from.on('error', reject);
        from.on('end', resolve);
    });
}

app.use(ws);

router.get("/:a.jpg", async ctx => {
    ctx.set("Content-Type", "image/png");
    const dummyPng = [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x18, 0x57, 0x63, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x5C, 0xCD, 0xFF, 0x69, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];
    ctx.set("Content-Length", dummyPng.length.toString());
    ctx.res.write(Buffer.from(dummyPng));
    ctx.res.end();
});


// UUID => stream
const streams = new Map<string, DataBroadcastingStream>();
const max_number_of_streams = 4;

function closeDataBroadcastingLiveStream(dbs: DataBroadcastingStream) {
    console.log("close live stream ", dbs.id);
    dbs.liveStream?.destroy();
    dbs.tsStream.unpipe();
    dbs.liveStream = undefined;
}

function closeDataBroadcastingStream(dbs: DataBroadcastingStream) {
    closeDataBroadcastingLiveStream(dbs);
    console.log("close ", dbs.id);
    // readStream->transformStream->tsStream->ffmpeg->response
    dbs.transformStream?.unpipe();
    dbs.readStream.unpipe();
    dbs.readStream.destroy();
    dbs.ws.close(4000);
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
            streams.delete(oldest[0].id);
        } else {
            return false;
        }
    }
    streams.set(dbs.id, dbs);
    return true;
}

router.get("/streams/:id.mp4", async (ctx) => {
    const dbs = streams.get(ctx.params.id);
    if (dbs == null) {
        return;
    }
    if (dbs.liveStream) {
        closeDataBroadcastingLiveStream(dbs);
    }
    const { tsStream } = dbs;
    ctx.set("Content-Type", "video/mp4");
    ctx.status = 200;

    tsStream.unpipe();
    dbs.liveStream = new LiveStream(ffmpeg, args, dbs.tsStream);
    tsStream.resume();
    try {
        await pipeAsync(dbs.liveStream.encoderProcess.stdout, ctx.res, { end: true });
    } finally {
        closeDataBroadcastingLiveStream(dbs);
    }
});


router.get("/streams/:id.h264.m2ts", async (ctx) => {
    const dbs = streams.get(ctx.params.id);
    if (dbs == null) {
        return;
    }
    if (dbs.liveStream) {
        closeDataBroadcastingLiveStream(dbs);
    }
    const { tsStream } = dbs;
    ctx.set("Content-Type", "video/mp2t");
    ctx.status = 200;

    tsStream.unpipe();
    dbs.liveStream = new LiveStream(ffmpeg, mpegtsArgs, dbs.tsStream);
    tsStream.resume();
    try {
        await pipeAsync(dbs.liveStream.encoderProcess.stdout, ctx.res, { end: true });
    } finally {
        closeDataBroadcastingLiveStream(dbs);
    }
});

const hlsDir = process.env.HLS_DIR ?? "./hls";
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
    ctx.body = await readFileAsync2(path.join(hlsDir, ctx.params.id + "-" + ctx.params.segment + ".ts"));
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
    const { tsStream } = dbs;
    if (dbs.liveStream instanceof HLSLiveStream) {
        ctx.body = await readFileAsync2(path.join(hlsDir, dbs.id + ".m3u8"));
        return;
    }
    if (dbs.liveStream) {
        closeDataBroadcastingLiveStream(dbs);
    }
    tsStream.unpipe();
    const hlsLiveStream = new HLSLiveStream(ffmpeg, getHLSArguments(hlsDir, path.join(hlsDir, dbs.id + "-%09d.ts"), path.join(hlsDir, dbs.id + ".m3u8")), dbs.tsStream);
    tsStream.resume();
    dbs.liveStream = hlsLiveStream;
    const pollingTime = 100;
    let limitTime = 60 * 1000;
    while (limitTime > 0) {
        if (fs.existsSync(path.join("./hls", dbs.id + ".m3u8"))) {
            ctx.body = await readFileAsync2(path.join("./hls", dbs.id + ".m3u8"));
            return;
        }
        await delayAsync(pollingTime);
        limitTime -= pollingTime;
    }
});

// 40772はLinuxのエフェメラルポート
const mirakBaseUrl = (process.env.MIRAK_URL ?? "http://localhost:40772/").replace(/\/+$/, "") + "/api/";
const epgBaseUrl = (process.env.EPG_URL ?? "http://localhost:8888/").replace(/\/+$/, "") + "/api/";

async function streamToString(stream: stream.Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
}

function httpGetAsync(options: string | http.RequestOptions | URL): Promise<http.IncomingMessage> {
    return new Promise<http.IncomingMessage>((resolve, _reject) => {
        http.get(options, (res) => {
            resolve(res);
        });
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
        }
    ));
    ctx.status = 200;
});

router.get('/api/ws', async (ctx) => {
    if (!ctx.ws) {
        return;
    }
    let readStream: stream.Readable;
    // とりあえず手動validate
    if (typeof ctx.query.param === "string") {
        const query: any = JSON.parse(ctx.query.param);
        if (query != null && typeof query === "object") {
            if (query.type === "mirakLive" && typeof query.channelType === "string" && typeof query.channel === "string" && (query.serviceId == null || typeof query.serviceId == "number")) {
                const q = query as wsApi.MirakLiveParam;
                if (q.serviceId == null) {
                    const res = await httpGetAsync(mirakBaseUrl + `channels/${encodeURIComponent(q.channelType)}/${encodeURIComponent(q.channel)}/stream`);
                    readStream = res;
                } else {
                    const res = await httpGetAsync(mirakBaseUrl + `channels/${encodeURIComponent(q.channelType)}/${encodeURIComponent(q.channel)}/services/${q.serviceId}/stream`);
                    readStream = res;
                }
            } else if (query.type === "epgStationRecorded" && typeof query.videoFileId === "number") {
                const q = query as wsApi.EPGStationRecordedParam;
                readStream = await httpGetAsync(epgBaseUrl + `videos/${q.videoFileId}`);
            } else {
                return;
            }
        } else {
            return;
        }
    } else {
        readStream = process.argv[2] === "-" ? process.stdin : fs.createReadStream(process.argv[2]);
    }
    const ws = await ctx.ws();
    const id = randomUUID();
    let size = process.argv[2] === "-" ? 0 : fs.statSync(process.argv[2]).size;
    const tsStream = new TsStream();

    const dbs = {
        id,
        registeredAt: new Date(),
        readStream,
        tsStream,
        size,
        ws,
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
    // TODO: readStreamを読み終わった時もちゃんと閉じた方がよさそう

    tsStream.pause();
    decodeTS(dbs);

    ws.on("close", (_code: number, _reason: Buffer) => {
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

console.log("OK");
app
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(23234);
