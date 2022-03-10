import Koa from 'koa';
import Router from 'koa-router';
import fs, { readFileSync } from "fs"
import 'dotenv/config'
import { TextDecoder } from 'util';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { transpile } from "./transpile_ecm";
import { Declaration as CSSDeclaration } from "css";
import path from "path";
import { decodeEUCJP } from './euc_jp';
import { loadDRCS, toTTF } from './drcs';
import stream from "stream";
import { TsStream, TsUtil } from "@chinachu/aribts";
import zlib from "zlib";
import { EntityParser, MediaType, parseMediaType, entityHeaderToString } from './entity_parser';
import websocket, { WebSocketContext } from "koa-easy-ws";
import * as wsApi from "./ws_api";
import { WebSocket } from "ws";
import CRC32 from "crc-32";
import { transpileCSS } from './transpile_css';
import { ComponentPMT, AdditionalAribBXMLInfo } from './ws_api';
import { defaultCLUT } from './default_clut';

const ws = websocket();

type ModuleLockRequest = {
    componentId: number,
    moduleId: number,
};

const moduleLockRequests: ModuleLockRequest[] = [];

let size = process.argv[2] === "-" ? 0 : fs.statSync(process.argv[2]).size;
let bytesRead = 0;

const readStream = process.argv[2] === "-" ? process.stdin : fs.createReadStream(process.argv[2]);
const transformStream = new stream.Transform({
    transform: function (chunk, _encoding, done) {
        bytesRead += chunk.length;

        process.stderr.write(`\r${bytesRead} of ${size} [${Math.floor(bytesRead / size * 100)}%]`);

        this.push(chunk);
        done();
    },
    flush: function (done) {
        process.stderr.write(`${bytesRead} of ${size} [${Math.floor(bytesRead / size * 100)}%]\n`);

        done();
    }
});
const tsStream = new TsStream();

const tsUtil = new TsUtil();

readStream.pipe(transformStream);
transformStream.pipe(tsStream);

tsStream.on("data", () => {
    // nothing
});

