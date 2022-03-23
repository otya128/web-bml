import { ComponentPMT, CurrentTime, MediaType, ProgramInfoMessage, ResponseMessage } from "../server/ws_api";
import { Indicator } from "./bml_browser";

export type CachedComponent = {
    componentId: number,
    modules: Map<number, CachedModule>,
};
export type CachedModule = {
    moduleId: number,
    files: Map<string | null, CachedFile>,
    version: number,
};

export type CachedFile = {
    contentLocation: string | null,
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
    files: Map<string | null, CachedFile>,
    lockedBy: "system" | "lockModuleOnMemory" | "lockModuleOnMemoryEx",
    version: number,
};

type DownloadComponentInfo = {
    componentId: number,
    modules: Set<number>,
};

// `${componentId}/${moduleId}`がダウンロードされたらコールバックを実行する
type ComponentRequest = {
    moduleRequests: Map<number, ModuleRequest[]>
};

type ModuleRequest = {
    filename: string | null,
    resolve: (resolveValue: CachedFile | null) => void,
};

function moduleAndComponentToString(componentId: number, moduleId: number) {
    return `${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}`;
}

export class Resources {
    private readonly indicator?: Indicator;

    public constructor(indicator?: Indicator) {
        this.indicator = indicator;
    }

    private _activeDocument: null | string = null;

    public set activeDocument(doc: string | null) {
        this._activeDocument = doc;
    }

    public get activeDocument(): string | null {
        return this._activeDocument;
    }

    private cachedComponents = new Map<number, CachedComponent>();

    private downloadComponents = new Map<number, DownloadComponentInfo>();

    public getCachedFileBlobUrl(file: CachedFile, key?: any): string {
        let b = file.blobUrl.get(key);
        if (b != null) {
            return b;
        }
        b = URL.createObjectURL(new Blob([file.data], { type: `${file.contentType.type}/${file.contentType.originalSubtype}` }));
        file.blobUrl.set(key, b);
        return b;
    }

    private lockedComponents = new Map<number, LockedComponent>();

    // component id => PMT
    private pmtComponents = new Map<number, ComponentPMT>();
    private pmtRetrieved = false;

    public getCachedModule(componentId: number, moduleId: number): CachedModule | undefined {
        const cachedComponent = this.cachedComponents.get(componentId);
        if (cachedComponent == null) {
            return undefined;
        }
        return cachedComponent.modules.get(moduleId);
    }

    public getPMTComponent(componentId: number): ComponentPMT | undefined {
        const pmtComponent = this.pmtComponents.get(componentId);
        return pmtComponent;
    }

    public lockCachedModule(componentId: number, moduleId: number, lockedBy: "system" | "lockModuleOnMemory" | "lockModuleOnMemoryEx"): boolean {
        const cachedModule = this.getCachedModule(componentId, moduleId);
        if (cachedModule == null) {
            return false;
        }
        const lockedComponent = this.lockedComponents.get(componentId) ?? {
            componentId,
            modules: new Map<number, LockedModule>(),
        };
        lockedComponent.modules.set(moduleId, { files: cachedModule.files, lockedBy, moduleId: cachedModule.moduleId, version: cachedModule.version });
        this.lockedComponents.set(componentId, lockedComponent);
        return true;
    }

    public isModuleLocked(componentId: number, moduleId: number): boolean {
        return this.lockedComponents.get(componentId)?.modules?.has(moduleId) ?? false;
    }

    public unlockAllModule() {
        this.lockedComponents.clear();
    }

    public unlockModule(componentId: number, moduleId: number, isEx: boolean): boolean {
        const m = this.lockedComponents.get(componentId);
        if (m != null) {
            const mod = m.modules.get(moduleId);
            if (mod == null) {
                return false;
            }
        }
        return false;
    }

    public componentExistsInDownloadInfo(componentId: number): boolean {
        return this.downloadComponents.has(componentId);
    }

    public moduleExistsInDownloadInfo(componentId: number, moduleId: number): boolean {
        const dcomp = this.downloadComponents.get(componentId);
        if (!dcomp) {
            return false;
        }
        return dcomp.modules.has(moduleId);
    }

    private currentProgramInfo: ProgramInfoMessage | null = null;

    // STD-B24 第二分冊(1/2) 第二編 9.2.1.2
    public get dataCarouselURI() {
        let url = `arib-dc://${this.originalNetworkId?.toString(16)?.padStart(4, "0") ?? -1}.${this.transportStreamId?.toString(16)?.padStart(4, "0") ?? -1}.${this.serviceId?.toString(16)?.padStart(4, "0") ?? -1}`;
        if (this.contentId != null) {
            url += ";" + this.contentId.toString(16)?.padStart(8, "0");
        }
        if (this.eventId != null) {
            url += "." + this.eventId.toString(16)?.padStart(4, "0");
        }
        return url;
    }

