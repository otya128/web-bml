import { ComponentPMT, CurrentTime, MediaType, ProgramInfoMessage, ResponseMessage } from "../server/ws_api";
import { Indicator } from "./bml_browser";

type Module = {
    moduleId: number,
    files: Map<string | null, CachedFile>,
    version: number,
    dataEventId: number,
};

type Component = {
    componentId: number,
    modules: Map<number, Module>,
};

export type CachedComponent = {
    componentId: number,
    modules: Map<number, CachedModule>,
    dataEventId: number,
};

export type CachedModule = {
    moduleId: number,
    files: Map<string | null, CachedFile>,
    version: number,
    dataEventId: number,
};

export type CachedFileMetadata = {
    blobUrl: string,
    width?: number,
    height?: number,
};

export type CachedFile = {
    contentLocation: string | null,
    contentType: MediaType,
    data: Uint8Array,
    blobUrl: Map<any, CachedFileMetadata>,
};

export type LockedComponent = {
    componentId: number,
    modules: Map<number, LockedModule>,
};

export type LockedModule = {
    moduleId: number,
    files: Map<string | null, CachedFile>,
    lockedBy: "lockModuleOnMemory" | "lockModuleOnMemoryEx",
    version: number,
    dataEventId: number,
};

export type DownloadComponentInfo = {
    componentId: number,
    modules: Set<number>,
    dataEventId: number,
    returnToEntryFlag?: boolean,
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

interface ResourcesEventMap {
    "dataeventchanged": CustomEvent<{ prevComponent: DownloadComponentInfo, component: DownloadComponentInfo, returnToEntryFlag?: boolean }>;
    // DDB
    "moduleupdated": CustomEvent<{ componentId: number, moduleId: number, version: number, dataEventId: number }>;
    // DII
    "componentupdated": CustomEvent<{ component: DownloadComponentInfo }>;
    // PMT
    "pmtupdated": CustomEvent<{ prevComponents: Map<number, ComponentPMT>, components: Map<number, ComponentPMT> }>;
}

interface CustomEventTarget<M> {
    addEventListener<K extends keyof M>(type: K, callback: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void;
    dispatchEvent<K extends keyof M>(event: M[K]): boolean;
    removeEventListener<K extends keyof M>(type: K, callback: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean): void;
}

export type ResourcesEventTarget = CustomEventTarget<ResourcesEventMap>;

export class Resources {
    private readonly indicator?: Indicator;
    private readonly eventTarget: ResourcesEventTarget = new EventTarget();

    public constructor(indicator?: Indicator) {
        this.indicator = indicator;
    }

    private _activeDocument: null | string = null;
    private _currentComponentId: null | number = null;
    private _currentModuleId: null | number = null;

    public set activeDocument(doc: string | null) {
        const { componentId, moduleId } = this.parseURLEx(doc);
        this._activeDocument = doc;
        this._currentComponentId = componentId;
        this._currentModuleId = moduleId;
    }

    public get activeDocument(): string | null {
        return this._activeDocument;
    }

    public get currentComponentId(): number | null {
        return this._currentComponentId;
    }

    public get currentModuleId(): number | null {
        return this._currentModuleId;
    }

    public get currentDataEventId(): number | null {
        return this._currentComponentId && (this.cachedComponents.get(this._currentComponentId)?.dataEventId ?? null);
    }

    private cachedComponents = new Map<number, CachedComponent>();

    private downloadComponents = new Map<number, DownloadComponentInfo>();

    public getCachedFileBlobUrl(file: CachedFile, key?: any): string {
        let b = file.blobUrl.get(key)?.blobUrl;
        if (b != null) {
            return b;
        }
        b = URL.createObjectURL(new Blob([file.data], { type: `${file.contentType.type}/${file.contentType.originalSubtype}` }));
        file.blobUrl.set(key, { blobUrl: b });
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

    public lockCachedModule(componentId: number, moduleId: number, lockedBy: "lockModuleOnMemory" | "lockModuleOnMemoryEx"): boolean {
        const cachedModule = this.getCachedModule(componentId, moduleId);
        if (cachedModule == null) {
            return false;
        }
        const cachedComponent = this.cachedComponents.get(componentId)!;
        const lockedComponent = this.lockedComponents.get(componentId) ?? {
            componentId,
            modules: new Map<number, LockedModule>(),
            dataEventId: cachedComponent.dataEventId,
        };
        lockedComponent.modules.set(moduleId, { files: cachedModule.files, lockedBy, moduleId: cachedModule.moduleId, version: cachedModule.version, dataEventId: cachedModule.dataEventId });
        this.lockedComponents.set(componentId, lockedComponent);
        return true;
    }

    public isModuleLocked(componentId: number, moduleId: number): boolean {
        return this.lockedComponents.get(componentId)?.modules?.has(moduleId) ?? false;
    }

    public getModuleLockedBy(componentId: number, moduleId: number): "lockModuleOnMemory" | "lockModuleOnMemoryEx" | undefined {
        return this.lockedComponents.get(componentId)?.modules?.get(moduleId)?.lockedBy;
    }

    public unlockModules(lockedBy?: "lockModuleOnMemory" | "lockModuleOnMemoryEx") {
        if (lockedBy == null) {
            this.lockedComponents.clear();
        } else {
            for (const component of this.lockedComponents.values()) {
                for (const mod of [...component.modules.values()]) {
                    if (mod.lockedBy === lockedBy) {
                        component.modules.delete(mod.moduleId);
                    }
                }
            }
        }
    }

    public unlockModule(componentId: number, moduleId: number, isEx: boolean): boolean {
        const m = this.lockedComponents.get(componentId);
        if (m != null) {
            return m.modules.delete(moduleId);
        }
        return false;
    }

    public componentExistsInDownloadInfo(componentId: number): boolean {
        return this.downloadComponents.has(componentId);
    }

    public getDownloadComponentInfo(componentId: number): DownloadComponentInfo | undefined {
        return this.downloadComponents.get(componentId);
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

    private currentTimeNearestPCRBase?: number;
    private _currentTimeUnixMillis?: number;

    public get currentTimeUnixMillis(): number | null {
        if (this._currentTimeUnixMillis != null && this.nearestPCRBase != null && this.currentTimeNearestPCRBase != null) {
            const pcr = this.nearestPCRBase - this.currentTimeNearestPCRBase;
            if (pcr > 0) {
                return this._currentTimeUnixMillis + Math.floor(pcr / 90);
            }
        }
        return this._currentTimeUnixMillis ?? null;
    }

    nearestPCRBase?: number;

    public onMessage(msg: ResponseMessage) {
        if (msg.type === "moduleDownloaded") {
            const cachedComponent = this.cachedComponents.get(msg.componentId) ?? {
                componentId: msg.componentId,
                modules: new Map(),
                dataEventId: msg.dataEventId,
            };
            if (cachedComponent.dataEventId !== msg.dataEventId) {
                return;
            }
            const cachedModule: CachedModule = {
                moduleId: msg.moduleId,
                files: new Map(msg.files.map(file => ([file.contentLocation?.toLowerCase() ?? null, {
                    contentLocation: file.contentLocation,
                    contentType: file.contentType,
                    data: Uint8Array.from(window.atob(file.dataBase64), c => c.charCodeAt(0)),
                    blobUrl: new Map(),
                } as CachedFile]))),
                version: msg.version,
                dataEventId: msg.dataEventId,
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
            this.eventTarget.dispatchEvent<"moduleupdated">(new CustomEvent("moduleupdated", { detail: { componentId: msg.componentId, dataEventId: msg.dataEventId, moduleId: msg.moduleId, version: msg.version } }));
        } else if (msg.type === "moduleListUpdated") {
            const component: DownloadComponentInfo = {
                componentId: msg.componentId,
                modules: new Set(msg.modules),
                dataEventId: msg.dataEventId,
                returnToEntryFlag: msg.returnToEntryFlag,
            };
            const prevComponent = this.getDownloadComponentInfo(msg.componentId);
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
            this.eventTarget.dispatchEvent<"componentupdated">(new CustomEvent("componentupdated", { detail: { component } }));
            // DIIのdata_event_idが更新された
            if (prevComponent != null && prevComponent.dataEventId !== component.dataEventId) {
                this.cachedComponents.delete(msg.componentId);
                this.eventTarget.dispatchEvent<"dataeventchanged">(new CustomEvent("dataeventchanged", { detail: { prevComponent, component, returnToEntryFlag: msg.returnToEntryFlag } }));
            }
        } else if (msg.type === "pmt") {
            this.pmtRetrieved = true;
            const prevComponents = this.pmtComponents;
            this.pmtComponents = new Map(msg.components.map(x => [x.componentId, x]));
            this.eventTarget.dispatchEvent<"pmtupdated">(new CustomEvent("pmtupdated", { detail: { components: this.pmtComponents, prevComponents } }));
        } else if (msg.type === "programInfo") {
            this.currentProgramInfo = msg;
            const callbacks = this.programInfoCallbacks.slice();
            this.programInfoCallbacks.length = 0;
            for (const cb of callbacks) {
                cb(msg);
            }
            this.setReceivingStatus();
        } else if (msg.type === "currentTime") {
            this.currentTimeNearestPCRBase = this.nearestPCRBase;
            this._currentTimeUnixMillis = msg.timeUnixMillis;
        } else if (msg.type === "pcr") {
            this.nearestPCRBase = msg.pcrBase;
        } else if (msg.type === "error") {
            console.error(msg);
        }
    }

    // 自ストリームのarib-dc://-1.-1.-1/を除去
    private removeDCReferencePrefix(url: string): string {
        const result = /^arib-dc:\/\/(?<originalNetworkId>[0-9a-f]+|-1)\.(?<transportStreamId>[0-9a-f]+|-1)\.(?<serviceId>[0-9a-f]+|-1)($|\/)/i.exec(url);
        if (result?.groups == null) {
            return url;
        }
        const { originalNetworkId, transportStreamId, serviceId } = result.groups;
        if ((Number.parseInt(originalNetworkId, 16) === -1 || Number.parseInt(originalNetworkId, 16) === this.originalNetworkId) &&
            (Number.parseInt(transportStreamId, 16) === -1 || Number.parseInt(transportStreamId, 16) === this.transportStreamId) &&
            (Number.parseInt(serviceId, 16) === -1 || Number.parseInt(serviceId, 16) === this.serviceId)) {
            const suffix = url.substring(result[0].length);
            return "/" + suffix;
        }
        return url;
    }

    public parseURL(url: string | null | undefined): { component: string | null, module: string | null, filename: string | null } {
        if (url == null) {
            return { component: null, module: null, filename: null };
        }
        url = this.removeDCReferencePrefix(url);
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
        let cachedComponent: Component | undefined = this.lockedComponents.get(componentId);
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

    public addEventListener<K extends keyof ResourcesEventMap>(type: K, callback: (this: undefined, evt: ResourcesEventMap[K]) => void, options?: AddEventListenerOptions | boolean) {
        this.eventTarget.addEventListener(type, callback as EventListener, options);
    }

    public removeEventListener<K extends keyof ResourcesEventMap>(type: K, callback: (this: undefined, evt: ResourcesEventMap[K]) => void, options?: AddEventListenerOptions | boolean) {
        this.eventTarget.removeEventListener(type, callback as EventListener, options);
    }

    public clearCache(): void {
        // this.cachedComponents.clear();
    }

    // Cプロファイルだと0x50
    public get startupComponentId(): number {
        return 0x40;
    }

    public get startupModuleId(): number {
        return 0x0000;
    }
}
