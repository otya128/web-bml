export { };
import { transpileCSS, convertCSSPropertyToGet, convertCSSPropertyToSet } from "../src/transpile_css";
import css from "css";
import { BinaryTable, BinaryTableConstructor } from "./binary_table";
import { readPersistentArray, writePersistentArray } from "./nvram";
import { overrideString } from "./string"
import { overrideNumber } from "./number"
import { overrideDate } from "./date";
import { decodeEUCJP } from "../src/euc_jp";
import { bmlToXHTML } from "../src/bml_to_xhtml";
import { transpile } from "../src/transpile_ecm";
import * as resource from "./resource";
import { activeDocument, CachedFile, fetchLockedResource, lockCachedModule, parseURL, parseURLEx, LongJump } from "./resource";
import { aribPNGToPNG } from "../src/arib_png";
import { readCLUT } from "../src/clut";
import { defaultCLUT } from "../src/default_clut";
import { Buffer } from "buffer";
import * as drcs from "../src/drcs";
// @ts-ignore
import defaultCss from "./default.css";
import { RemoteControllerMessage } from "./remote_controller";
import { NativeInterpreter } from '../web/interpreter/native_interpreter';
import { JSInterpreter } from "./interpreter/js_interpreter";
import { BML } from "./interface/DOM";

interface BMLEvent {
    type: string;
    target: HTMLElement | null;
}


type BMLObjectElement = HTMLObjectElement;

interface BMLIntrinsicEvent extends BMLEvent {
    keyCode: number;
}

interface BMLBeventEvent extends BMLEvent {
    status: number;
    privateData: string;
    esRef: string;
    messageId: string;
    messageVersion: string;
    messageGroupId: string;
    moduleRef: string;
    languageTag: number;
    registerId: number;
    serviceId: string;
    eventId: string;
    object: BMLObjectElement | null;
    segmentId: string | null;
}

type BMLElement = HTMLElement;

declare global {
    interface Window {
        browser: any;
        dummy: any;
        BinaryTable: BinaryTableConstructor;
        newBinaryTable: any;
        __newBT: any;
    }
    interface Document {
        currentEvent: BMLEvent | null;
        currentFocus: BMLElement | null;
    }
}