tsStream.on("drop", (pid: any, counter: any, expected: any) => {
    let time = "unknown";

    if (tsUtil.hasTime()) {
        let date = tsUtil.getTime();
        if (date) {
            time = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}:${("0" + date.getSeconds()).slice(-2)}`;
        }
    }

    console.error(`pid: 0x${("000" + pid.toString(16)).slice(-4)}, counter: ${counter}, expected: ${expected}, time: ${time}`);
    console.error("");
});

tsStream.on("info", (data: any) => {
    console.error("");
    console.error("info:");
    Object.keys(data).forEach(key => {
        console.error(`0x${("000" + parseInt(key, 10).toString(16)).slice(-4)}: packet: ${data[key].packet}, drop: ${data[key].drop}, scrambling: ${data[key].scrambling}`);
    });
});

tsStream.on("tdt", (pid: any, data: any) => {
    tsUtil.addTdt(pid, data);
});

tsStream.on("tot", (pid: any, data: any) => {
    tsUtil.addTot(pid, data);
});

let pidToComponent = new Map<number, ComponentPMT>();
let componentToPid = new Map<number, ComponentPMT>();

function broadcast(msg: wsApi.ResponseMessage) {
    for (const client of ws.server.clients) {
        client.send(JSON.stringify(msg));
    }
}

function unicast(client: WebSocket, msg: wsApi.ResponseMessage) {
    client.send(JSON.stringify(msg));
}

function decodeAdditionalAribBXMLInfo(additional_data_component_info: Buffer): AdditionalAribBXMLInfo {
    let off = 0;
    // 地上波についてはTR-B14 第二分冊 2.1.4 表2-3を参照
    // BSについてはTR-B15 第一分冊 5.1.5 表5-4を参照
    // BS, CSについてはTR-B15 第四分冊 5.1.5 表5-4を参照
    // 00: データカルーセル伝送方式およびイベントメッセージ伝送方式 これのみが運用される
    // 01: データカルーセル伝送方式(蓄積専用データサービス)
    const transmission_format = ((additional_data_component_info[off] & 0b11000000) >> 6) & 0b11;
    // component_tag=0x40のとき必ず1となる
    // startup.xmlが最初に起動される (STD-B24 第二分冊 (1/2) 第二編 9.2.2参照)
    const entry_point_flag = ((additional_data_component_info[off] & 0b00100000) >> 5) & 0b1;
    const bxmlInfo: AdditionalAribBXMLInfo = {
        transmissionFormat: transmission_format,
        entryPointFlag: !!entry_point_flag,
    };
    // STD-B24 第二分冊 (1/2) 第二編 9.3参照
    if (entry_point_flag) {
        // 運用
        const auto_start_flag = ((additional_data_component_info[off] & 0b00010000) >> 4) & 0b1;
        // 以下が運用される
        // 0011: 960x540 (16:9)
        // 0100: 640x480 (16:9)
        // 0101: 640x480 (4:3)

        // 以下は仕様のみ
        // 0000: 混在
        // 0001: 1920x1080 (16:9)
        // 0010: 1280x720 (16:9)
        // 0110: 320x240 (4:3)
        // 1111: 指定しない (Cプロファイルでのみ運用)
        const document_resolution = ((additional_data_component_info[off] & 0b00001111) >> 0) & 0b1111;
        off++;
        // 0のみが運用される
        const use_xml = ((additional_data_component_info[off] & 0b10000000) >> 7) & 0b1;
        // 地上波, CSでは0のみが運用される
        // BSでは1(bml_major_version=1, bml_minor_version=0)が指定されることもある
        const default_version_flag = ((additional_data_component_info[off] & 0b01000000) >> 6) & 0b1;
        // 地上波では1のみ運用, BS/CSの場合1の場合単独視聴可能, 0の場合単独視聴不可
        const independent_flag = ((additional_data_component_info[off] & 0b00100000) >> 5) & 0b1;
        // 運用される
        const style_for_tv_flag = ((additional_data_component_info[off] & 0b00010000) >> 4) & 0b1;
        // reserved
        off++;
        bxmlInfo.entryPointInfo = {
            autoStartFlag: !!auto_start_flag,
            documentResolution: document_resolution,
            useXML: !!use_xml,
            defaultVersionFlag: !!default_version_flag,
            independentFlag: !!independent_flag,
            styleForTVFlag: !!style_for_tv_flag,
            bmlMajorVersion: 1,
            bmlMinorVersion: 1,
        };
        // BSではbml_major_versionは1
        // CSではbml_major_versionは2
        // 地上波ではbml_major_versionは3
        if (default_version_flag === 0) {
            let bml_major_version = additional_data_component_info[off] << 16;
            off++;
            bml_major_version |= additional_data_component_info[off];
            bxmlInfo.entryPointInfo.bmlMajorVersion = bml_major_version;
            off++;
            let bml_minor_version = additional_data_component_info[off] << 16;
            off++;
            bml_minor_version |= additional_data_component_info[off];
            bxmlInfo.entryPointInfo.bmlMinorVersion = bml_minor_version;
            off++;
            // 運用されない
            if (use_xml == 1) {
                let bxml_major_version = additional_data_component_info[off] << 16;
                off++;
                bxml_major_version |= additional_data_component_info[off];
                bxmlInfo.entryPointInfo.bxmlMajorVersion = bxml_major_version;
                off++;
                let bxml_minor_version = additional_data_component_info[off] << 16;
                off++;
                bxml_minor_version |= additional_data_component_info[off];
                bxmlInfo.entryPointInfo.bxmlMinorVersion = bxml_minor_version;
                off++;
            }
        }
    } else {
        // reserved
        off++;
    }
    if (transmission_format === 0) {
        // additional_arib_carousel_info (STD-B24 第三分冊 第三編 C.1)
        // 常に0xF
        const data_event_id = ((additional_data_component_info[off] & 0b11110000) >> 4) & 0b1111;
        // 常に1
        const event_section_flag = ((additional_data_component_info[off] & 0b00001000) >> 3) & 0b1;
        //reserved
        off++;
        // 地上波ならば常に1, BS/CSなら1/0
        const ondemand_retrieval_flag = ((additional_data_component_info[off] & 0b10000000) >> 7) & 0b1;
        // 地上波ならば常に0, BS/CSなら/-
        const file_storable_flag = ((additional_data_component_info[off] & 0b01000000) >> 6) & 0b1;
        // 運用
        const start_priority = ((additional_data_component_info[off] & 0b00100000) >> 5) & 0b1;
        bxmlInfo.additionalAribCarouselInfo = {
            dataEventId: data_event_id,
            eventSectionFlag: !!event_section_flag,
            ondemandRetrievalFlag: !!ondemand_retrieval_flag,
            fileStorableFlag: !!file_storable_flag,
            startPriority: start_priority,
        };
        // reserved
        off++;
    } else if (transmission_format == 1) {
        // reserved
        off++;
    }
    return bxmlInfo;
}

tsStream.on("pmt", (pid: any, data: any) => {
    const ptc = new Map<number, ComponentPMT>();
    const ctp = new Map<number, ComponentPMT>();
    for (const stream of data.streams) {
        // 0x0d: データカルーセル
        if (stream.stream_type != 0x0d) {
            continue;
        }
        const pid = stream.elementary_PID;
        let bxmlInfo: AdditionalAribBXMLInfo | undefined;
        let componentId: number | undefined;
        for (const esInfo of stream.ES_info) {
            if (esInfo.descriptor_tag == 0x52) { // Stream identifier descriptor ストリーム識別記述子
                // PID => component_tagの対応
                const component_tag = esInfo.component_tag;
                componentId = component_tag;
            } else if (esInfo.descriptor_tag == 0xfd) { // Data component descriptor データ符号化方式記述子
                let additional_data_component_info: Buffer = esInfo.additional_data_component_info;
                let data_component_id: number = esInfo.data_component_id;
                // FIXME!!!!!!!!
                // aribtsの実装がおかしくてdata_component_idを8ビットとして読んでる
                if (esInfo.additional_data_component_info.length + 1 === esInfo.descriptor_length) {
                    data_component_id <<= 8;
                    data_component_id |= additional_data_component_info[0];
                    additional_data_component_info = additional_data_component_info.subarray(1);
                }
                if (data_component_id == 0x0C || // 地上波
                    data_component_id == 0x07 || // BS
                    data_component_id == 0x0B // CS
                ) {
                    bxmlInfo = decodeAdditionalAribBXMLInfo(additional_data_component_info);
                }
            }
        }
        if (componentId == null || bxmlInfo == null) {
            console.error("invalid stream in PMT");
            continue;
        }
        const componentPMT: ComponentPMT = {
            componentId,
            pid,
            bxmlInfo,
            }
        ptc.set(pid, componentPMT);
        ctp.set(componentPMT.componentId, componentPMT);
        }
    pidToComponent = ptc;
    if (componentToPid.size !== ctp.size || [...componentToPid.keys()].some((x) => !ctp.has(x))) {
        // PMTが変更された
        console.log("PMT changed");
        componentToPid = ctp;
        const msg: wsApi.PMTMessage = {
            type: "pmt",
            components: [...componentToPid.values()]
        };
        broadcast(msg);
    }
});

type DownloadComponentInfo = {
    componentId: number,
    downloadId: number,
    downloadedModuleCount: number,
    modules: Map<number, DownloadModuleInfo>,
};

const downloadComponents = new Map<number, DownloadComponentInfo>();

enum CompressionType {
    None = -1,
    Zlib = 0,
}

type DownloadModuleInfo = {
    compressionType: CompressionType,
    originalSize?: number,
    moduleId: number,
    moduleVersion: number,
    moduleSize: number,
    contentType?: string,
    blocks: (Buffer | undefined)[],
    downloadedBlockCount: number,
};

type CachedModuleFile = {
    contentType: MediaType,
    contentLocation: string,
    data: Buffer,
};

type CachedModule = {
    downloadModuleInfo: DownloadModuleInfo,
    files?: Map<string, CachedModuleFile>,
};

type CachedComponent = {
    modules: Map<number, CachedModule>,
};

const cachedComponents = new Map<number, CachedComponent>();

tsStream.on("dsmcc", (pid: any, data: any) => {
    const c = pidToComponent.get(pid);
    if (c == null) {
        return;
    }
    const { componentId } = c;
    if (data.table_id === 0x3b) {
        // DII
        // console.log(pid, data);
        const transationIdLow2byte: number = data.table_id_extension;
        const sectionNumber: number = data.section_number;
        const lastSectionNumber: number = data.last_section_number;

        const modules = new Map<number, DownloadModuleInfo>();
        // dsmccMessageHeader
        // protocolDiscriminatorは常に0x11
        // dsmccTypeは常に0x03
        // messageIdは常に0x1002
        const message = data.message;
        const downloadId: number = message.downloadId;
        if (downloadComponents.get(componentId)?.downloadId === downloadId) {
            return;
        }
        const componentInfo: DownloadComponentInfo = {
            componentId,
            modules,
            downloadId,
            downloadedModuleCount: 0,
        };
        // downloadIdの下位28ビットは常に1で運用される
        const data_event_id = (downloadId >> 28) & 15;
        console.log(`componentId: ${componentId.toString(16).padStart(2, "0")} downloadId: ${downloadId}`)
        // blockSizeは常に4066
        const blockSize: number = message.blockSize;
        // windowSize, ackPeriod, tCDownloadWindowは常に0
        // privateDataは運用しない
        // 0<=numberOfModules<=64で運用
        // moduleSize<=256KB
        // compatibilityDescriptorは運用しない
        for (const module of data.message.modules) {
            const moduleId: number = module.moduleId;
            const moduleVersion: number = module.moduleVersion;
            const moduleSize: number = module.moduleSize;
            const moduleInfo: DownloadModuleInfo = {
                compressionType: CompressionType.None,
                moduleId,
                moduleVersion,
                moduleSize,
                blocks: new Array(Math.ceil(moduleSize / blockSize)),
                downloadedBlockCount: 0,
            };
            modules.set(moduleId, moduleInfo);
            console.log(`   moduleId: ${moduleId.toString(16).padStart(4, "0")} moduleVersion: ${moduleVersion}`)
            for (const info of module.moduleInfo) {
                const descriptor: Buffer = info.descriptor;
                // Type記述子, ダウンロード推定時間記述子, Compression Type記述子のみ運用される(TR-B14 第三分冊 4.2.4 表4-4参照)
                if (info.descriptor_tag === 0x01) { // Type記述子 STD-B24 第三分冊 第三編 6.2.3.1
                    const contentType = descriptor.toString("ascii");
                    moduleInfo.contentType = contentType;
                } else if (info.descriptor_tag === 0x07) { // ダウンロード推定時間記述子 STD-B24 第三分冊 第三編 6.2.3.6
                    const est_download_time = descriptor.readUInt32BE(0);
                } else if (info.descriptor_tag === 0xC2) { // Compression Type記述子 STD-B24 第三分冊 第三編 6.2.3.9
                    const compression_type = descriptor.readInt8(0); // 0: zlib
                    const original_size = descriptor.readUInt32BE(1);
                    moduleInfo.originalSize = original_size;
                    moduleInfo.compressionType = compression_type as CompressionType;
                }
            }
        }
        broadcast({
            type: "moduleListUpdated",
            componentId,
            modules: data.message.modules.map((x: any) => x.moduleId),
        });
        downloadComponents.set(componentId, componentInfo);
        //for (const req of moduleLockRequests.filter(x => x.componentId === componentId)) {
        //    if (req.)

        //}
    } else if (data.table_id === 0x3c) {
        const componentInfo = downloadComponents.get(componentId);
        if (componentInfo == null) {
            return;
        }
        // DDB
        const headerModuleId: number = data.table_id_extension;
        const headerModuleVersionLow5bit: number = data.version_number;
        const headerBlockNumberLow8bit: number = data.section_number;

        const moduleId = data.message.moduleId;
        const moduleVersion = data.message.moduleVersion;
        const blockNumber = data.message.blockNumber;

        const moduleInfo = componentInfo.modules.get(moduleId);
        // console.log(`download ${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}`)
        if (moduleInfo == null) {
            return;
        }
        if (moduleInfo.moduleVersion !== moduleVersion) {
            return;
        }
        if (moduleInfo.blocks.length <= blockNumber) {
            return;
        }
        if (moduleInfo.blocks[blockNumber] != null) {
            return;
        }
        moduleInfo.blocks[blockNumber] = data.message.blockDataByte as Buffer;
        moduleInfo.downloadedBlockCount++;
        if (moduleInfo.downloadedBlockCount >= moduleInfo.blocks.length) {
            componentInfo.downloadedModuleCount++;
            const cachedComponent = cachedComponents.get(componentId) ?? {
                modules: new Map<number, CachedModule>(),
            };
            const cachedModule: CachedModule = {
                downloadModuleInfo: moduleInfo,
            };
            let moduleData = Buffer.concat(moduleInfo.blocks as Buffer[]);
            if (moduleInfo.compressionType === CompressionType.Zlib) {
                moduleData = zlib.inflateSync(moduleData);
            }
            const previousCachedModule = cachedComponent.modules.get(moduleInfo.moduleId);
            if (previousCachedModule != null && previousCachedModule.downloadModuleInfo.moduleVersion === moduleInfo.moduleVersion) {
                // 更新されていない
                return;
            }
            console.info(`component ${componentId.toString(16).padStart(2, "0")} module ${moduleId.toString(16).padStart(4, "0")}updated`);
            if (moduleInfo.contentType == null || moduleInfo.contentType.toLowerCase() === "multipart/mixed") {
                const parser = new EntityParser(moduleData);
                const mod = parser.readEntity();
                if (mod?.multipartBody == null) {
                    console.error("failed to parse module");
                } else {
                    const files = new Map<string, CachedModuleFile>();
                    for (const entity of mod.multipartBody) {
                        const location = entity.headers.find(x => x.name === "content-location");
                        if (location == null) { // 必ず含む
                            console.error("failed to find Content-Location");
                            continue;
                        }
                        const contentType = entity.headers.find(x => x.name === "content-type");
                        if (contentType == null) { // 必ず含む
                            console.error("failed to find Content-Type");
                            continue;
                        }
                        const mediaType = parseMediaType(contentType.value);
                        if (mediaType == null) {
                            console.error("failed to parse Content-Type");
                            continue;
                        }
                        const locationString = entityHeaderToString(location);
                        console.log("    ", locationString, entityHeaderToString(contentType));
                        files.set(locationString, {
                            contentLocation: locationString,
                            contentType: mediaType,
                            data: entity.body,
                        });
                    }
                    cachedModule.files = files;
                    broadcast({
                        type: "moduleDownloaded",
                        componentId,
                        moduleId,
                        files: [...files.values()].map(x => ({
                            contentType: x.contentType,
                            contentLocation: x.contentLocation,
                            dataBase64: x.data.toString("base64"),
                        }))
                    });
                }
            }
            cachedComponent.modules.set(moduleInfo.moduleId, cachedModule);
            cachedComponents.set(componentId, cachedComponent);
        }
    } else if (data.table_id === 0x3e) {
        // ストリーム記述子
    }
});

const baseDir = process.env.BASE_DIR;
if (!baseDir) {
    console.error("BASE_DIR");
    process.exit(1);
}

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
                }, {
                    "script": [
                        {
                            "#text": JSON.stringify(componentToPid.keys())
                        }
                    ], ":@": {
                        "@_type": "application/json",
                        "@_id": "pmt-data",
                    }
                });
                //console.log(JSON.stringify(parsed, null, 4));
                resolve(builder.build(parsed));
            }
        });
    });
}

function readCLUT(clut: Buffer): number[][] {
    let table = defaultCLUT.slice();
    const prevLength = table.length;
    table.length = 256;
    table = table.fill([0, 0, 0, 255], prevLength, 256);
    // STD-B24 第二分冊(2/2) A3 5.1.7 表5-8参照
    // clut_typeは0(YCbCr)のみ運用される
    const clutType = clut[0] & 0x80;
    // depthは8ビット(1)のみが運用される
    const depth = (clut[0] & 0x60) >> 5;
    // region_flagは0のみが運用される
    const regionFlag = clut[0] & 0x10;
    // start_end_flagは1のみが運用される
    const startEndFlag = clut[0] & 0x8;
    let index = 1;
    if (regionFlag) {
        index += 2;
        index += 2;
        index += 2;
        index += 2;
        // 運用されない
        console.error("region is not implemented");
    }
    let startIndex: number;
    let endIndex: number;
    if (startEndFlag) {
        if (depth == 0) {
            startIndex = clut[index] >> 4;
            endIndex = clut[index] & 15;
            index++;
        } else if (depth == 1) {
            // start_indexは128のみが運用される
            startIndex = clut[index++];
            // end_ndexは223のみが運用される
            endIndex = clut[index++];
        } else if (depth == 2) {
            startIndex = clut[index++];
            startIndex = (startIndex << 8) | clut[index++];
            endIndex = clut[index++];
            endIndex = (endIndex << 8) | clut[index++];
        } else {
            throw new Error("unexpected");
        }
        for (let i = startIndex; i <= endIndex; i++) {
            let R: number;
            let G: number;
            let B: number;
            if (clutType == 0) {
                const Y = clut[index++];
                const Cb = clut[index++];
                const Cr = clut[index++];
                R = Math.max(0, Math.min(255, Math.floor(1.164 * (Y - 16) + 1.793 * (Cr - 128))));
                G = Math.max(0, Math.min(255, Math.floor(1.164 * (Y - 16) - 0.213 * (Cb - 128) - 0.533 * (Cr - 128))));
                B = Math.max(0, Math.min(255, Math.floor(1.164 * (Y - 16) + 2.112 * (Cb - 128))));
            } else {
                R = clut[index++];
                G = clut[index++];
                B = clut[index++];
            }
            // Aは0以外が運用される
            const A = clut[index++];
            table[i] = [R, G, B, A];
        }
    } else {
        // 運用されない
        throw new Error("not implemented");
    }
    return table;
}


function preparePLTE(clut: number[][]): Buffer {
    const plte = Buffer.alloc(4 /* PLTE */ + 4 /* size */ + clut.length * 3 + 4 /* CRC32 */);
    let off = 0;
    off = plte.writeUInt32BE(clut.length * 3, off);
    off += plte.write("PLTE", off);
    for (const entry of clut) {
        off = plte.writeUInt8(entry[0], off);
        off = plte.writeUInt8(entry[1], off);
        off = plte.writeUInt8(entry[2], off);
    }
    plte.writeInt32BE(CRC32.buf(plte.slice(4, off), 0), off);
    return plte;
}

function prepareTRNS(clut: number[][]): Buffer {
    const trns = Buffer.alloc(4 /* PLTE */ + 4 /* size */ + clut.length + 4 /* CRC32 */);
    let off = 0;
    off = trns.writeUInt32BE(clut.length, off);
    off += trns.write("tRNS", off);
    for (const entry of clut) {
        off = trns.writeUInt8(entry[3], off);
    }
    trns.writeInt32BE(CRC32.buf(trns.slice(4, off), 0), off);
    return trns;
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

function isPLTEMissing(png: Buffer): boolean {
    let off = 8;
    // IHDR
    const type = png[off + 0x11];
    // palette
    if (type !== 3) {
        return false;
    }
    off += png.readUInt32BE(off) + 4 * 3;
    while (true) {
        let chunkLength = png.readUInt32BE(off);
        let chunkType = png.toString("ascii", off + 4, off + 8);
        if (chunkType === "IDAT" || chunkType === "IEND") {
            return true;
        }
        if (chunkType === "PLTE") {
            return false;
        }
        off += chunkLength + 4 * 3;
    }
}

async function aribPNGToPNG(png: Buffer, clut: string): Promise<Buffer> {
    if (!isPLTEMissing(png)) {
        return png;
    }
    const table = readCLUT(await readFileAsync2(`${process.env.BASE_DIR}/${clut}`));
    const plte = preparePLTE(table);
    const trns = prepareTRNS(table);
    const output = Buffer.alloc(png.length + plte.length + trns.length);
    let off = 0;
    off += png.copy(output, off, 0, 33);
    off += plte.copy(output, off);
    off += trns.copy(output, off);
    off += png.copy(output, off, 33);
    return output;
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
            ctx.body = await aribPNGToPNG(png, clut);
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
    ctx.set('Content-Type', 'text/javascript')
});

router.get('/arib.js.map', async ctx => {
    ctx.body = fs.createReadStream("dist/arib.js.map");
    ctx.set('Content-Type', 'application/json')
});

router.get('/default.css', async ctx => {
    ctx.body = fs.createReadStream("web/default.css");
    ctx.set('Content-Type', 'text/css')
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

router.get("/", async ctx => {
    ctx.body = fs.createReadStream("web/index.html");
    ctx.set("Content-Type", "text/html");
});
app.use(ws);

router.get('/api/ws', async (ctx) => {
    if (!ctx.ws) {
        return;
    }
    const ws = await ctx.ws();
    ws.on("message", (message) => {
        const request = JSON.parse(message.toString("utf-8")) as wsApi.RequestMessage;
        if (request.type === "moduleLockRequest") {
            const cachedModule = cachedComponents.get(request.componentId)?.modules?.get(request.moduleId);
            if (cachedModule == null) {
                if (!componentToPid.has(request.componentId)) {
                    ws.send(JSON.stringify({
                        type: "moduleLockResponse",
                        moduleId: request.moduleId,
                        componentId: request.componentId,
                        isEx: request.isEx,
                        status: 1,
                        files: []
                    } as wsApi.ModuleLockResponseMessage));
                } else {
                    moduleLockRequests.push({ componentId: request.componentId, moduleId: request.moduleId });
                }
            } else {
                ws.send(JSON.stringify({
                    type: "moduleLockResponse",
                    moduleId: request.moduleId,
                    componentId: request.componentId,
                    isEx: request.isEx,
                    status: 0,
                    files: !cachedModule.files ? [] : [...cachedModule.files.values()].map(x => ({
                        contentLocation: x.contentLocation,
                        contentType: x.contentType,
                        data: x.data.toString("base64")
                    }))
                } as wsApi.ModuleLockResponseMessage));
            }
        }
    });
    unicast(ws, {
        type: "pmt",
        components: [...componentToPid.values()]
    });
    for (const [componentId, component] of cachedComponents) {
        for (const module of component.modules.values()) {
            if (module.files == null) {
                continue;
            }
            unicast(ws, {
                type: "moduleDownloaded",
                componentId,
                moduleId: module.downloadModuleInfo.moduleId,
                files: [...module.files.values()].map(x => ({
                    contentType: x.contentType,
                    contentLocation: x.contentLocation,
                    dataBase64: x.data.toString("base64"),
                }))
            });
        }
    }
});

console.log("OK");
app
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(23234);
