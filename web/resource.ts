import { ComponentPMT, CurrentTime, MediaType, ProgramInfoMessage, ResponseMessage, Param, MirakLiveParam, EPGStationRecordedParam } from "../src/ws_api";

import { play as playMP4 } from "./player/mp4";
import { play as playMPEGTS } from "./player/mpegts";
import { play as playHLS } from "./player/hls";

export class LongJump extends Error { }
function getParametersFromUrl(url: string): Param | {} {
    const pathname = new URL(url).pathname;
    const mirakGroups = /^\/channels\/(?<type>.+?)\/(?<channel>.+?)\/(services\/(?<serviceId>.+?)\/)?stream\/*$/.exec(pathname)?.groups;
    if (mirakGroups != null) {
        const type = decodeURIComponent(mirakGroups.type);
        const channel = decodeURIComponent(mirakGroups.channel);
        const serviceId = Number.parseInt(decodeURIComponent(mirakGroups.serviceId));
        return {
            type: "mirakLive",
            channel,
            channelType: type,
            serviceId: Number.isNaN(serviceId) ? undefined : serviceId,
        } as MirakLiveParam;
    } else {
        const epgGroups = /^\/videos\/(?<videoId>.+?)\/*$/.exec(pathname)?.groups;
        if (epgGroups != null) {
            const videoFileId = Number.parseInt(decodeURIComponent(epgGroups.videoId));
            if (!Number.isNaN(videoFileId)) {
                return {
                    type: "epgStationRecorded",
                    videoFileId,
                } as EPGStationRecordedParam;
            }
        }
    }
    return {};
}

// 運用的には固定
let entryPointComponentId = 0x40;
let entryPointModuleId = 0x0000;
export let activeDocument: null | string = null;
// FIXME
function documentLoaded() {
    return activeDocument != null;
}
export function setActiveDocument(doc: string) {
    activeDocument = doc;
}
const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/ws?param=" + encodeURIComponent(JSON.stringify(getParametersFromUrl(location.href))));
const cachedComponents = new Map<number, CachedComponent>();
export type CachedComponent = {
    componentId: number,
    modules: Map<number, CachedModule>,
};
export type CachedModule = {
    moduleId: number,
    files: Map<string, CachedFile>
};

export type CachedFile = {
    contentLocation: string,
    contentType: MediaType,
    data: Uint8Array,
    blobUrl: Map<any, string>,
};

export type LockedComponent = {
    componentId: number,
    modules: Map<number, LockedModule>,
};

export type LockedModule = {
    moduleId: number,
    files: Map<string, CachedFile>,
    lockedBy: "system" | "lockModuleOnMemory" | "lockModuleOnMemoryEx",
};

type DownloadComponentInfo = {
    componentId: number,
    modules: Set<number>,
};

const downloadComponents = new Map<number, DownloadComponentInfo>();

export function getCachedFileBlobUrl(file: CachedFile, key?: any): string {
    let b = file.blobUrl.get(key);
    if (b != null) {
        return b;
    }
    b = URL.createObjectURL(new Blob([file.data], { type: `${file.contentType.type}/${file.contentType.originalSubtype}` }));
    file.blobUrl.set(key, b);
    return b;
}

const lockedComponents = new Map<number, LockedComponent>();

// component id => PMT
let pmtComponents = new Map<number, ComponentPMT>();
let pmtRetrieved = false;

function getCachedModule(componentId: number, moduleId: number): CachedModule | undefined {
    const cachedComponent = cachedComponents.get(componentId);
    if (cachedComponent == null) {
        return undefined;
    }
    return cachedComponent.modules.get(moduleId);
}

export function getPMTComponent(componentId: number): ComponentPMT | undefined {
    const pmtComponent = pmtComponents.get(componentId);
    return pmtComponent;
}

export function lockCachedModule(componentId: number, moduleId: number, lockedBy: "system" | "lockModuleOnMemory" | "lockModuleOnMemoryEx"): boolean {
    const cachedModule = getCachedModule(componentId, moduleId);
    if (cachedModule == null) {
        return false;
    }
    const lockedComponent = lockedComponents.get(componentId) ?? {
        componentId,
        modules: new Map<number, LockedModule>(),
    };
    lockedComponent.modules.set(moduleId, { files: cachedModule.files, lockedBy, moduleId: cachedModule.moduleId });
    lockedComponents.set(componentId, lockedComponent);
    return true;
}

export function isModuleLocked(componentId: number, moduleId: number): boolean {
    return lockedComponents.get(componentId)?.modules?.has(moduleId) ?? false;
}

export function unlockAllModule() {
    lockedComponents.clear();
}

export function unlockModule(componentId: number, moduleId: number, isEx: boolean): boolean {
    const m = lockedComponents.get(componentId);
    if (m != null) {
        const mod = m.modules.get(moduleId);
        if (mod == null) {
            return false;
        }
    }
    return false;
}

// FIXME
export function moduleExistsInDownloadInfo(componentId: number, moduleId: number): boolean {
    return downloadComponents.get(componentId)?.modules?.has(moduleId) ?? false;
}

type LockModuleRequest = {
    moduleRef: string,
    componentId: number,
    moduleId: number,
    isEx: boolean,
};

const lockModuleRequests: Map<string, LockModuleRequest> = new Map();

function moduleAndComponentToString(componentId: number, moduleId: number) {
    return `${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}`;
}

// うーん
let onModuleLockedHandler: ((module: string, isEx: boolean, status: number) => void) | null = null;
export function registerOnModuleLockedHandler(func: typeof onModuleLockedHandler) {
    onModuleLockedHandler = func;
}

export function requestLockModule(moduleRef: string, componentId: number, moduleId: number, isEx: boolean) {
    // FIXME: リクエスト分イベント発火させるべきかも
    lockModuleRequests.set(`${componentId}/${moduleId}`, { moduleRef, componentId, moduleId, isEx });
}

export let currentProgramInfo: ProgramInfoMessage | null = null;
export let currentTime: CurrentTime | null = null;

export const resourceEventTarget = new EventTarget();

ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data) as ResponseMessage;
    if (msg.type === "moduleDownloaded") {
        const cachedComponent = cachedComponents.get(msg.componentId) ?? {
            componentId: msg.componentId,
            modules: new Map()
        };
        const cachedModule: CachedModule = {
            moduleId: msg.moduleId,
            files: new Map(msg.files.map(file => ([file.contentLocation.toLowerCase(), {
                contentLocation: file.contentLocation,
                contentType: file.contentType,
                data: Uint8Array.from(window.atob(file.dataBase64), c => c.charCodeAt(0)),
                blobUrl: new Map(),
            } as CachedFile]))),
        };
        cachedComponent.modules.set(msg.moduleId, cachedModule);
        cachedComponents.set(msg.componentId, cachedComponent);
        // OnModuleUpdated
        const k = `${msg.componentId}/${msg.moduleId}`;
        const req = lockModuleRequests.get(k);
        if (req != null) {
            lockModuleRequests.delete(k);
            lockCachedModule(msg.componentId, msg.moduleId, req.isEx ? "lockModuleOnMemoryEx" : "lockModuleOnMemory");
            if (onModuleLockedHandler) {
                onModuleLockedHandler(req.moduleRef, req.isEx, 0);
            }
        }
        const str = moduleAndComponentToString(msg.componentId, msg.moduleId);
        const creq = componentRequests.get(msg.componentId);
        const callbacks = creq?.moduleRequests?.get(msg.moduleId);
        if (creq != null && callbacks != null) {
            creq.moduleRequests.delete(msg.componentId);
            for (const cb of callbacks) {
                if (cb.filename == null) {
                    console.warn("async fetch done", str);
                    cb.resolve(null);
                } else {
                    const file = cachedModule.files.get(cb.filename);
                    console.warn("async fetch done", str, cb.filename);
                    cb.resolve(file ?? null);
                }
            }
        }
        const url = "/" + str;
        if (currentProgramInfo == null) {
            return;
        }
    } else if (msg.type === "moduleListUpdated") {
        const component = {
            componentId: msg.componentId,
            modules: new Set(msg.modules)
        };
        downloadComponents.set(msg.componentId, component);
        const creqs = componentRequests.get(msg.componentId);
        if (creqs) {
            for (const [moduleId, mreqs] of creqs.moduleRequests) {
                if (!component.modules.has(moduleId)) {
                    // DIIに存在しない
                    for (const mreq of mreqs) {
                        console.warn("async fetch done (failed)", moduleAndComponentToString(msg.componentId, moduleId));
                        mreq.resolve(null);
                    }
                    mreqs.length = 0;
                }
            }
        }
    } else if (msg.type === "pmt") {
        pmtRetrieved = true;
        pmtComponents = new Map(msg.components.map(x => [x.componentId, x]));
        if (!documentLoaded()) {
            for (const component of msg.components) {
                if (component.bxmlInfo.entryPointFlag) {
                    entryPointComponentId = component.componentId;
                    // window.browser.launchDocument(`/${entryPointComponentId.toFixed(16).padStart(2, "0")}/${entryPointModuleId.toFixed(16).padStart(4, "0")}/startup.bml`);
                }
            }
        }
    } else if (msg.type === "programInfo") {
        currentProgramInfo = msg;
    } else if (msg.type === "currentTime") {
        currentTime = msg;
    } else if (msg.type === "videoStreamUrl") {
        const videoElement = document.querySelector("video") as HTMLVideoElement; // a
        playMPEGTS(msg.videoStreamUrl, videoElement);
        videoElement.style.display = "";
    } else if (msg.type === "error") {
        console.error(msg);
    }
    resourceEventTarget.dispatchEvent(new CustomEvent("message", { detail: msg }));
});

export function parseURL(url: string): { component: string | null, module: string | null, filename: string | null } {
    if (url.startsWith("~/")) {
        url = ".." + url.substring(1);
    }
    url = new URL(url, "http://localhost" + activeDocument).pathname.toLowerCase();
    const components = url.split("/");
    // [0] ""
    // [1] component
    // [2] module
    // [3] filename
    if (components.length > 4) {
        return { component: null, module: null, filename: null };
    }
    return { component: components[1] ?? null, module: components[2] ?? null, filename: components[3] ?? null };
}

export function parseURLEx(url: string): { componentId: number | null, moduleId: number | null, filename: string | null } {
    const { component, module, filename } = parseURL(url);
    const componentId = Number.parseInt(component ?? "", 16);
    const moduleId = Number.parseInt(module ?? "", 16);
    if (!Number.isInteger(componentId)) {
        return { componentId: null, moduleId: null, filename: null };
    }
    if (!Number.isInteger(moduleId)) {
        return { componentId, moduleId: null, filename: null };
    }
    return { componentId, moduleId, filename };
}

export function fetchLockedResource(url: string): CachedFile | null {
    const { component, module, filename } = parseURL(url);
    const componentId = Number.parseInt(component ?? "", 16);
    const moduleId = Number.parseInt(module ?? "", 16);
    if (!Number.isInteger(componentId) || !Number.isInteger(moduleId)) {
        return null;
    }
    let cachedComponent: CachedComponent | undefined = lockedComponents.get(componentId);
    if (cachedComponent == null) {
        cachedComponent = cachedComponents.get(componentId);
        if (cachedComponent == null) {
            console.error("component not found failed to fetch ", url);
            return null;
        }
    }
    let cachedModule = cachedComponent.modules.get(moduleId);
    if (cachedModule == null) {
        cachedComponent = cachedComponents.get(componentId);
        cachedModule = cachedComponent?.modules?.get(moduleId);
        if (cachedModule == null) {
            console.error("module not found ", url);
            return null;
        }
    }
    if (filename == null) {
        return null;
    }
    const cachedFile = cachedModule.files.get(filename);
    if (cachedFile == null) {
        return null;
    }
    return cachedFile;
}

// `${componentId}/${moduleId}`がダウンロードされたらコールバックを実行する
type ComponentRequest = {
    moduleRequests: Map<number, ModuleRequest[]>
};

type ModuleRequest = {
    filename: string | null,
    resolve: (resolveValue: CachedFile | null) => void,
};

const componentRequests = new Map<number, ComponentRequest>();

export function fetchResourceAsync(url: string): Promise<CachedFile | null> {
    const res = fetchLockedResource(url);
    if (res) {
        return Promise.resolve(res);
    }
    const { componentId, moduleId, filename } = parseURLEx(url);
    if (componentId == null || moduleId == null) {
        return Promise.resolve(null);
    }
    if (pmtRetrieved) {
        if (getCachedModule(componentId, moduleId)) {
            return Promise.resolve(null);
        }
        if (!getPMTComponent(componentId)) {
            return Promise.resolve(null);
        }
        const dcomponents = downloadComponents.get(componentId);
        if (dcomponents != null && !dcomponents.modules.has(moduleId)) {
            return Promise.resolve(null);
        }
    }
    // PMTにcomponentが存在しかつDIIにmoduleが存在するまたはDIIが取得されていないときにコールバックを登録
    // TODO: ModuleUpdated用にDII取得後に存在しないことが判明したときの処理が必要
    console.warn("async fetch requested", url);
    return new Promise((resolve, _) => {
        const c = componentRequests.get(componentId);
        const entry = { filename, resolve };
        if (c == null) {
            componentRequests.set(componentId, { moduleRequests: new Map<number, ModuleRequest[]>([[moduleId, [entry]]]) });
        } else {
            const m = c.moduleRequests.get(moduleId);
            if (m == null) {
                c.moduleRequests.set(moduleId, [entry]);
            } else {
                m.push(entry);
            }
        }
    });
}

export function* getLockedModules() {
    for (const c of lockedComponents.values()) {
        for (const m of c.modules.values()) {
            // ????
            if (m.lockedBy === "system") {
                continue;
            }
            yield { module: `/${moduleAndComponentToString(c.componentId, m.moduleId)}`, isEx: m.lockedBy === "lockModuleOnMemoryEx" };
        }
    }
}
