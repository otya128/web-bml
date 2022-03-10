import { ComponentPMT, MediaType, ResponseMessage } from "../src/ws_api";

export class LongJump extends Error { }

// 運用的には固定
let entryPointComponentId = 0x40;
let entryPointModuleId = 0x0000;
// FIXME
function documentLoaded() {
    return location.href === "/";
}
export let activeDocument = "/40/0000/startup.bml";
export function setActiveDocument(componentId: number, moduleId: number, filename: string | null) {
    if (filename != null) { // ?
        activeDocument = `/${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}/${filename}`;
    } else {
        activeDocument = `/${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}`;
    }
}
const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/ws");
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
}
const lockedComponents = new Map<number, CachedComponent>();

// component id => PMT
let pmtComponents = new Map<number, ComponentPMT>();

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

export function lockCachedModule(componentId: number, moduleId: number): boolean {
    const cachedModule = getCachedModule(componentId, moduleId);
    if (cachedModule == null) {
        return false;
    }
    const lockedComponent = lockedComponents.get(componentId) ?? {
        componentId,
        modules: new Map()
    };
    lockedComponent.modules.set(moduleId, cachedModule);
    lockedComponents.set(componentId, lockedComponent);
    return true;
}
ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data) as ResponseMessage;
    if (msg.type === "moduleDownloaded") {
        const cachedComponent = cachedComponents.get(msg.componentId) ?? {
            componentId: msg.componentId,
            modules: new Map()
        };
        const cachedModule: CachedModule = {
            moduleId: msg.moduleId,
            files: new Map(msg.files.map(file => ([file.contentLocation, {
                contentLocation: file.contentLocation,
                contentType: file.contentType,
                data: Uint8Array.from(window.atob(file.dataBase64), c => c.charCodeAt(0))
            } as CachedFile]))),
        };
        cachedComponent.modules.set(msg.moduleId, cachedModule);
        cachedComponents.set(msg.componentId, cachedComponent);
        // OnModuleUpdated
        if (entryPointModuleId === msg.moduleId && entryPointComponentId === msg.componentId) {
            lockCachedModule(entryPointComponentId, entryPointModuleId);
            try {
                window.browser.launchDocument(`/${entryPointComponentId.toString(16).padStart(2, "0")}/${entryPointModuleId.toString(16).padStart(4, "0")}/startup.bml`);
            } catch (e) {
                if (e instanceof LongJump) {
                    console.log("long jump");
                } else {
                    throw e;
                }
            }
        }
    } else if (msg.type === "pmt") {
        pmtComponents = new Map(msg.components.map(x => [x.componentId, x]));
        if (!documentLoaded()) {
            for (const component of msg.components) {
                if (component.bxmlInfo.entryPointFlag) {
                    entryPointComponentId = component.componentId;
                    // window.browser.launchDocument(`/${entryPointComponentId.toFixed(16).padStart(2, "0")}/${entryPointModuleId.toFixed(16).padStart(4, "0")}/startup.bml`);
                }
            }
        }
    }
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
    if (!Number.isInteger(componentId) || !Number.isInteger(moduleId)) {
        return { componentId: null, moduleId: null, filename: null };
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
    const cachedComponent = lockedComponents.get(componentId);
    if (cachedComponent == null) {
        console.error("component not found failed to fetch ", url);
        return null;
    }
    const cachedModule = cachedComponent.modules.get(moduleId);
    if (cachedModule == null) {
        console.error("module not found ", url);
        return null;
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