    // STD-B24 第二分冊(1/2) 第二編 9.2.5
    public get serviceURI() {
        return `arib://${this.originalNetworkId?.toString(16)?.padStart(4, "0") ?? -1}.${this.transportStreamId?.toString(16)?.padStart(4, "0") ?? -1}.${this.serviceId?.toString(16)?.padStart(4, "0") ?? -1}`;
    }

    // STD-B24 第二分冊(1/2) 第二編 9.2.6
    public get eventURI() {
        return `arib://${this.originalNetworkId?.toString(16)?.padStart(4, "0") ?? -1}.${this.transportStreamId?.toString(16)?.padStart(4, "0") ?? -1}.${this.serviceId?.toString(16)?.padStart(4, "0") ?? -1}.${this.eventId?.toString(16)?.padStart(4, "0") ?? -1}`;
    }

    public get eventName(): string | null {
        return this.currentProgramInfo?.eventName ?? null;
    }

    public get eventId(): number | null {
        return this.currentProgramInfo?.eventId ?? null;
    }

    // not implemented
    public get contentId(): number | null {
        return null;
    }

    public get startTimeUnixMillis(): number | null {
        return this.currentProgramInfo?.startTimeUnixMillis ?? null;
    }

    public get serviceId(): number | null {
        return this.currentProgramInfo?.serviceId ?? null;
    }

    public get originalNetworkId(): number | null {
        return this.currentProgramInfo?.originalNetworkId ?? null;
    }

    public get transportStreamId(): number | null {
        return this.currentProgramInfo?.transportStreamId ?? null;
    }

    private currentTime: CurrentTime | null = null;

    public get currentTimeUnixMillis(): number | null {
        return this.currentTime?.timeUnixMillis ?? null;
    }

