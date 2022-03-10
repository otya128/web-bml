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
import { activeDocument, CachedFile, fetchLockedResource, lockCachedModule, parseURL, parseURLEx } from "./resource";
interface BMLEvent {
    type: string;
    target: HTMLElement;
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
type LockedModule = {
    module: string,
    isEx: boolean
};

declare global {
    interface Window {
        browser: any;
        dummy: any;
        BinaryTable: BinaryTableConstructor;
        lockedModules: Map<string, LockedModule>;
        newBinaryTable: any;
        __newBT: any;
    }
    interface Document {
        currentEvent: BMLEvent | null;
        currentFocus: BMLElement | null;
    }
}


if (!window.browser) {
    type Component = {
        [key: string]: Module
    };

    type Module = {
        [key: string]: File
    };

    type File = {
        [key: string]: {}
    };
    class LongJump extends Error { }
    function loadDocument(file: CachedFile) {
        // タイマー全部消す(連番前提)
        var maxId = window.setInterval(() => { }, 0);
        for (let i = 0; i < maxId; i += 1) {
            clearInterval(i);
        }
        document.documentElement.innerHTML = bmlToXHTML(file.data);
        document.querySelectorAll("script").forEach(x => {
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
                    s.textContent = "// " + src + "\n" + transpile(decodeEUCJP(res.data));
        }
            } else {
                s.textContent = "// " + activeDocument + "\n" + x.textContent;
            }
            document.body.appendChild(s);
    });
        init();
        document.querySelectorAll("[onload]").forEach(elem => {
            const onload = elem.getAttribute("onload");
            if (onload != null) {
                new Function(onload)();
            }
        });
        unlockSyncEventQueue();
        requestDispatchQueue();
        // throw new LongJump(`long jump`);
    }
    const components: { [key: string]: Component } = JSON.parse(document.getElementById("bml-server-data")?.textContent ?? "{}");
    window.dummy = undefined;
    window.browser = {};
    window.__newBT = function __newBT(klass: any, ...args: any[]) {
        if (klass === BinaryTable) {
            try {
                return new klass(...args);
            } catch {
                return null;
            }
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
        return 1; // 成功
    };
    window.browser.getProgramRelativeTime = function getProgramRelativeTime(): number {
        return 10; // 秒
    }
    window.browser.subDate = function subDate(target: Date, base: Date, unit: number) {
        const sub = target.getDate() - base.getDate();
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
        window.lockedModules.delete(module);
        console.log("unlockModuleOnMemory", module);
        return 1; // NaN => fail
    };
    window.browser.unlockModuleOnMemoryEx = function unlockModuleOnMemoryEx(module: string): number {
        window.lockedModules.delete(module);
        console.log("unlockModuleOnMemoryEx", module);
        return 1; // NaN => fail
    };
    window.browser.unlockAllModulesOnMemory = function unlockAllModulesOnMemory(): number {
        window.lockedModules = new Map<string, LockedModule>();
        console.log("unlockAllModulesOnMemory");
        return 1; // NaN => fail
    };
    window.lockedModules = new Map<string, LockedModule>();
    window.browser.lockModuleOnMemory = function lockModuleOnMemory(module: string): number {
        console.log("lockModuleOnMemory", module);
        const { componentId, moduleId } = parseURLEx(module);
        if (componentId == null || moduleId == null) {
            return NaN;
        }
        if (!resource.getPMTComponent(componentId)) {
            console.error("lockModuleOnMemory: component does not exist in PMT", module);
            return -1;
        }
        const cachedModule = lockCachedModule(componentId, moduleId);
        if (!cachedModule) {
            console.error("lockModuleOnMemory: module not cached", module);
            return -1;
        }
        window.lockedModules.set(module.toLowerCase(), { module, isEx: false });
        // イベントハンドラではモジュール名の大文字小文字がそのままである必要がある?
        window.postMessage({ type: "ModuleLocked", module }, "*");
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
        const cachedModule = lockCachedModule(componentId, moduleId);
        if (!cachedModule) {
            console.error("lockModuleOnMemoryEx: module not cached", module);
            // OnModuleLockedのstatusで返ってくる
            return 0;
        }
        window.lockedModules.set(module.toLowerCase(), { module, isEx: true });
        // イベントハンドラではモジュール名の大文字小文字がそのままである必要がある?
        window.postMessage({ type: "ModuleLocked", module }, "*");
        return 1;
    }
    window.addEventListener("message", (e) => {
        if (e.data.type === "ModuleLocked") {
            eventQueueOnModuleLocked(e);
        }
    });
    function eventQueueOnModuleLocked(e: MessageEvent<any>) {
        const module: string = e.data.module as string;
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
                    document.currentEvent = {
                        type: "ModuleLocked",
                        target: beitem as HTMLElement,
                        status: 0,
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
                    } as BMLBeventEvent;
                    new Function(onoccur)();//eval.call(window, onoccur);
                    document.currentEvent = null;
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
                document.currentEvent = {
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
                } as BMLBeventEvent;
                new Function(onoccur)();//eval.call(window, onoccur);
                document.currentEvent = null;
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
                if (additionalinfo === "3.0") {
                    return 0;
                }
            } else if (functionname === "APIGroup") {
                if (additionalinfo === "Ctrl.Basic2") {
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
        if (!lockCachedModule(componentId, moduleId)) {
            console.error("FIXME");
            return NaN;
        }
        const res = fetchLockedResource(documentName);
        if (res == null) {
            console.error("NOT FOUND");
            return NaN;
        }
        const ad = activeDocument;
        loadDocument(res);
        console.log("return ", ad, documentName);
        // location.href = documentName;
        return 0;
    };
    window.browser.reloadActiveDocument = function reloadActiveDocument(): number {
        console.log("reloadActiveDocument");
        location.reload();
        return NaN;
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
        return Math.floor(Math.random() * num);
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
        for (const [_, { module, isEx }] of window.lockedModules) {
            l.push([module, isEx ? 2 : 1, 1]);
        }
        return l;
    }
    window.browser.detectComponent = function detectComponent(component_ref: string) {
        const { component } = parseURL(component_ref);
        if (!component) {
            return NaN;
        }
        const componentId = Number.parseInt(component);
        if (resource.getPMTComponent(componentId)) {
            return 1;
        } else {
            return 0;
        }
    }
    window.browser.getProgramID = function getProgramID(type: number): string | null {

        return null;
    }
    window.browser.sleep = function sleep(interval: number): number | null {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/api/sleep?ms=" + interval, false);
        xhr.send(null);
        return 1;
    }
    window.browser.detectComponent = function detectComponent(component_ref: string): number | null {
        console.log("detectComponent", component_ref);
        return 1;
    }
    window.browser.loadDRCS = function loadDRCS(DRCS_ref: string): Number {
        console.log("loadDRCS", DRCS_ref);
        const { component, module, filename } = parseURL(DRCS_ref);
        const id = `drcs-${component}/${module}/${filename}`;
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
                tc += `@font-face {
    font-family: "${fontFamily}";
    src: url("/${component}/${module}/${filename}?ttf=${id}");
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
    const ureg = sessionStorage.getItem("Ureg");
    if (ureg) {
        const uregParsed = JSON.parse(ureg);
        if (uregParsed.length === 64) {
            window.browser.Ureg = uregParsed;
        }
    }
    window.browser.Greg = new Array(64);
    window.browser.Greg.fill("");
    const greg = sessionStorage.getItem("Greg");
    if (greg) {
        const gregParsed = JSON.parse(greg);
        if (gregParsed.length === 64) {
            window.browser.Greg = gregParsed;
        }
    }
    window.browser.Ureg = new Proxy(window.browser.Ureg, {
        get: (obj, prop) => {
            return obj[prop];
        },
        set: (obj, prop, value) => {
            if (Number(prop) >= 0 && Number(prop) <= 63) {
                value = value.toString();
                obj[prop] = value;
                sessionStorage.setItem("Ureg", JSON.stringify(obj));
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
                sessionStorage.setItem("Greg", JSON.stringify(obj));
            }
            return true;
        }
    })
    window.browser.setInterval = function setInterval(evalCode: string, msec: number, iteration: number): number {
        const handle = window.setInterval(() => {
            iteration--;
            if (iteration === 0) {
                window.clearInterval(handle);
            }
            eval(evalCode);
        }, msec);
        console.log("setInterval", evalCode, msec, iteration, handle);
        return handle;
    }
    window.browser.clearTimer = function setInterval(timerID: number): number {
        console.log("clearTimer", timerID);
        window.clearInterval(timerID);
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

    let syncEventQueue: SyncEvent[] = [];
    let syncEventQueueLocked = false;

    function queueSyncEvent(event: SyncEvent) {
        syncEventQueue.push(event);
    }

    function requestDispatchQueue() {
        if (!syncEventQueueLocked) {
            dispatchEventQueue();
        }
    }

    function lockSyncEventQueue() {
        syncEventQueueLocked = true;
    }

    function unlockSyncEventQueue() {
        syncEventQueueLocked = false;
    }

    function dispatchEventQueue() {
        try {
            lockSyncEventQueue();
            while (true) {
                const event = syncEventQueue.shift();
                if (event == null) {
            return;
        }
                if (event.type === "focus") {
                    dispatchFocus(event);
                } else if (event.type === "blur") {
                    dispatchBlur(event);
                } else if (event.type === "click") {
                    dispatchClick(event);
        }
            }
        } finally {
            unlockSyncEventQueue();
        }
    }

    function dispatchFocus(event: SyncFocusEvent) {
        document.currentEvent = {
            type: "focus",
            target: event.target,
        } as BMLEvent;
        const handler = event.target.getAttribute("onfocus");
        if (handler) {
            new Function(handler)();
        }
        document.currentEvent = null;
    }

    function dispatchBlur(event: SyncBlurEvent) {
            document.currentEvent = {
                type: "blur",
            target: event.target,
            } as BMLEvent;
        const handler = event.target.getAttribute("onblur");
        if (handler) {
            new Function(handler)();
        }
            document.currentEvent = null;
        }

    function dispatchClick(event: SyncClickEvent) {
            document.currentEvent = {
            type: "click",
            target: event.target,
            } as BMLEvent;
        const handler = event.target.getAttribute("onclick");
        if (handler) {
            new Function(handler)();
        }
            document.currentEvent = null;
    }

    HTMLElement.prototype.focus = function focus(options?: FocusOptions) {
        // focus()の中でfocus()は呼べない
        if (document.currentEvent?.type === "focus") {
            return;
        }
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
        requestDispatchQueue();
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

        window.addEventListener("keydown", (event) => {
            const k = keyCodeToAribKey(event.key);
            if (k === AribKeyCode.DataButton) {
                // データボタンの場合DataButtonPressedのみが発生する
                fireDataButtonPressed();
                return;
            }
            if (k == -1) {
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
            if (k == AribKeyCode.Left) {
                // 明記されていなさそうだけどおそらく先にnav-indexによるフォーカス移動があるだろう
                nextFocus = computedStyle.getPropertyValue("--nav-left");
            } else if (k == AribKeyCode.Right) {
                nextFocus = computedStyle.getPropertyValue("--nav-right");
            } else if (k == AribKeyCode.Up) {
                nextFocus = computedStyle.getPropertyValue("--nav-up");
            } else if (k == AribKeyCode.Down) {
                nextFocus = computedStyle.getPropertyValue("--nav-down");
            }
            const nextFocusIndex = parseInt(nextFocus);
            if (Number.isFinite(nextFocusIndex) && nextFocusIndex >= 0 && nextFocusIndex <= 32767) {
                findNavIndex(nextFocusIndex)?.focus();
            }
            const onkeydown = document.currentFocus.getAttribute("onkeydown");
            if (onkeydown) {
                document.currentEvent = {
                    keyCode: k,
                    type: "keydown",
                    target: document.currentFocus,
                } as BMLIntrinsicEvent;
                new Function(onkeydown)();
                document.currentEvent = null;
                if (k == AribKeyCode.Enter && document.currentFocus) {
                    queueSyncEvent({ type: "click", target: document.currentFocus });
                    requestDispatchQueue();
                }
            }
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
            set: function setObjectData(this: HTMLObjectElement, v: string) {
                const aribType = this.getAttribute("arib-type");
            this.setAttribute("arib-data", v);
            if (v == "") {
                this.setAttribute("data", v);
                return;
            }
            const fetched = fetchLockedResource(v);
            if (!fetched) {
                this.setAttribute("data", v);
                return;
            }
            
                if ((aribType ?? this.type).match(/image\/X-arib-png/i)) {
                    if (!aribType) {
                        this.setAttribute("arib-type", this.type);
                    }
                    this.type = "image/png";
                    const clut = document.defaultView?.getComputedStyle(this)?.getPropertyValue("--clut");
                    if (clut && !v.includes("?clut=")) {
                        v = v + "?clut=" + window.encodeURIComponent(parseCSSValue(clut) ?? "");
                    }
                }
                if (this.getAttribute("data") === v) {
                    return;
                }
                this.setAttribute("data", v);
                if (!aribType) {
                    reloadObjectElement(this);
                }
            }
        });
    function init() {


        const config = { attributes: true, childList: true, subtree: true };

        const observer = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName === "object") {
                            const obj = node as HTMLObjectElement;
                            if (!obj.type.match(/image\/X-arib-png/i)) {
                                return;
                            }
                            const clut = document.defaultView?.getComputedStyle(obj)?.getPropertyValue("--clut");
                            if (!clut) {
                                return;
                            }
                            if (!obj.data) {
                                return;
                            }
                            obj.setAttribute("arib-type", obj.type);
                            obj.type = "image/png";
                            if (!obj.data.includes("?clut="))
                                obj.data = obj.data + "?clut=" + window.encodeURIComponent(parseCSSValue(clut) ?? "");
                                reloadObjectElement(obj);
                        }
                    });
                }
                if (mutation.type === "attributes" && 0) {
                    if (mutation.attributeName === "data" && mutation.target.nodeName === "object") {
                        const obj = mutation.target as HTMLObjectElement;
                        if (!(obj.getAttribute("arib-type") ?? obj.type).match(/image\/X-arib-png/i)) {
                            continue;
                        }
                        const clut = document.defaultView?.getComputedStyle(obj)?.getPropertyValue("--clut");
                        if (!clut) {
                            continue;
                        }
                        if (!obj.data.includes("?clut="))
                            obj.data = obj.data + "?clut=" + window.encodeURIComponent(parseCSSValue(clut) ?? "");
                            reloadObjectElement(obj);
                    }
                }
            }
        });

        function getCLUT(clut: string): css.Declaration[] {
            var xhr = new XMLHttpRequest();
            let result: css.Declaration[] = [];
            xhr.open("GET", clut + "?css", false);
            xhr.onload = (e) => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        result = JSON.parse(xhr.response) as css.Declaration[];
                    }
                }
            };
            xhr.send(null);
            return result;
        }

        //observer.observe(document.body, config);
        document.querySelectorAll("arib-style").forEach(style => {
            if (style.textContent) {
                const newStyle = document.createElement("style");
                newStyle.textContent = transpileCSS(style.textContent, { inline: false, href: location.href, clutReader: getCLUT });
                style.parentElement?.appendChild(newStyle);
            }
        });

        document.querySelectorAll("[style]").forEach(style => {
            const styleAttribute = style.getAttribute("style");
            if (!styleAttribute) {
                return;
            }
            style.setAttribute("style", transpileCSS(styleAttribute, { inline: true, href: location.href, clutReader: getCLUT }));
        });
        document.querySelectorAll("object").forEach(obj => {
            if (!obj.type.match(/image\/X-arib-png/i)) {
                return;
            }
            const clut = document.defaultView?.getComputedStyle(obj)?.getPropertyValue("--clut");
            if (!clut) {
                return;
            }
            if (!obj.data) {
                return;
            }
            obj.setAttribute("arib-type", obj.type);
            obj.type = "image/png";
            if (!obj.data.includes("?clut="))
                obj.data = obj.data + "?clut=" + window.encodeURIComponent(parseCSSValue(clut) ?? "");
            reloadObjectElement(obj);
        });
        // フォーカスはonloadの前に当たるがonloadが実行されるまではイベントは実行されない
        // STD-B24 第二分冊(2/2) 第二編 付属1 5.1.3参照
        lockSyncEventQueue();
        findNavIndex(0)?.focus();
    }
    
    window.addEventListener("load", (_) => {
        unlockSyncEventQueue();
        requestDispatchQueue();
    });

    // historyは存在しない
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
    init();
}