import { MediaType, ResponseMessage } from "../src/ws_api";

// 運用的には固定
let entryPointComponentId = 0x40;
let entryPointModuleId = 0x0000;
// FIXME
function documentLoaded() {
    return location.href === "/";
}
export const activeDocument = "/40/0000/startup.bml";
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

function getCachedModule(componentId: number, moduleId: number): CachedModule | undefined {
    const cachedComponent = cachedComponents.get(componentId);
    if (cachedComponent == null) {
        return undefined;
    }
    return cachedComponent.modules.get(moduleId);
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
            window.browser.launchDocument(`/${entryPointComponentId.toString(16).padStart(2, "0")}/${entryPointModuleId.toString(16).padStart(4, "0")}/startup.bml`);
        }
    } else if (msg.type === "pmt") {
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

export function fetchLockedResource(url: string): CachedFile | null {
    const { component, module, filename } = parseURL(url);
    const componentId = Number.parseInt(component ?? "", 16);
    const moduleId = Number.parseInt(module ?? "", 16);
    if (!Number.isInteger(componentId) || !Number.isInteger(moduleId)) {
        return null;
    }
    const cachedComponent = lockedComponents.get(componentId);
    if (cachedComponent == null) {
        return null;
    }
    const cachedModule = cachedComponent.modules.get(moduleId);
    if (cachedModule == null) {
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