if (!window.browser) {
    const bmlDocument = BML.document;
    function setCurrentEvent(a: BMLEvent) {
        const { target: _, ...b } = a;
        const c = { target: BML.htmlElementToBMLHTMLElement(a.target), ...b }
        bmlDocument._currentEvent = new BML.BMLEvent(c);
    }
    function setCurrentIntrinsicEvent(a: BMLIntrinsicEvent) {
        const { target: _, ...b } = a;
        const c = { target: BML.htmlElementToBMLHTMLElement(a.target), ...b }
        bmlDocument._currentEvent = new BML.BMLIntrinsicEvent(c);
    }
    function setCurrentBeventEvent(a: BMLBeventEvent) {
        const { target: _1, object: _2, ...b } = a;
        const c = { target: BML.htmlElementToBMLHTMLElement(a.target), object: BML.htmlElementToBMLHTMLElement(a.object) as (BML.BMLObjectElement | null), ...b }
        bmlDocument._currentEvent = new BML.BMLBeventEvent(c);
    }
    function resetCurrentEvent() {
        bmlDocument._currentEvent = null;
    }
    async function executeEventHandler(handler: string): Promise<void> {
        if (/^\s*$/.exec(handler)) {
            return;
        }
        const groups = /^\s*(?<funcName>[a-zA-Z_][0-9a-zA-Z_]*)\s*\(\s*\)\s*;?\s*$/.exec(handler)?.groups;
        if (!groups) {
            throw new Error("invalid event handler attribute " + handler);
        }
        await interpreter.runEventHandler(groups.funcName);
    }
    const videoElement = document.querySelector("video") as HTMLVideoElement;
    const videoContainer = document.getElementById("arib-video-container") as HTMLDivElement;
    const timeoutHandles = new Set<number>();
    const intervalHandles = new Set<number>();
    function bmlSetTimeout(handler: TimerHandler, timeout: number, ...args: any[]): number {
        const handle = window.setTimeout(handler, timeout, ...args);
        timeoutHandles.add(handle);
        return handle;
    }
    function bmlSetInterval(handler: TimerHandler, timeout: number, ...args: any[]): number {
        const handle = window.setInterval(handler, timeout, ...args);
        intervalHandles.add(handle);
        return handle;
    }
    function bmlClearInterval(handle: number): void {
        window.clearInterval(handle);
        intervalHandles.delete(handle);
    }


    async function loadDocument(file: CachedFile, documentName: string): Promise<void> {
        // スクリプトが呼ばれているときにさらにスクリプトが呼ばれることはないがonunloadだけ例外
        interpreter.resetStack();
        const onunload = document.body.getAttribute("onunload");
        if (onunload != null) {
            await executeEventHandler(onunload);
        }
        asyncEventQueue.splice(0, asyncEventQueue.length);
        syncEventQueue.splice(0, syncEventQueue.length);
        // タイマー全部消す
        for (const i of intervalHandles.values()) {
            window.clearInterval(i);
        }
        intervalHandles.clear();
        for (const i of timeoutHandles.values()) {
            window.clearTimeout(i);
        }
        timeoutHandles.clear();
        resource.setActiveDocument(documentName);
        document.currentFocus = null;
        for (const k of Object.keys(window)) {
            if (Number.parseInt(k).toString() === k) {
                continue;
            }
            if (!windowKeys.has(k)) {
                (window as any)[k] = undefined;
                // delete (window as any)[k];
            }
        }
        interpreter.reset();
        resource.unlockAllModule();
        currentDateMode = 0;
        const documentElement = document.createElement("html");
        try {
            documentElement.innerHTML = bmlToXHTML(file.data);
        } catch (e) {
            console.error(e);
        }
        const p = Array.from(document.documentElement.childNodes).filter(x => x.nodeName === "body" || x.nodeName === "head");
        const videoElementNew = documentElement.querySelector("[arib-type=\"video/X-arib-mpeg2\"]");
        document.documentElement.append(...Array.from(documentElement.children));
        if (videoElementNew != null) {
            videoElementNew.appendChild(videoContainer);
        }
        for (const n of p) {
            n.remove();
        }

        if (defaultCss != null) {
            const defaultStylesheet = document.createElement("style");
            defaultStylesheet.textContent = defaultCss;
            document.head.prepend(defaultStylesheet);
        }
        setRemoteControllerMessage(activeDocument + "\n" + (resource.currentProgramInfo?.eventName ?? ""));
        init();
        (document.body as any).invisible = (document.body as any).invisible;
        // フォーカスはonloadの前に当たるがonloadが実行されるまではイベントは実行されない
        // STD-B24 第二分冊(2/2) 第二編 付属1 5.1.3参照
        lockSyncEventQueue();
        try {
            findNavIndex(0)?.focus();
            for (const x of Array.from(document.querySelectorAll("script"))) {
                const s = document.createElement("script");
                x.remove();
                const src = x.getAttribute("src");
                if (src) {
                    const res = fetchLockedResource(src);
                    if (res !== null) {
                        // 非同期になってしまうのでこれは無し
                        //const url = URL.createObjectURL(new Blob([res.data], {
                        //    type: "text/javascript;encoding=euc-jp"
                        //}));
                        s.setAttribute("arib-src", src);
                        s.textContent = "// " + src + "\n" + decodeEUCJP(res.data);
                    }
                } else {
                    s.textContent = "// " + activeDocument + "\n" + x.textContent;
                }
                await interpreter.addScript(s.textContent ?? "", src ?? undefined);
                // document.body.appendChild(s);
            }
            const onload = document.body.getAttribute("onload");
            if (onload != null) {
                await executeEventHandler(onload);
            }
        }
        finally {
            unlockSyncEventQueue();
        }
        await processEventQueue();
        // 雑だけど動きはする
        bmlSetInterval(() => {
            const moduleLocked = document.querySelectorAll("beitem[type=\"ModuleUpdated\"]");
            moduleLocked.forEach(beitem => {
                if (beitem.getAttribute("subscribe") !== "subscribe") {
                    return;
                }
                const moduleRef = beitem.getAttribute("module_ref");
                if (moduleRef == null) {
                    return;
                }
                const { moduleId, componentId } = parseURLEx(moduleRef);
                if (moduleId == null || componentId == null) {
                    return;
                }
                if (resource.moduleExistsInDownloadInfo(componentId, moduleId)) {
                    if ((beitem as any).__prevStatus !== 2) {
                        eventQueueOnModuleUpdated(moduleRef, 2);
                        (beitem as any).__prevStatus = 2;
                    }
                } else {
                    if ((beitem as any).__prevStatus !== 1) {
                        eventQueueOnModuleUpdated(moduleRef, 1);
                        (beitem as any).__prevStatus = 1;
                    }
                }
            });
        }, 1000);
        interpreter.destroyStack();
    }
    window.dummy = undefined;
    window.browser = {};
    let currentDateMode = 0;
    window.__newBT = function __newBT(klass: any, ...args: any[]) {
        if (klass === BinaryTable) {
            try {
                return new klass(...args);
            } catch {
                return null;
            }
        } else if (klass === Date) {
            if (args.length === 0 && resource.currentTime?.timeUnixMillis != null) {
                // currentDateMode=1ならtimeUnixMillisを取得した時間からオフセット追加とかが理想かもしれない
                return new Date(resource.currentTime?.timeUnixMillis);
            }
            return new klass(...args);
        } else {
            return new klass(...args);
        }
    }

    window.BinaryTable = BinaryTable;
    window.newBinaryTable = function newBinaryTable(table_ref: string, structure: string) {
        try {
            return new BinaryTable(table_ref, structure);
        } catch {
            return null;
        }
    }
    window.browser.setCurrentDateMode = function setCurrentDateMode(mode: number): number {
        console.log("setCurrentDateMode", mode);
        if (mode == 0) {
            currentDateMode = 0;
        } else if (mode == 1) {
            currentDateMode = 1;
        } else {
            return NaN;
        }
        return 1; // 成功
    };
    window.browser.getProgramRelativeTime = function getProgramRelativeTime(): number {
        return 10; // 秒
    }
    window.browser.subDate = function subDate(target: Date, base: Date, unit: number) {
        const sub = target.getTime() - base.getTime();
        if (unit == 1) {
            return (sub / 1000) | 0;
        } else if (unit == 2) {
            return (sub / (1000 * 60)) | 0;
        } else if (unit == 3) {
            return (sub / (1000 * 60 * 60)) | 0;
        } else if (unit == 4) {
            return (sub / (1000 * 60 * 60 * 24)) | 0;
        } else if (unit == 5) {
            return (sub / (1000 * 60 * 60 * 24 * 7)) | 0;
        }
        return sub | 0;
    }
    window.browser.addDate = function addDate(base: Date, time: number, unit: number): Date | number {
        if (Number.isNaN(time)) {
            return base;
        }
        if (unit == 0) {
            return new Date(base.getTime() + time);
        } else if (unit == 1) {
            return new Date(base.getTime() + (time * 1000));
        } else if (unit == 2) {
            return new Date(base.getTime() + (time * 1000 * 60));
        } else if (unit == 3) {
            return new Date(base.getTime() + (time * 1000 * 60 * 60));
        } else if (unit == 4) {
            return new Date(base.getTime() + (time * 1000 * 60 * 60 * 24));
        } else if (unit == 5) {
            return new Date(base.getTime() + (time * 1000 * 60 * 60 * 24 * 7));
        }
        return NaN;
    }
    window.browser.unlockModuleOnMemory = function unlockModuleOnMemory(module: string): number {
        console.log("unlockModuleOnMemory", module);
        const { componentId, moduleId } = parseURLEx(module);
        if (componentId == null || moduleId == null) {
            return NaN;
        }
        return resource.unlockModule(componentId, moduleId, false) ? 1 : NaN;
    };
    window.browser.unlockModuleOnMemoryEx = function unlockModuleOnMemoryEx(module: string): number {
        console.log("unlockModuleOnMemoryEx", module);
        const { componentId, moduleId } = parseURLEx(module);
        if (componentId == null || moduleId == null) {
            return NaN;
        }
        return resource.unlockModule(componentId, moduleId, true) ? 1 : NaN;
    };
    window.browser.unlockAllModulesOnMemory = function unlockAllModulesOnMemory(): number {
        console.log("unlockAllModulesOnMemory");
        resource.unlockAllModule();
        return 1; // NaN => fail
    };
    window.browser.lockModuleOnMemory = function lockModuleOnMemory(module: string): number {
        console.log("lockModuleOnMemory", module);
        const { componentId, moduleId } = parseURLEx(module);
        if (componentId == null || moduleId == null) {
            return NaN;
        }
        // exと違ってロック済みならイベント発生しないはず
        if (resource.isModuleLocked(componentId, moduleId)) {
            return 1;
        }
        if (!resource.getPMTComponent(componentId)) {
            console.error("lockModuleOnMemory: component does not exist in PMT", module);
            return -1;
        }
        if (!resource.moduleExistsInDownloadInfo(componentId, moduleId)) {
            console.error("lockModuleOnMemory: component does not exist in DII", module);
            return -1;
        }
        const cachedModule = lockCachedModule(componentId, moduleId, "lockModuleOnMemory");
        if (!cachedModule) {
            console.error("lockModuleOnMemory: module not cached", module);
            resource.requestLockModule(module, componentId, moduleId, false);
            return 1;
        }
        // イベントハンドラではモジュール名の大文字小文字がそのままである必要がある?
        bmlSetTimeout(() => {
            eventQueueOnModuleLocked(module, false, 0);
        }, 0);
        return 1;
    }
    window.browser.lockModuleOnMemoryEx = function lockModuleOnMemoryEx(module: string): number {
        console.log("lockModuleOnMemoryEx", module);
        const { componentId, moduleId } = parseURLEx(module);
        if (componentId == null || moduleId == null) {
            return NaN;
        }
        if (!resource.getPMTComponent(componentId)) {
            console.error("lockModuleOnMemoryEx: component does not exist in PMT", module);
            return -3;
        }
        if (!resource.moduleExistsInDownloadInfo(componentId, moduleId)) {
            console.error("lockModuleOnMemoryEx: component does not exist in DII", module);
            bmlSetTimeout(() => {
                eventQueueOnModuleLocked(module, true, -2);
            }, 0);
            return 0;
        }
        const cachedModule = lockCachedModule(componentId, moduleId, "lockModuleOnMemoryEx");
        if (!cachedModule) {
            console.error("lockModuleOnMemoryEx: module not cached", module);
            resource.requestLockModule(module, componentId, moduleId, true);
            // OnModuleLockedのstatusで返ってくる
            return 0;
        }
        // イベントハンドラではモジュール名の大文字小文字がそのままである必要がある?
        bmlSetTimeout(() => {
            eventQueueOnModuleLocked(module, true, 0);
        }, 0);
        return 1;
    }
    resource.registerOnModuleLockedHandler((module: string, isEx: boolean, status: number) => {
        eventQueueOnModuleLocked(module, isEx, status);
    });
    function eventQueueOnModuleLocked(module: string, isEx: boolean, status: number) {
        console.log("ModuleLocked", module);
        const moduleLocked = document.querySelectorAll("beitem[type=\"ModuleLocked\"]");
        for (const beitem of Array.from(moduleLocked)) {
            if (beitem.getAttribute("subscribe") !== "subscribe") {
                continue;
            }
            const moduleRef = beitem.getAttribute("module_ref");
            if (moduleRef?.toLowerCase() === module.toLowerCase()) {
                const onoccur = beitem.getAttribute("onoccur");
                if (onoccur) {
                    queueAsyncEvent(async () => {
                        setCurrentBeventEvent({
                            type: "ModuleLocked",
                            target: beitem as HTMLElement,
                            status,
                            privateData: "",
                            esRef: "",
                            messageId: "0",
                            messageVersion: "0",
                            messageGroupId: "0",
                            moduleRef: module,
                            languageTag: 0,//?
                            registerId: 0,
                            serviceId: "0",
                            eventId: "0",
                            peripheralRef: "",
                            object: null,
                            segmentId: null,
                        } as BMLBeventEvent);
                        await executeEventHandler(onoccur);
                        resetCurrentEvent();
                    });
                    processEventQueue();
                }
            }
        }
    }

    function eventQueueOnModuleUpdated(module: string, status: number) {
        console.log("ModuleUpdated", module, status);
        const moduleLocked = document.querySelectorAll("beitem[type=\"ModuleUpdated\"]");
        for (const beitem of Array.from(moduleLocked)) {
            if (beitem.getAttribute("subscribe") !== "subscribe") {
                continue;
            }
            const moduleRef = beitem.getAttribute("module_ref");
            if (moduleRef?.toLowerCase() === module.toLowerCase()) {
                const onoccur = beitem.getAttribute("onoccur");
                if (onoccur) {
                    queueAsyncEvent(async () => {
                        setCurrentBeventEvent({
                            type: "ModuleUpdated",
                            target: beitem as HTMLElement,
                            status,
                            privateData: "",
                            esRef: "",
                            messageId: "0",
                            messageVersion: "0",
                            messageGroupId: "0",
                            moduleRef: module,
                            languageTag: 0,//?
                            registerId: 0,
                            serviceId: "0",
                            eventId: "0",
                            peripheralRef: "",
                            object: null,
                            segmentId: null,
                        } as BMLBeventEvent);
                        await executeEventHandler(onoccur);
                        resetCurrentEvent();
                    });
                    processEventQueue();
                }
            }
        }
    }

    function fireDataButtonPressed() {
        console.log("DataButtonPressed");
        const moduleLocked = document.querySelectorAll("beitem[type=\"DataButtonPressed\"]");
        for (const beitem of Array.from(moduleLocked)) {
            if (beitem.getAttribute("subscribe") !== "subscribe") {
                continue;
            }
            const onoccur = beitem.getAttribute("onoccur");
            if (onoccur) {
                queueAsyncEvent(async () => {
                    setCurrentBeventEvent({
                        type: "DataButtonPressed",
                        target: beitem as HTMLElement,
                        status: 0,
                        privateData: "",
                        esRef: "",
                        messageId: "0",
                        messageVersion: "0",
                        messageGroupId: "0",
                        moduleRef: "",
                        languageTag: 0,//?
                        registerId: 0,
                        serviceId: "0",
                        eventId: "0",
                        peripheralRef: "",
                        object: null,
                        segmentId: null,
                    } as BMLBeventEvent);
                    await executeEventHandler(onoccur);
                    resetCurrentEvent();
                });
                processEventQueue();
            }
        }
    }

    window.browser.lockScreen = function lockScreen() {
        console.log("lockScreen");
    };
    window.browser.unlockScreen = function unlockScreen() {
        console.log("unlockScreen");
    };
    window.browser.getBrowserSupport = function getBrowserSupport(sProvider: string, functionname: string, additionalinfo?: string): number {
        console.log("getBrowserSupport", sProvider, functionname, additionalinfo);
        if (sProvider === "ARIB") {
            if (functionname === "BMLversion") {
                if (additionalinfo == null) {
                    return 1;
                } else {
                    const [major, minor] = additionalinfo.split(".").map(x => Number.parseInt(x));
                    if (major == null || minor == null) {
                        return 0;
                    }
                    if ((major < 3 && major >= 0) || (major === 3 && minor === 0)) {
                        return 1;
                    }
                    return 0;
                }
            } else if (functionname === "APIGroup") {
                if (additionalinfo === "Ctrl.Basic") {
                    return 1;
                } else if (additionalinfo === "Ctrl.Screen") {
                    return 1;
                } else if (additionalinfo === "Ctrl.Cache2") {
                    return 1;
                } else if (additionalinfo === "Ctrl.Version") {
                    return 1;
                } else if (additionalinfo === "Ctrl.Basic2") {
                    // detectComponent
                    return 1;
                }
            }
        } else if (sProvider === "nvram") {
            if (functionname === "NumberOfBSBroadcasters") {
                if (additionalinfo === "23") {
                    return 1;
                }
            } else if (functionname === "BSspecifiedExtension") {
                if (additionalinfo === "48") {
                    return 1;
                }
            } else if (functionname === "NumberOfCSBroadcasters") {
                if (additionalinfo === "23") {
                    return 1;
                }
            }
        }
        return 0;
    };
    window.browser.getBrowserStatus = function getBrowserStatus(sProvider: string, functionname: string, additionalinfo: string): number {
        console.log("getBrowserStatus", sProvider, functionname, additionalinfo);
        return 0;
    };
    window.browser.launchDocument = function launchDocument(documentName: string, transitionStyle: string): number {
        console.log("%claunchDocument", "font-size: 4em", documentName, transitionStyle);
        const { component, module, filename } = parseURL(documentName);
        const componentId = Number.parseInt(component ?? "", 16);
        const moduleId = Number.parseInt(module ?? "", 16);
        if (!Number.isInteger(componentId) || !Number.isInteger(moduleId)) {
            return NaN;
        }
        resource.launchRequest(null);
        if (!lockCachedModule(componentId, moduleId, "system")) {
            console.error("FIXME");
            resource.launchRequest(documentName);
            setRemoteControllerMessage(documentName + "のデータ取得中...");
            interpreter.destroyStack();
        }
        const res = fetchLockedResource(documentName);
        if (res == null) {
            console.error("NOT FOUND");
            return NaN;
        }
        const ad = activeDocument;
        let normalizedDocument;
        if (filename != null) {
            normalizedDocument = `/${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}/${filename}`;
        } else {
            normalizedDocument = `/${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}`;
        }
        loadDocument(res, normalizedDocument);
        console.log("return ", ad, documentName);
        interpreter.destroyStack();
        return 0;
    };
    window.browser.reloadActiveDocument = function reloadActiveDocument(): number {
        console.log("reloadActiveDocument");
        return window.browser.launchDocument(window.browser.getActiveDocument());
    }
    window.browser.readPersistentArray = function (filename: string, structure: string): any[] | null {
        console.log("readPersistentArray", filename, structure);
        return readPersistentArray(filename, structure);
    };
    window.browser.writePersistentArray = function (filename: string, structure: string, data: any[], period?: Date): number {
        console.log("writePersistentArray", filename, structure, data, period);
        return writePersistentArray(filename, structure, data, period);
    };
    window.browser.random = function random(num: number): number {
        return Math.floor(Math.random() * num) + 1;
    };
    window.browser.getActiveDocument = function getActiveDocument(): string | null {
        return activeDocument;
    }
    window.browser.getResidentAppVersion = function getResidentAppVersion(appName: string): any[] | null {
        console.log("getResidentAppVersion", appName);
        return null;
    }
    type LockedModuleInfo = [moduleName: string, func: number, status: number];
    window.browser.getLockedModuleInfo = function getLockedModuleInfo(): LockedModuleInfo[] | null {
        console.log("getLockedModuleInfo");
        const l: LockedModuleInfo[] = [];
        for (const { module, isEx } of resource.getLockedModules()) {
            l.push([module, isEx ? 2 : 1, 1]);
        }
        return l;
    }
    window.browser.detectComponent = function detectComponent(component_ref: string) {
        const { componentId } = parseURLEx(component_ref);
        if (componentId == null) {
            return NaN;
        }
        if (resource.getPMTComponent(componentId)) {
            return 1;
        } else {
            return 0;
        }
    }
    window.browser.getProgramID = function getProgramID(type: number): string | null {
        function toHex(n: number | null | undefined, d: number): string | null {
            if (n == null) {
                return null;
            }
            return "0x" + n.toString(16).padStart(d, "0");
        }
        if (type == 1) {
            return toHex(resource.currentProgramInfo?.eventId, 4);
        } else if (type == 2) {
            return toHex(resource.currentProgramInfo?.serviceId, 4);
        } else if (type == 3) {
            return toHex(resource.currentProgramInfo?.originalNetworkId, 4);
        } else if (type == 4) {
            return toHex(resource.currentProgramInfo?.transportStreamId, 4);
        }
        return null;
    }
    window.browser.sleep = function sleep(interval: number): number | null {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/api/sleep?ms=" + interval, false);
        xhr.send(null);
        return 1;
    }
    window.browser.loadDRCS = function loadDRCS(DRCS_ref: string): Number {
        console.log("loadDRCS", DRCS_ref);
        const { componentId, moduleId, filename } = parseURLEx(DRCS_ref);
        if (componentId == null || moduleId == null) {
            return NaN;
        }
        const res = fetchLockedResource(DRCS_ref);
        if (res?.data == null) {
            return NaN;
        }
        const id = `drcs-${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(2, "0")}/${filename}`;
        const css = document.getElementById(id);
        if (!css) {
            const style = document.createElement("style");
            style.id = id;
            let tc = "";
            for (const [id, fontFamily] of [
                [1, "丸ゴシック"],
                [2, "角ゴシック"],
                [3, "太丸ゴシック"],
            ]) {
                const glyph = drcs.loadDRCS(Buffer.from(res.data), id as number);
                const ttf = drcs.toTTF(glyph);
                const url = URL.createObjectURL(new Blob([ttf.buffer]));
                tc += `@font-face {
    font-family: "${fontFamily}";
    src: url("${url}");
    unicode-range: U+EC00-FE00;
}
`;
            }
            style.textContent = tc;
            document.head.appendChild(style);
        }
        return 1;
    };
    window.browser.playRomSound = function playRomSound(soundID: string): Number {
        console.log("playRomSound", soundID);
        return 1;
    };
    window.browser.getBrowserVersion = function getBrowserVersion(): string[] {
        return ["BMLHTML", "BMLHTML", "001", "000"];
    }
    window.browser.getIRDID = function getIRDID(type: number): string | null {
        console.log("getIRDID", type);
        if (type === 5) {
            return "00000000000000000000";
        }
        return null;
    }
    window.browser.isIPConnected = function isIPConnected(): number {
        console.log("isIPConnected");
        return 0;
    }
    window.browser.getConnectionType = function getConnectionType(): number {
        console.log("getConnectionType");
        return NaN;
    }
    window.browser.Ureg = new Array(64);
    window.browser.Ureg.fill("");
    // const ureg = sessionStorage.getItem("Ureg");
    // if (ureg) {
    //     const uregParsed = JSON.parse(ureg);
    //     if (uregParsed.length === 64) {
    //         window.browser.Ureg = uregParsed;
    //     }
    // }
    window.browser.Greg = new Array(64);
    window.browser.Greg.fill("");
    // const greg = sessionStorage.getItem("Greg");
    // if (greg) {
    //     const gregParsed = JSON.parse(greg);
    //     if (gregParsed.length === 64) {
    //         window.browser.Greg = gregParsed;
    //     }
    // }
    window.browser.Ureg = new Proxy(window.browser.Ureg, {
        get: (obj, prop) => {
            return obj[prop];
        },
        set: (obj, prop, value) => {
            if (Number(prop) >= 0 && Number(prop) <= 63) {
                value = value.toString();
                obj[prop] = value;
                // sessionStorage.setItem("Ureg", JSON.stringify(obj));
            }
            return true;
        }
    })
    window.browser.Greg = new Proxy(window.browser.Greg, {
        get: (obj, prop) => {
            return obj[prop];
        },
        set: (obj, prop, value) => {
            if (Number(prop) >= 0 && Number(prop) <= 63) {
                value = value.toString();
                obj[prop] = value;
                // sessionStorage.setItem("Greg", JSON.stringify(obj));
            }
            return true;
        }
    })
    window.browser.setInterval = function setInterval(evalCode: string, msec: number, iteration: number): number {
        const handle = bmlSetInterval(() => {
            iteration--;
            if (iteration === 0) {
                bmlClearInterval(handle);
            }
            queueAsyncEvent(async () => {
                await executeEventHandler(evalCode)
            });
            processEventQueue();
        }, msec);
        console.log("setInterval", evalCode, msec, iteration, handle);
        return handle;
    }
    window.browser.clearTimer = function setInterval(timerID: number): number {
        console.log("clearTimer", timerID);
        bmlClearInterval(timerID);
        return 1;
    }
    function defineAttributeProperty(propertyName: string, attrName: string, nodeName: string, readable: boolean, writable: boolean, defaultValue?: string) {
        Object.defineProperty(HTMLElement.prototype, propertyName, {
            get: readable ? function (this: HTMLElement): string | undefined | null {
                if (this.nodeName !== nodeName) {
                    return undefined;
                }
                const v = this.getAttribute(attrName);
                if (defaultValue != null) {
                    if (v == null || v == "") {
                        return defaultValue;
                    }
                }
                return v;
            } : undefined,
            set: writable ? function (this: HTMLElement, value: any): void {
                if (this.nodeName !== nodeName) {
                    (this as any)[propertyName] = value;
                    return;
                }
                this.setAttribute(attrName, value);
            } : undefined,
        });
    }

    defineAttributeProperty("type", "type", "beitem", true, false);
    defineAttributeProperty("esRef", "es_ref", "beitem", true, true);
    defineAttributeProperty("moduleRef", "module_ref", "beitem", true, true);
    defineAttributeProperty("messageGroupId", "message_group_id", "beitem", true, false, "0");
    defineAttributeProperty("messageId", "message_id", "beitem", true, true);
    defineAttributeProperty("languageTag", "language_tag", "beitem", true, true);
    // registerId, serviceId, eventIdは運用しない
    defineAttributeProperty("timeMode", "time_mode", "beitem", true, false);
    defineAttributeProperty("timeValue", "time_value", "beitem", true, true);
    defineAttributeProperty("objectId", "object_id", "beitem", true, true);
    Object.defineProperty(HTMLElement.prototype, "subscribe", {
        get: function () {
            return (this as HTMLElement).getAttribute("subscribe")?.match(/^subscribe$/i) != null;
        },
        set: function (v: boolean) {
            if (v) {
                (this as HTMLElement).setAttribute("subscribe", "subscribe");
            } else {
                (this as HTMLElement).removeAttribute("subscribe");
            }
        },
    });
    Object.defineProperty(HTMLBodyElement.prototype, "invisible", {
        get: function () {
            return (this as HTMLElement).getAttribute("invisible")?.match(/^invisible$/i) != null;
        },
        set: function (v: boolean) {
            if (v) {
                document.getElementById("arib-video-invisible-container")?.appendChild(videoContainer);
                (this as HTMLElement).setAttribute("invisible", "invisible");
            } else {
                const obj = document.body.querySelector("[arib-type=\"video/X-arib-mpeg2\"]");
                if (obj != null) {
                    obj.appendChild(videoContainer);
                }
                (this as HTMLElement).removeAttribute("invisible");
            }
        },
    });
    function parseCSSValue(value: string): string | null {
        const uriMatch = /url\("?(?<uri>.+?)"?\)/.exec(value);
        if (uriMatch?.groups == null) {
            return null;
        }
        const uri = uriMatch.groups["uri"].replace(/\\/g, "");
        return new URL(uri, "http://localhost" + window.browser.getActiveDocument()).pathname;
    }

    // 同期割り込み事象キュー
    type SyncFocusEvent = {
        type: "focus";
        target: HTMLElement;
    };

    type SyncBlurEvent = {
        type: "blur";
        target: HTMLElement;
    };

    type SyncClickEvent = {
        type: "click";
        target: HTMLElement;
    };

    type SyncEvent = SyncFocusEvent | SyncBlurEvent | SyncClickEvent;

    let asyncEventQueue: (() => Promise<void>)[] = [];
    let syncEventQueue: SyncEvent[] = [];
    let syncEventQueueLockCount = 0;


    async function processEventQueue(): Promise<void> {
        while (syncEventQueue.length || asyncEventQueue.length) {
            if (syncEventQueueLockCount) {
                return;
            }
            if (syncEventQueue.length) {
                try {
                    lockSyncEventQueue();
                    const event = syncEventQueue.shift();
                    if (event?.type === "focus") {
                        await dispatchFocus(event);
                    } else if (event?.type === "blur") {
                        await dispatchBlur(event);
                    } else if (event?.type === "click") {
                        await dispatchClick(event);
                    }
                } finally {
                    unlockSyncEventQueue();
                }
                continue;
            }
            if (asyncEventQueue.length) {
                try {
                    lockSyncEventQueue();
                    const cb = asyncEventQueue.shift();
                    if (cb) {
                        await cb();
                    }
                } finally {
                    unlockSyncEventQueue();
                }
            }
        }
    }

    function queueSyncEvent(event: SyncEvent) {
        syncEventQueue.push(event);
    }

    async function queueAsyncEvent(callback: () => Promise<void>): Promise<void> {
        asyncEventQueue.push(callback);
    }

    function lockSyncEventQueue() {
        syncEventQueueLockCount++;
    }

    function unlockSyncEventQueue() {
        syncEventQueueLockCount--;
        if (syncEventQueueLockCount < 0) {
            throw new Error("syncEventQueueLockCount < 0");
        }
    }

    async function dispatchFocus(event: SyncFocusEvent): Promise<void> {
        setCurrentEvent({
            type: "focus",
            target: event.target,
        } as BMLEvent);
        const handler = event.target.getAttribute("onfocus");
        if (handler) {
            await executeEventHandler(handler);
        }
        resetCurrentEvent();
    }

    async function dispatchBlur(event: SyncBlurEvent): Promise<void> {
        setCurrentEvent({
            type: "blur",
            target: event.target,
        } as BMLEvent);
        const handler = event.target.getAttribute("onblur");
        if (handler) {
            await executeEventHandler(handler);
        }
        resetCurrentEvent();
    }

    async function dispatchClick(event: SyncClickEvent): Promise<void> {
        setCurrentEvent({
            type: "click",
            target: event.target,
        } as BMLEvent);
        const handler = event.target.getAttribute("onclick");
        if (handler) {
            await executeEventHandler(handler);
        }
        resetCurrentEvent();
    }

    HTMLElement.prototype.focus = function focus(options?: FocusOptions) {
        const prevFocus = document.currentFocus;
        if (prevFocus === this as BMLElement) {
            return;
        }
        if (window.getComputedStyle(this).visibility === "hidden") {
            return;
        }
        document.currentFocus = this as BMLElement;
        queueSyncEvent({ type: "focus", target: this });
        if (prevFocus != null) {
            queueSyncEvent({ type: "blur", target: prevFocus });
        }
    };

    Object.defineProperty(Document.prototype, "currentFocus", {
        get: function () { return this._currentFocus; },
        set: function (elem: BMLElement) {
            this._currentFocus = elem;
        }
    });
    Object.defineProperty(HTMLElement.prototype, "normalStyle", {
        get: function () {
            return new Proxy({ element: this as HTMLElement }, {
                get(obj, propName) {
                    const style = (document.defaultView?.getComputedStyle(obj.element) ?? obj.element.style);
                    const value = convertCSSPropertyToGet(propName as string, style);
                    if (value == null && !(propName in style)) {
                        console.error("invalid css", obj.element.style, propName);
                    }
                    return value;
                },
                set(obj, propName, value) {
                    // inline styleを変更?
                    const converted = convertCSSPropertyToSet(propName as string, value, obj.element.style);
                    if (propName === "grayscaleColorIndex") {
                        return true;
                    }
                    if (propName === "visibility" && document.currentFocus === obj.element && value === "hidden") {
                        obj.element.blur();
                    }
                    if (converted) {
                        return true;
                    }
                    if (!(propName in obj.element.style)) {
                        console.error("invalid css", obj.element.style, propName, value);
                    }
                    obj.element.style[propName as any] = value;
                    return true;
                }
            });
        }
    });

    enum AribKeyCode {
        Up = 1,
        Down = 2,
        Left = 3,
        Right = 4,
        Digit0 = 5,
        Digit1 = 6,
        Digit2 = 7,
        Digit3 = 8,
        Digit4 = 9,
        Digit5 = 10,
        Digit6 = 11,
        Digit7 = 12,
        Digit8 = 13,
        Digit9 = 14,
        Digit10 = 15,
        Digit11 = 16,
        Digit12 = 17,
        Enter = 18,
        Back = 19, // X
        DataButton = 20,
        BlueButton = 21, // B
        RedButton = 22, // R
        GreenButton = 23, // G
        YellowButton = 24, // Y
        DataButton1 = 25, // E
        DataButton2 = 26, // F
        Bookmark = 100,
    }

    type KeyGroup = "basic" | "data-button" | "numeric-tuning" | "other-tuning";

    // TR-B14 第二分冊 5.3.1 表5-5参照
    const keyCodeToKeyGroup = new Map<AribKeyCode, KeyGroup>([
        [AribKeyCode.Up, "basic"],
        [AribKeyCode.Down, "basic"],
        [AribKeyCode.Left, "basic"],
        [AribKeyCode.Right, "basic"],
        [AribKeyCode.Enter, "basic"],
        [AribKeyCode.Back, "basic"],
        [AribKeyCode.BlueButton, "data-button"],
        [AribKeyCode.RedButton, "data-button"],
        [AribKeyCode.GreenButton, "data-button"],
        [AribKeyCode.YellowButton, "data-button"],
        [AribKeyCode.Bookmark, "data-button"],
        [AribKeyCode.Digit0, "numeric-tuning"],
        [AribKeyCode.Digit1, "numeric-tuning"],
        [AribKeyCode.Digit2, "numeric-tuning"],
        [AribKeyCode.Digit3, "numeric-tuning"],
        [AribKeyCode.Digit4, "numeric-tuning"],
        [AribKeyCode.Digit5, "numeric-tuning"],
        [AribKeyCode.Digit6, "numeric-tuning"],
        [AribKeyCode.Digit7, "numeric-tuning"],
        [AribKeyCode.Digit8, "numeric-tuning"],
        [AribKeyCode.Digit9, "numeric-tuning"],
        [AribKeyCode.Digit10, "numeric-tuning"],
        [AribKeyCode.Digit11, "numeric-tuning"],
        [AribKeyCode.Digit12, "numeric-tuning"],
    ]);

    function keyCodeToAribKey(keyCode: string): AribKeyCode | -1 {
        // STD B-24 第二分冊(2/2) 第二編 A2 Table 5-9
        switch (keyCode) {
            case "ArrowUp":
                return AribKeyCode.Up;
            case "ArrowDown":
                return AribKeyCode.Down;
            case "ArrowLeft":
                return AribKeyCode.Left;
            case "ArrowRight":
                return AribKeyCode.Right;
            case "0":
                return AribKeyCode.Digit0;
            case "1":
                return AribKeyCode.Digit1;
            case "2":
                return AribKeyCode.Digit2;
            case "3":
                return AribKeyCode.Digit3;
            case "4":
                return AribKeyCode.Digit4;
            case "5":
                return AribKeyCode.Digit5;
            case "6":
                return AribKeyCode.Digit6;
            case "7":
                return AribKeyCode.Digit7;
            case "8":
                return AribKeyCode.Digit8;
            case "9":
                return AribKeyCode.Digit9;
            case "Enter":
            case "Space":
                return AribKeyCode.Enter;
            case "Backspace":
            case "X":
            case "x":
                return AribKeyCode.Back;
            case "D":
            case "d":
                return AribKeyCode.DataButton;
            case "B":
            case "b":
                return AribKeyCode.BlueButton;
            case "R":
            case "r":
                return AribKeyCode.RedButton;
            case "G":
            case "g":
                return AribKeyCode.GreenButton;
            case "Y":
            case "y":
                return AribKeyCode.YellowButton;
            case "E":
            case "e":
                return AribKeyCode.DataButton1;
            case "F":
            case "f":
                return AribKeyCode.DataButton2;
            default:
                return -1;
        }
    }

    function findNavIndex(navIndex: number): HTMLElement | undefined {
        return Array.from(document.querySelectorAll("*")).find(elem => {
            return parseInt(window.getComputedStyle(elem).getPropertyValue("--nav-index")) == navIndex;
        }) as (HTMLElement | undefined);
    }

    function processKeyDown(k: AribKeyCode) {
        if (k === AribKeyCode.DataButton) {
            // データボタンの場合DataButtonPressedのみが発生する
            try {
                fireDataButtonPressed();
            } catch (e) {
                if (e instanceof LongJump) {
                    console.log("long jump");
                } else {
                    throw e;
                }
            }
            return;
        }
        if (!document.currentFocus) {
            return;
        }
        const computedStyle = window.getComputedStyle(document.currentFocus);
        let nextFocus = "";
        const usedKeyList = computedStyle.getPropertyValue("--used-key-list").split(" ").filter(x => x.length);
        if (usedKeyList.length && usedKeyList[0] === "none") {
            return;
        }
        const keyGroup = keyCodeToKeyGroup.get(k);
        if (keyGroup == null) {
            return;
        }
        if (usedKeyList.length === 0) {
            if (keyGroup !== "basic" && keyGroup !== "data-button") {
                return;
            }
        } else if (!usedKeyList.some(x => x === keyGroup)) {
            return;
        }
        let nextFocusStyle = computedStyle;
        while (true) {
            if (k == AribKeyCode.Left) {
                // 明記されていなさそうだけどおそらく先にnav-indexによるフォーカス移動があるだろう
                nextFocus = nextFocusStyle.getPropertyValue("--nav-left");
            } else if (k == AribKeyCode.Right) {
                nextFocus = nextFocusStyle.getPropertyValue("--nav-right");
            } else if (k == AribKeyCode.Up) {
                nextFocus = nextFocusStyle.getPropertyValue("--nav-up");
            } else if (k == AribKeyCode.Down) {
                nextFocus = nextFocusStyle.getPropertyValue("--nav-down");
            }
            const nextFocusIndex = parseInt(nextFocus);
            if (Number.isFinite(nextFocusIndex) && nextFocusIndex >= 0 && nextFocusIndex <= 32767) {
                const next = findNavIndex(nextFocusIndex);
                if (next != null) {
                    nextFocusStyle = window.getComputedStyle(next);
                    // 非表示要素であれば飛ばされる (STD-B24 第二分冊 (1/2 第二編) 5.4.13.3参照)
                    if (nextFocusStyle.visibility === "hidden") {
                        continue;
                    }
                    next?.focus();
                }
            }
            break;
        }
        const onkeydown = document.currentFocus.getAttribute("onkeydown");
        if (onkeydown) {
            queueAsyncEvent(async () => {
                setCurrentIntrinsicEvent({
                    keyCode: k as number,
                    type: "keydown",
                    target: document.currentFocus,
                });
                try {
                    lockSyncEventQueue();
                    await executeEventHandler(onkeydown);
                } catch (e) {
                    if (e instanceof LongJump) {
                        console.log("long jump");
                    } else {
                        throw e;
                    }
                } finally {
                    unlockSyncEventQueue();
                }
                resetCurrentEvent();
                if (k == AribKeyCode.Enter && document.currentFocus) {
                    queueSyncEvent({ type: "click", target: document.currentFocus });
                }
            });
            processEventQueue();
        }
    }

    function processKeyUp(k: AribKeyCode) {
        if (k === AribKeyCode.DataButton) {
            return;
        }
        if (!document.currentFocus) {
            return;
        }
        const computedStyle = window.getComputedStyle(document.currentFocus);
        const usedKeyList = computedStyle.getPropertyValue("--used-key-list").split(" ").filter(x => x.length);
        if (usedKeyList.length && usedKeyList[0] === "none") {
            return;
        }
        const keyGroup = keyCodeToKeyGroup.get(k);
        if (keyGroup == null) {
            return;
        }
        if (usedKeyList.length === 0) {
            if (keyGroup !== "basic" && keyGroup !== "data-button") {
                return;
            }
        } else if (!usedKeyList.some(x => x === keyGroup)) {
            return;
        }
        const onkeyup = document.currentFocus.getAttribute("onkeyup");
        if (onkeyup) {
            queueAsyncEvent(async () => {
                setCurrentIntrinsicEvent({
                    keyCode: k,
                    type: "keyup",
                    target: document.currentFocus,
                } as BMLIntrinsicEvent);
                try {
                    lockSyncEventQueue();
                    await executeEventHandler(onkeyup);
                } catch (e) {
                    if (e instanceof LongJump) {
                        console.log("long jump");
                    } else {
                        throw e;
                    }
                } finally {
                    unlockSyncEventQueue();
                }
                resetCurrentEvent();
            });
            processEventQueue();
        }
    }

    window.addEventListener("keydown", (event) => {
        const k = keyCodeToAribKey(event.key);
        if (k == -1) {
            return;
        }
        processKeyDown(k);
    });
    window.addEventListener("keyup", (event) => {
        const k = keyCodeToAribKey(event.key);
        if (k == -1) {
            return;
        }
        processKeyUp(k);
    });
    function reloadObjectElement(obj: HTMLObjectElement) {
        // chromeではこうでもしないとtypeの変更が反映されない
        // バグかも
        const dummy = document.createElement("dummy");
        obj.appendChild(dummy);
        dummy.remove();
    }
    Object.defineProperty(HTMLObjectElement.prototype, "data", {
        get: function getObjectData(this: HTMLObjectElement) {
            const aribData = this.getAttribute("arib-data");
            if (aribData == null || aribData == "") {
                return this.getAttribute("data");
            }
            return aribData;
        },
        set: function setObjectData(this: HTMLObjectElement, v: string | null) {
            if (v == null) {
                this.removeAttribute("data");
                this.removeAttribute("arib-data");
                return;
            }
            const aribType = this.getAttribute("arib-type");
            const type = this.getAttribute("type");
            this.setAttribute("arib-data", v);
            if (v == "") {
                this.setAttribute("data", v);
                return;
            }
            const fetched = fetchLockedResource(v);
            if (!fetched) {
                return;
            }

            if ((aribType ?? this.type).match(/image\/X-arib-png/i)) {
                if (!aribType) {
                    this.setAttribute("arib-type", this.type);
                }
                this.type = "image/png";
                const clutCss = document.defaultView?.getComputedStyle(this)?.getPropertyValue("--clut");
                const clutUrl = clutCss == null ? null : parseCSSValue(clutCss);
                const fetchedClut = clutUrl == null ? null : fetchLockedResource(clutUrl)?.data;
                const cachedBlob = fetched.blobUrl.get(fetchedClut);
                if (cachedBlob != null) {
                    this.setAttribute("data", cachedBlob);
                } else {
                    const clut = fetchedClut == null ? defaultCLUT : readCLUT(Buffer.from(fetchedClut?.buffer));
                    const png = aribPNGToPNG(Buffer.from(fetched.data), clut);
                    const blob = new Blob([png], { type: "image/png" });
                    const b = URL.createObjectURL(blob);
                    this.setAttribute("data", b);
                    fetched.blobUrl.set(fetchedClut, b);
                }
            } else {
                this.setAttribute("data", resource.getCachedFileBlobUrl(fetched));
            }
            if (!aribType) {
                reloadObjectElement(this);
            }
        }
    });
    function init() {
        function clutToDecls(table: number[][]): css.Declaration[] {
            const ret = [];
            let i = 0;
            for (const t of table) {
                const decl: css.Declaration = {
                    type: "declaration",
                    property: "--clut-color-" + i,
                    value: `rgba(${t[0]},${t[1]},${t[2]},${t[3] / 255})`,
                };
                ret.push(decl);
                i++;
            }
            return ret;
        }

        function getCLUT(clutUrl: string): css.Declaration[] {
            const res = fetchLockedResource(clutUrl);
            let clut = defaultCLUT;
            if (res?.data) {
                clut = readCLUT(Buffer.from(res.data));
            }
            return clutToDecls(clut);
        }

        function convertCSSUrl(url: string): string {
            const res = fetchLockedResource(url);
            if (!res) {
                return url;
            }
            return resource.getCachedFileBlobUrl(res);
        }

        //observer.observe(document.body, config);
        document.querySelectorAll("arib-style, arib-link").forEach(style => {
            if (style.nodeName === "arib-link") {
                const href = style.getAttribute("href");
                if (href != null) {
                    const newStyle = document.createElement("style");
                    const res = fetchLockedResource(href);
                    if (res != null) {
                        newStyle.textContent = transpileCSS(decodeEUCJP(res.data), { inline: false, href: "http://localhost" + activeDocument, clutReader: getCLUT, convertUrl: convertCSSUrl });
                        style.parentElement?.appendChild(newStyle);
                    }
                }
            } else if (style.textContent) {
                const newStyle = document.createElement("style");
                newStyle.textContent = transpileCSS(style.textContent, { inline: false, href: "http://localhost" + activeDocument, clutReader: getCLUT, convertUrl: convertCSSUrl });
                style.parentElement?.appendChild(newStyle);
            }
        });

        document.querySelectorAll("[style]").forEach(style => {
            const styleAttribute = style.getAttribute("style");
            if (!styleAttribute) {
                return;
            }
            style.setAttribute("style", transpileCSS(styleAttribute, { inline: true, href: "http://localhost" + activeDocument, clutReader: getCLUT, convertUrl: convertCSSUrl }));
        });
        document.querySelectorAll("object").forEach(obj => {
            const adata = obj.getAttribute("arib-data");
            if (adata != null) {
                obj.data = adata;
                reloadObjectElement(obj);
            }
        });
    }

    // status, historyは存在しない
    // @ts-ignore
    delete window.status;
    // とりあえずsetter用意
    const _originalHistory = window.history;
    (window as any)["_history"] = window.history;
    Object.defineProperty(window, "history", {
        get(this: any) {
            return this["_history"];
        },
        set(this: any, v) {
            this["_history"] = v;
        }
    });
    overrideString();
    overrideNumber();
    overrideDate();

    let currentRemoteControllerMessage: string | null = null;
    function setRemoteControllerMessage(msg: string | null) {
        const remote = remoteControllerFrame.contentDocument?.getElementById("active");
        if (remote != null) {
            remote.textContent = msg;
        }
        currentRemoteControllerMessage = msg;
    }
    function createRemoteController(): HTMLIFrameElement {
        const controller = document.createElement("iframe");
        controller.src = "/remote_controller.html";
        controller.style.width = "280px";
        controller.style.height = "540px";
        controller.style.left = "1000px";
        controller.style.position = "absolute";
        controller.style.zIndex = "1000";
        return controller;
    }
    window.addEventListener("message", (ev) => {
        const remoteController = ev.data?.remoteController as (RemoteControllerMessage | undefined);
        if (remoteController != null) {
            if (remoteController.type === "unmute") {
                if (videoElement != null) {
                    videoElement.muted = false;
                }
            } else if (remoteController.type === "mute") {
                if (videoElement != null) {
                    videoElement.muted = true;
                }
            } else if (remoteController.type === "pause") {
                if (videoElement != null) {
                    videoElement.pause();
                }
            } else if (remoteController.type === "play") {
                if (videoElement != null) {
                    videoElement.play();
                }
            } else if (remoteController.type === "button") {
                processKeyDown(remoteController.keyCode as AribKeyCode);
                processKeyUp(remoteController.keyCode as AribKeyCode);
            } else if (remoteController.type === "keydown") {
                const k = keyCodeToAribKey(remoteController.key);
                if (k != -1) {
                    processKeyDown(k);
                }
            } else if (remoteController.type === "keyup") {
                const k = keyCodeToAribKey(remoteController.key);
                if (k != -1) {
                    processKeyUp(k);
                }
            } else if (remoteController.type === "load") {
                setRemoteControllerMessage(currentRemoteControllerMessage);
            }
        }
    });
    const remoteControllerFrame = createRemoteController();
    document.documentElement.append(remoteControllerFrame);
    const windowKeys = new Set<string>(Object.keys(window));
    // const interpreter = new NativeInterpreter();
    const interpreter = new JSInterpreter(window.browser);
}