    public onMessage(msg: ResponseMessage) {
        if (msg.type === "moduleDownloaded") {
            const cachedComponent = this.cachedComponents.get(msg.componentId) ?? {
                componentId: msg.componentId,
                modules: new Map()
            };
            const cachedModule: CachedModule = {
                moduleId: msg.moduleId,
                files: new Map(msg.files.map(file => ([file.contentLocation?.toLowerCase() ?? null, {
                    contentLocation: file.contentLocation,
                    contentType: file.contentType,
                    data: Uint8Array.from(window.atob(file.dataBase64), c => c.charCodeAt(0)),
                    blobUrl: new Map(),
                } as CachedFile]))),
                version: msg.version,
            };
            cachedComponent.modules.set(msg.moduleId, cachedModule);
            this.cachedComponents.set(msg.componentId, cachedComponent);
            // OnModuleUpdated
            const str = moduleAndComponentToString(msg.componentId, msg.moduleId);
            const creq = this.componentRequests.get(msg.componentId);
            const callbacks = creq?.moduleRequests?.get(msg.moduleId);
            if (creq != null && callbacks != null) {
                creq.moduleRequests.delete(msg.moduleId);
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
                this.setReceivingStatus();
            }
        } else if (msg.type === "moduleListUpdated") {
            const component = {
                componentId: msg.componentId,
                modules: new Set(msg.modules)
            };
            this.downloadComponents.set(msg.componentId, component);
            const creqs = this.componentRequests.get(msg.componentId);
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
                this.setReceivingStatus();
            }
        } else if (msg.type === "pmt") {
            this.pmtRetrieved = true;
            this.pmtComponents = new Map(msg.components.map(x => [x.componentId, x]));
        } else if (msg.type === "programInfo") {
            this.currentProgramInfo = msg;
            const callbacks = this.programInfoCallbacks.slice();
            this.programInfoCallbacks.length = 0;
            for (const cb of callbacks) {
                cb(msg);
            }
            this.setReceivingStatus();
        } else if (msg.type === "currentTime") {
            this.currentTime = msg;
        } else if (msg.type === "error") {
            console.error(msg);
        }
    }

    public parseURL(url: string | null | undefined): { component: string | null, module: string | null, filename: string | null } {
        if (url == null) {
            return { component: null, module: null, filename: null };
        }
        if (url.startsWith("~/")) {
            url = ".." + url.substring(1);
        }
        url = new URL(url, "http://localhost" + this.activeDocument).pathname.toLowerCase();
        const components = url.split("/");
        // [0] ""
        // [1] component
        // [2] module
        // [3] filename
        if (components.length > 4) {
            return { component: null, module: null, filename: null };
        }
        return { component: components[1] ?? null, module: components[2] ?? null, filename: components[3] == null ? null : decodeURI(components[3]) };
    }

    public parseURLEx(url: string | null | undefined): { componentId: number | null, moduleId: number | null, filename: string | null } {
        const { component, module, filename } = this.parseURL(url);
        const componentId = Number.parseInt(component ?? "", 16);
        const moduleId = Number.parseInt(module ?? "", 16);
        if (!Number.isInteger(componentId)) {
            return { componentId: null, moduleId: null, filename: null };
        }
        if (!Number.isInteger(moduleId)) {
            return { componentId, moduleId: null, filename: null };
        }
        return { componentId, moduleId, filename: filename == null ? null : filename };
    }

    public fetchLockedResource(url: string): CachedFile | null {
        const { component, module, filename } = this.parseURL(url);
        const componentId = Number.parseInt(component ?? "", 16);
        const moduleId = Number.parseInt(module ?? "", 16);
        if (!Number.isInteger(componentId) || !Number.isInteger(moduleId)) {
            return null;
        }
        let cachedComponent: CachedComponent | undefined = this.lockedComponents.get(componentId);
        if (cachedComponent == null) {
            cachedComponent = this.cachedComponents.get(componentId);
            if (cachedComponent == null) {
                console.error("component not found failed to fetch ", url);
                return null;
            }
        }
        let cachedModule = cachedComponent.modules.get(moduleId);
        if (cachedModule == null) {
            cachedComponent = this.cachedComponents.get(componentId);
            cachedModule = cachedComponent?.modules?.get(moduleId);
            if (cachedModule == null) {
                console.error("module not found ", url);
                return null;
            }
        }
        const cachedFile = cachedModule.files.get(filename);
        if (cachedFile == null) {
            return null;
        }
        return cachedFile;
    }

    private componentRequests = new Map<number, ComponentRequest>();

    public fetchResourceAsync(url: string): Promise<CachedFile | null> {
        const res = this.fetchLockedResource(url);
        if (res) {
            return Promise.resolve(res);
        }
        const { componentId, moduleId, filename } = this.parseURLEx(url);
        if (componentId == null || moduleId == null) {
            return Promise.resolve(null);
        }
        if (this.pmtRetrieved) {
            if (this.getCachedModule(componentId, moduleId)) {
                return Promise.resolve(null);
            }
            if (!this.getPMTComponent(componentId)) {
                return Promise.resolve(null);
            }
            const dcomponents = this.downloadComponents.get(componentId);
            if (dcomponents != null && !dcomponents.modules.has(moduleId)) {
                return Promise.resolve(null);
            }
        }
        // PMTにcomponentが存在しかつDIIにmoduleが存在するまたはDIIが取得されていないときにコールバックを登録
        // TODO: ModuleUpdated用にDII取得後に存在しないことが判明したときの処理が必要
        console.warn("async fetch requested", url);
        return new Promise((resolve, _) => {
            const c = this.componentRequests.get(componentId);
            const entry = { filename, resolve };
            if (c == null) {
                this.componentRequests.set(componentId, { moduleRequests: new Map<number, ModuleRequest[]>([[moduleId, [entry]]]) });
            } else {
                const m = c.moduleRequests.get(moduleId);
                if (m == null) {
                    c.moduleRequests.set(moduleId, [entry]);
                } else {
                    m.push(entry);
                }
            }
            this.setReceivingStatus();
        });
    }

    public *getLockedModules() {
        for (const c of this.lockedComponents.values()) {
            for (const m of c.modules.values()) {
                // ????
                if (m.lockedBy === "system") {
                    continue;
                }
                yield { module: `/${moduleAndComponentToString(c.componentId, m.moduleId)}`, isEx: m.lockedBy === "lockModuleOnMemoryEx" };
            }
        }
    }

    private programInfoCallbacks: ((msg: ProgramInfoMessage) => void)[] = []

    public getProgramInfoAsync(): Promise<ProgramInfoMessage> {
        if (this.currentProgramInfo != null) {
            return Promise.resolve(this.currentProgramInfo);
        }
        return new Promise<ProgramInfoMessage>((resolve, _) => {
            this.programInfoCallbacks.push(resolve);
            this.setReceivingStatus();
        });
    }

    public parseServiceReference(serviceRef: string): { originalNetworkId: number | null, transportStreamId: number | null, serviceId: number | null } {
        const groups = /^arib:\/\/(?<originalNetworkId>[0-9a-f]+|-1)\.(?<transportStreamId>[0-9a-f]+|-1)\.(?<serviceId>[0-9a-f]+|-1)\/?$/i.exec(serviceRef)?.groups;
        if (groups == null) {
            return { originalNetworkId: null, transportStreamId: null, serviceId: null };
        }
        let originalNetworkId: number | null = Number.parseInt(groups.originalNetworkId, 16);
        let transportStreamId: number | null = Number.parseInt(groups.transportStreamId, 16);
        let serviceId: number | null = Number.parseInt(groups.serviceId, 16);
        if (originalNetworkId == -1) {
            originalNetworkId = this.originalNetworkId;
        }
        if (transportStreamId == -1) {
            transportStreamId = this.transportStreamId;
        }
        if (serviceId == -1) {
            serviceId = this.serviceId;
        }
        return { originalNetworkId, transportStreamId, serviceId };
    }

    private setReceivingStatus() {
        if (this.programInfoCallbacks.length != 0 || [...this.componentRequests.values()].some(x => x.moduleRequests.size != 0)) {
            this.indicator?.setReceivingStatus(true);
        } else {
            this.indicator?.setReceivingStatus(false);
        }
    }
}
