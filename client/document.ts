import css from "css";
import { Resources, CachedFile } from "./resource";
import { decodeEUCJP } from "./euc_jp";
import { defaultCLUT } from "./default_clut";
import { readCLUT } from "./clut";
import { transpileCSS } from "./transpile_css";
import { Buffer } from "buffer";
import { BML } from "./interface/DOM";
import { bmlToXHTMLFXP } from "./bml_to_xhtml";
import { ResponseMessage } from "../server/ws_api";
import { EventDispatcher, EventQueue } from "./event_queue";
import { Interpreter } from "./interpreter/interpreter";
import { BMLBrowserEventTarget, Indicator } from "./bml_browser";
import { convertJPEG } from "./arib_jpeg";

export enum AribKeyCode {
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

const keyCodeToAccessKey = new Map<AribKeyCode, string>([
    [AribKeyCode.Back, "X"],
    [AribKeyCode.BlueButton, "B"],
    [AribKeyCode.RedButton, "R"],
    [AribKeyCode.GreenButton, "G"],
    [AribKeyCode.YellowButton, "Y"],
    [AribKeyCode.DataButton1, "E"],
    [AribKeyCode.DataButton2, "F"],
]);

export function keyCodeToAribKey(keyCode: string): AribKeyCode | -1 {
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

function requestAnimationFrameAsync(): Promise<void> {
    return new Promise<void>((resolve, _) => {
        requestAnimationFrame((_time) => resolve());
    });
}

export class BMLDocument {
    private documentElement: HTMLElement;
    private resources: Resources;
    private eventQueue: EventQueue;
    private eventDispatcher: EventDispatcher;
    private interpreter: Interpreter;
    public readonly bmlDocument: BML.BMLDocument;
    private videoContainer: HTMLElement;
    private bmlEventTarget: BMLBrowserEventTarget;
    private indicator?: Indicator;
    private fonts: FontFace[] = [];
    public constructor(bmlDocument: BML.BMLDocument,
        documentElement: HTMLElement,
        resources: Resources,
        eventQueue: EventQueue,
        eventDispatcher: EventDispatcher,
        interpreter: Interpreter,
        videoContainer: HTMLElement,
        bmlEventTarget: BMLBrowserEventTarget,
        indicator?: Indicator) {
        this.bmlDocument = bmlDocument;
        this.documentElement = documentElement;
        this.resources = resources;
        this.eventQueue = eventQueue;
        this.eventDispatcher = eventDispatcher;
        this.interpreter = interpreter;
        this.videoContainer = videoContainer;
        this.bmlEventTarget = bmlEventTarget;
        this.indicator = indicator;

        this.documentElement.addEventListener("keydown", (event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }
            const k = keyCodeToAribKey(event.key);
            if (k == -1) {
                return;
            }
            event.preventDefault();
            this.processKeyDown(k);
        });

        this.documentElement.addEventListener("keyup", (event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }
            const k = keyCodeToAribKey(event.key);
            if (k == -1) {
                return;
            }
            event.preventDefault();
            this.processKeyUp(k);
        });

        this.resources.addEventListener("dataeventchanged", async (event) => {
            const { component, returnToEntryFlag } = event.detail;
            console.log("DataEventChanged", event.detail);
            const { moduleId, componentId } = this.resources.parseURLEx(this.resources.activeDocument);
            if (moduleId == null || componentId == null) {
                return;
            }
            // 現在視聴中のコンポーネントまたはエントリコンポーネント(固定)かつ引き戻しフラグであればスタートアップ文書を起動
            const returnToEntry = (component.componentId === 0x40 && returnToEntryFlag);
            if (!returnToEntry && component.componentId !== componentId) {
                return;
            }
            this.eventQueue.queueGlobalAsyncEvent(async () => {
                if (component.componentId === componentId) {
                    // Exは運用されない
                    const moduleLocked = this.documentElement.querySelectorAll("beitem[type=\"DataEventChanged\"]");
                    for (const elem of Array.from(moduleLocked)) {
                        const beitem = BML.nodeToBMLNode(elem, this.bmlDocument) as BML.BMLBeitemElement;
                        if (!beitem.subscribe) {
                            continue;
                        }
                        const onoccur = elem.getAttribute("onoccur");
                        if (onoccur == null) {
                            continue;
                        }
                        this.eventDispatcher.setCurrentBeventEvent({
                            type: "DataEventChanged",
                            target: elem as HTMLElement,
                            status: component.modules.size === 0 ? 1 : 0,
                            privateData: "",
                            esRef: "",
                            messageId: 0,
                            messageVersion: 0,
                            messageGroupId: 0,
                            moduleRef: "",
                            languageTag: 0,//?
                            registerId: 0,
                            serviceId: 0,
                            eventId: 0,
                            peripheralRef: "",
                            object: null,
                            segmentId: null,
                        });
                        let exit = false;
                        try {
                            this.eventQueue.lockSyncEventQueue();
                            if (exit = await this.eventQueue.executeEventHandler(onoccur)) {
                                return true;
                            }
                        } finally {
                            if (!exit) {
                                this.eventQueue.unlockSyncEventQueue();
                            }
                        }
                        this.eventDispatcher.resetCurrentEvent();
                    }
                    // 提示中のコンポーネントでのデータイベントの更新があった場合lockModuleOnMemoryとlockModuleOnMemoryExでロックしたモジュールのロックが解除される TR-B14 第二分冊 表5-11
                    this.resources.unlockModules();
                };
                if (component.componentId === componentId || returnToEntry) {
                    if (returnToEntry) {
                        // 引き戻しフラグによるエントリコンポーネントへの遷移の場合lockModuleOnMemoryでロックしたモジュールのロックが解除される TR-B14 第二分冊 表5-11
                        this.resources.unlockModules("lockModuleOnMemory");
                    }
                    console.error("launch startup (DataEventChanged)");
                    this.launchDocument("/40/0000/startup.bml");
                    return true;
                }
                return false;
            });
            this.eventQueue.processEventQueue();
        });
    }

    private _currentDateMode: number = 0;
    public set currentDateMode(timeMode: number) {
        this._currentDateMode = timeMode;
    }

    public get currentDateMode(): number {
        return this._currentDateMode;
    }

    private getBody() {
        return this.documentElement.querySelector("body");
    }

    private async loadDocumentToDOM(data: string): Promise<void> {
        const xhtmlDocument = new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja" lang="ja"></html>`, "application/xhtml+xml");
        const documentElement = xhtmlDocument.createElement("html");
        documentElement.innerHTML = bmlToXHTMLFXP(data);
        const p = Array.from(this.documentElement.childNodes).filter(x => x.nodeName.toLowerCase() === "body" || x.nodeName.toLowerCase() === "head");
        const videoElementNew = documentElement.querySelector("[arib-type=\"video/X-arib-mpeg2\"]");
        const prevBody = this.getBody();
        const newBody = documentElement.querySelector("body")!;
        prevBody?.setAttribute("arib-loading", "arib-loading");
        newBody.setAttribute("arib-loading", "arib-loading");
        for (const style of Array.from(documentElement.querySelectorAll("arib-style, arib-link"))) {
            if (style.nodeName.toLowerCase() === "arib-link") {
                const href = style.getAttribute("href");
                if (href != null) {
                    const newStyle = document.createElement("style");
                    const res = this.resources.fetchLockedResource(href);
                    if (res != null) {
                        newStyle.textContent = await transpileCSS(decodeEUCJP(res.data), { inline: false, clutReader: this.getCLUT.bind(this), convertUrl: this.convertCSSUrl.bind(this) });
                        style.parentElement?.appendChild(newStyle);
                    }
                }
            } else if (style.textContent) {
                const newStyle = document.createElement("style");
                newStyle.textContent = await transpileCSS(style.textContent, { inline: false, clutReader: this.getCLUT.bind(this), convertUrl: this.convertCSSUrl.bind(this) });
                style.parentElement?.appendChild(newStyle);
            }
        }

        for (const style of Array.from(documentElement.querySelectorAll("[style]"))) {
            const styleAttribute = style.getAttribute("style");
            if (!styleAttribute) {
                continue;
            }
            style.setAttribute("style", await transpileCSS(styleAttribute, { inline: true, clutReader: this.getCLUT.bind(this), convertUrl: this.convertCSSUrl.bind(this) }));
        }

        this.documentElement.append(...Array.from(documentElement.children));

        if (videoElementNew != null) {
            videoElementNew.appendChild(this.videoContainer);
        }
        newBody.removeAttribute("arib-loading");
        for (const n of p) {
            n.remove();
        }
    }

    private focusHelper(element?: HTMLElement | null) {
        if (element == null) {
            return;
        }
        const felem = BML.htmlElementToBMLHTMLElement(element, this.bmlDocument);
        if (felem && (felem as any).focus) {
            (felem as any).focus();
        }
    }

    public unloadAllDRCS() {
        for (const font of this.fonts) {
            document.fonts.delete(font);
        }
        this.fonts.length = 0;
    }

    private _context: any = {};

    public get context() {
        return this._context;
    }

    private async loadDocument(file: CachedFile, documentName: string): Promise<boolean> {
        // スクリプトが呼ばれているときにさらにスクリプトが呼ばれることはないがonunloadだけ例外
        this.interpreter.resetStack();
        const onunload = this.getBody()?.getAttribute("arib-onunload");
        if (onunload != null) {
            if (await this.eventQueue.executeEventHandler(onunload)) {
                // readPersistentArray writePersistentArray unlockModuleOnMemoryEx unlockAllModulesOnMemoryしか呼び出せないので終了したらおかしい
                console.error("onunload");
                return true;
            }
        }
        this._context = { from: this.resources.activeDocument, to: documentName };
        this.interpreter.reset();
        this.resources.activeDocument = documentName;
        this.bmlDocument._currentFocus = null;
        // 提示中の文書と同一サービス内の別コンポーネントへの遷移の場合lockModuleOnMemoryでロックしたモジュールのロックは解除される TR-B14 第二分冊 表5-11
        const { componentId: nextComponent } = this.resources.parseURLEx(documentName);
        const { componentId: prevComponent } = this.resources.parseURLEx(this.resources.activeDocument);
        if (prevComponent !== nextComponent) {
            this.resources.unlockModules("lockModuleOnMemory");
        }
        this.currentDateMode = 0;
        await requestAnimationFrameAsync();
        await this.loadDocumentToDOM(decodeEUCJP(file.data));
        this.loadObjects();
        this.eventQueue.reset();
        this.unloadAllDRCS();
        let width: number = 960;
        let height: number = 540;
        const body = this.getBody()!;
        const bmlBody = BML.nodeToBMLNode(body, this.bmlDocument) as BML.BMLBodyElement;
        const bodyStyle = window.getComputedStyle(body);
        const resolution = bodyStyle.getPropertyValue("--resolution").trim();
        const displayAspectRatio = bodyStyle.getPropertyValue("--display-aspect-ratio").trim();
        let aspectNum = 16;
        let aspectDen = 9;
        if (resolution === "720x480") {
            if (displayAspectRatio === "4v3") {
                [width, height] = [720, 480];
                aspectNum = 4;
                aspectDen = 3;
            } else {
                [width, height] = [720, 480];
            }
        }
        this.bmlEventTarget.dispatchEvent<"load">(new CustomEvent("load", { detail: { resolution: { width, height }, displayAspectRatio: { numerator: aspectNum, denominator: aspectDen } } }));
        body.style.maxWidth = width + "px";
        body.style.minWidth = width + "px";
        body.style.maxHeight = height + "px";
        body.style.minHeight = height + "px";
        bmlBody.invisible = bmlBody.invisible;
        // フォーカスはonloadの前に当たるがonloadが実行されるまではイベントは実行されない
        // STD-B24 第二分冊(2/2) 第二編 付属1 5.1.3参照
        this.eventQueue.lockSyncEventQueue();
        let exit = false;
        let scriptCount = 0;
        try {
            this.focusHelper(this.findNavIndex(0));
            for (const x of Array.from(this.documentElement.querySelectorAll("arib-script"))) {
                const src = x.getAttribute("src");
                if (src) {
                    const res = await this.resources.fetchResourceAsync(src);
                    if (res !== null) {
                        if (exit = await this.interpreter.addScript(decodeEUCJP(res.data), src)) {
                            return true;
                        }
                    }
                } else if (x.textContent != null) {
                    scriptCount++;
                    if (exit = await this.interpreter.addScript(x.textContent, `${this.resources.activeDocument ?? ""}[${scriptCount}]`)) {
                        return true;
                    }
                }
            }
            const onload = this.getBody()?.getAttribute("arib-onload");
            if (onload != null) {
                console.debug("START ONLOAD");
                if (exit = await this.eventQueue.executeEventHandler(onload)) {
                    return true;
                }
                console.debug("END ONLOAD");
            }
        }
        finally {
            if (!exit) {
                this.eventQueue.unlockSyncEventQueue();
            }
        }
        console.debug("START PROC EVQ");
        if (await this.eventQueue.processEventQueue()) {
            return true;
        }
        console.debug("END PROC EVQ");
        // 雑だけど動きはする
        this.eventQueue.setInterval(() => {
            const moduleLocked = this.documentElement.querySelectorAll("beitem[type=\"ModuleUpdated\"]");
            moduleLocked.forEach(elem => {
                const beitem = BML.nodeToBMLNode(elem, this.bmlDocument) as BML.BMLBeitemElement;
                if (!beitem.subscribe) {
                    return;
                }
                const moduleRef = beitem.moduleRef;
                if (moduleRef === "") {
                    return;
                }
                const { moduleId, componentId } = this.resources.parseURLEx(moduleRef);
                if (moduleId == null || componentId == null) {
                    return;
                }
                if (!this.resources.getPMTComponent(componentId)) {
                    if ((beitem as any).__prevStatus !== 1) {
                        this.eventDispatcher.dispatchModuleUpdatedEvent(moduleRef, 1);
                        (beitem as any).__prevStatus = 1;
                    }
                    return;
                }
                // DII未受信
                const dii = this.resources.getDownloadComponentInfo(componentId);
                if (dii == null) {
                    return;
                }
                const existsInDII = this.resources.moduleExistsInDownloadInfo(componentId, moduleId);
                const prevDataEventDIINotExists = (beitem as any).__prevStatus === 1;
                const prevDataEventDIIExists = (beitem as any).__prevStatus === 2;
                if (existsInDII) {
                    if ((beitem as any).__prevStatus !== 2) {
                        this.eventDispatcher.dispatchModuleUpdatedEvent(moduleRef, 2);
                        (beitem as any).__prevStatus = 2;
                    } else {
                        const cachedModule = this.resources.getCachedModule(componentId, moduleId);
                        if (cachedModule != null) {
                            const version = cachedModule.version;
                            if ((beitem as any).__prevVersion != null && (beitem as any).__prevVersion !== version) {
                                this.eventDispatcher.dispatchModuleUpdatedEvent(moduleRef, 0);
                            }
                            (beitem as any).__prevVersion = version;
                        }
                    }
                } else {
                    if ((beitem as any).__prevStatus !== 1) {
                        this.eventDispatcher.dispatchModuleUpdatedEvent(moduleRef, 1);
                        (beitem as any).__prevStatus = 1;
                    }
                }
                if ((beitem as any).__prevDataEventId == null) {
                    (beitem as any).__prevDataEventId = dii.dataEventId;
                    // データイベントが更新された
                } else if ((beitem as any).__prevDataEventId !== dii.dataEventId) {
                    (beitem as any).__prevDataEventId = dii.dataEventId;
                    if (prevDataEventDIINotExists && existsInDII) {
                        this.eventDispatcher.dispatchModuleUpdatedEvent(moduleRef, 4);
                    } else if (prevDataEventDIIExists && !existsInDII) {
                        this.eventDispatcher.dispatchModuleUpdatedEvent(moduleRef, 5);
                    } else if (prevDataEventDIIExists && existsInDII) {
                        this.eventDispatcher.dispatchModuleUpdatedEvent(moduleRef, 6);
                    }
                }
            });
        }, 1000);
        this.indicator?.setUrl(this.resources.activeDocument, false);
        return false;
    }

    public launchDocument(documentName: string) {
        this.launchDocumentAsync(documentName);
        return NaN;
    }

    private async launchDocumentAsync(documentName: string) {
        console.log("%claunchDocument", "font-size: 4em", documentName);
        this.eventQueue.discard();
        const { component, module, filename } = this.resources.parseURL(documentName);
        const componentId = Number.parseInt(component ?? "", 16);
        const moduleId = Number.parseInt(module ?? "", 16);
        if (!Number.isInteger(componentId) || !Number.isInteger(moduleId)) {
            return NaN;
        }
        let normalizedDocument;
        if (filename != null) {
            normalizedDocument = `/${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}/${filename}`;
        } else {
            normalizedDocument = `/${componentId.toString(16).padStart(2, "0")}/${moduleId.toString(16).padStart(4, "0")}`;
        }
        this.indicator?.setUrl(normalizedDocument, true);
        const res = await this.resources.fetchResourceAsync(documentName);
        if (res == null) {
            console.error("NOT FOUND");
            return NaN;
        }
        const ad = this.resources.activeDocument;
        await this.loadDocument(res, normalizedDocument);
        console.log("return ", ad, documentName);
        return NaN;
    }

    private findNavIndex(navIndex: number): HTMLElement | undefined {
        return Array.from(this.documentElement.querySelectorAll("*")).find(elem => {
            return parseInt(window.getComputedStyle(elem).getPropertyValue("--nav-index")) == navIndex;
        }) as (HTMLElement | undefined);
    }

    public processKeyDown(k: AribKeyCode) {
        if (k === AribKeyCode.DataButton) {
            // データボタンの場合DataButtonPressedのみが発生する
            this.eventDispatcher.dispatchDataButtonPressedEvent();
            return;
        }
        let focusElement = this.bmlDocument.currentFocus && this.bmlDocument.currentFocus["node"];
        if (!focusElement) {
            return;
        }
        if (focusElement instanceof HTMLInputElement) {
            if (k >= AribKeyCode.Digit0 && k <= AribKeyCode.Digit9) {
                const num = (k - AribKeyCode.Digit0).toString();
                if (focusElement.maxLength > focusElement.value.length) {
                    focusElement.value += num;
                }
            } else if (k === AribKeyCode.Back) {
                if (focusElement.value.length >= 1) {
                    focusElement.value = focusElement.value.substring(0, focusElement.value.length - 1);
                }
            }
        }
        const computedStyle = window.getComputedStyle(this.getBody()!);
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
        focusElement = this.bmlDocument.currentFocus && this.bmlDocument.currentFocus["node"];
        if (!focusElement) {
            return;
        }
        const onkeydown = focusElement.getAttribute("onkeydown");
        this.eventQueue.queueAsyncEvent(async () => {
            if (onkeydown) {
                this.eventDispatcher.setCurrentIntrinsicEvent({
                    keyCode: k as number,
                    type: "keydown",
                    target: focusElement,
                });
                let exit = false;
                try {
                    this.eventQueue.lockSyncEventQueue();
                    if (exit = await this.eventQueue.executeEventHandler(onkeydown)) {
                        return true;
                    }
                } finally {
                    if (!exit) {
                        this.eventQueue.unlockSyncEventQueue();
                    }
                }
                this.eventDispatcher.resetCurrentEvent();
            }
            // STD-B24 第二分冊 (2/2) 第二編 付属1 5.4.2.3参照
            const accessKey = keyCodeToAccessKey.get(k);
            if (accessKey != null) {
                const elem = this.documentElement.querySelector(`[accesskey="${accessKey}"]`) as HTMLElement;
                if (elem != null && BML.isFocusable(elem)) {
                    this.focusHelper(elem);
                    console.warn("accesskey is half implemented.");
                    // [6] 疑似的にkeyup割り込み事象が発生 keyCode = アクセスキー
                    const onkeyup = elem.getAttribute("onkeyup");
                    if (onkeyup != null) {
                        this.eventDispatcher.setCurrentIntrinsicEvent({
                            keyCode: k as number,
                            type: "keyup",
                            target: elem,
                        });
                        let exit = false;
                        try {
                            this.eventQueue.lockSyncEventQueue();
                            if (exit = await this.eventQueue.executeEventHandler(onkeyup)) {
                                return true;
                            }
                        } finally {
                            if (!exit) {
                                this.eventQueue.unlockSyncEventQueue();
                            }
                        }
                        this.eventDispatcher.resetCurrentEvent();
                    }
                    // [6] 疑似的にkeydown割り込み事象が発生 keyCode = 決定キー
                    const onkeydown = elem.getAttribute("onkeydown");
                    k = AribKeyCode.Enter;
                    if (onkeydown != null) {
                        this.eventDispatcher.setCurrentIntrinsicEvent({
                            keyCode: k as number,
                            type: "keydown",
                            target: elem,
                        });
                        let exit = false;
                        try {
                            this.eventQueue.lockSyncEventQueue();
                            if (exit = await this.eventQueue.executeEventHandler(onkeydown)) {
                                return true;
                            }
                        } finally {
                            if (!exit) {
                                this.eventQueue.unlockSyncEventQueue();
                            }
                        }
                        this.eventDispatcher.resetCurrentEvent();
                    }
                }
            }
            focusElement = this.bmlDocument.currentFocus && this.bmlDocument.currentFocus["node"];
            if (focusElement) {
                // [4] A'に対してnavigation関連特性を適用
                let nextFocus = "";
                let nextFocusStyle = window.getComputedStyle(focusElement);
                while (true) {
                    if (k == AribKeyCode.Left) {
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
                        const next = this.findNavIndex(nextFocusIndex);
                        if (next != null) {
                            nextFocusStyle = window.getComputedStyle(next);
                            // 非表示要素であれば飛ばされる (STD-B24 第二分冊 (1/2 第二編) 5.4.13.3参照)
                            if (!BML.isFocusable(next)) {
                                continue;
                            }
                            this.focusHelper(next);
                        }
                    }
                    break;
                }
            }
            focusElement = this.bmlDocument.currentFocus && this.bmlDocument.currentFocus["node"];
            if (k == AribKeyCode.Enter && focusElement) {
                this.eventQueue.queueSyncEvent({ type: "click", target: focusElement });
            }
            // FIXME: [11] accessKeyの場合focusElementに対し決定キーのkeyupを発生させる必要がある
            return false;
        });
        this.eventQueue.processEventQueue();
    }

    public processKeyUp(k: AribKeyCode) {
        if (k === AribKeyCode.DataButton) {
            return;
        }
        const focusElement = this.bmlDocument.currentFocus && this.bmlDocument.currentFocus["node"];
        if (!focusElement) {
            return;
        }
        const computedStyle = window.getComputedStyle(this.getBody()!);
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
        const onkeyup = focusElement.getAttribute("onkeyup");
        if (onkeyup) {
            this.eventQueue.queueAsyncEvent(async () => {
                this.eventDispatcher.setCurrentIntrinsicEvent({
                    keyCode: k,
                    type: "keyup",
                    target: focusElement,
                });
                let exit = false;
                try {
                    this.eventQueue.lockSyncEventQueue();
                    if (exit = await this.eventQueue.executeEventHandler(onkeyup)) {
                        return true;
                    }
                } finally {
                    if (!exit) {
                        this.eventQueue.unlockSyncEventQueue();
                    }
                }
                this.eventDispatcher.resetCurrentEvent();
                return false;
            });
            this.eventQueue.processEventQueue();
        }
    }

    private clutToDecls(table: number[][]): css.Declaration[] {
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

    private getCLUT(clutUrl: string): css.Declaration[] {
        const res = this.resources.fetchLockedResource(clutUrl);
        let clut = defaultCLUT;
        if (res?.data) {
            clut = readCLUT(Buffer.from(res.data));
        }
        return this.clutToDecls(clut);
    }

    private async convertCSSUrl(url: string): Promise<string> {
        const res = this.resources.fetchLockedResource(url);
        if (!res) {
            return url;
        }
        // background-imageはJPEGのみ運用される (STD-B24 第二分冊(2/2) 付属2 4.4.6)
        let bt709 = res.blobUrl.get("BT.709");
        if (bt709 != null) {
            return bt709;
        }
        const bt601 = this.resources.getCachedFileBlobUrl(res);
        bt709 = await convertJPEG(bt601);
        res.blobUrl.set("BT.709", bt709);
        return bt709;
    }

    private loadObjects() {
        this.documentElement.querySelectorAll("object").forEach(obj => {
            const adata = obj.getAttribute("arib-data");
            if (adata != null) {
                BML.nodeToBMLNode(obj, this.bmlDocument).data = adata;
            }
        });
    }

    public onMessage(msg: ResponseMessage) {
        if (msg.type === "esEventUpdated") {
            const eventMessageFired = this.documentElement.querySelectorAll("beitem[type=\"EventMessageFired\"][subscribe=\"subscribe\"]");
            const activeDocument = this.resources.activeDocument;
            if (activeDocument == null) {
                return;
            }
            const { componentId: activeComponentId } = this.resources.parseURLEx(activeDocument!);
            if (activeComponentId == null) {
                return;
            }
            eventMessageFired.forEach((beitem) => {
                const es_ref = beitem.getAttribute("es_ref");
                // message_group_idは0のみ運用される
                const message_group_id = Number.parseInt(beitem.getAttribute("message_group_id") ?? "0");
                const message_id = Number.parseInt(beitem.getAttribute("message_id") ?? "255");
                const message_version = Number.parseInt(beitem.getAttribute("message_version") ?? "255");
                const onoccur = beitem.getAttribute("onoccur");
                if (!onoccur) {
                    return;
                }
                let componentId = activeComponentId;
                if (es_ref != null) {
                    const esRefComponentId = this.resources.parseURLEx(es_ref)?.componentId;
                    if (esRefComponentId != null) {
                        componentId = esRefComponentId;
                    }
                }
                for (const event of msg.events) {
                    // 即時イベントのみ実装
                    if (event.timeMode !== 0) {
                        continue;
                    }
                    const eventMessageId = event.eventMessageId >> 8;
                    const eventMessageVersion = event.eventMessageId & 0xff;
                    if (message_id === 255 || message_id === eventMessageId) {
                        if (message_version === 255 || message_version === eventMessageVersion) {
                            if ((beitem as any).__prevVersion === eventMessageVersion) {
                                continue;
                            }
                            (beitem as any).__prevVersion = eventMessageVersion;
                            const privateData = decodeEUCJP(Uint8Array.from(event.privateDataByte));
                            console.log("EventMessageFired", eventMessageId, eventMessageVersion, privateData);
                            this.eventQueue.queueAsyncEvent(async () => {
                                this.eventDispatcher.setCurrentBeventEvent({
                                    type: "EventMessageFired",
                                    target: beitem as HTMLElement,
                                    status: 0,
                                    privateData,
                                    esRef: "/" + componentId.toString(16).padStart(2, "0"),
                                    messageId: eventMessageId,
                                    messageVersion: eventMessageVersion,
                                    messageGroupId: event.eventMessageGroupId,
                                    moduleRef: "",
                                    languageTag: 0,//?
                                    registerId: 0,
                                    serviceId: 0,
                                    eventId: 0,
                                    peripheralRef: "",
                                    object: null,
                                    segmentId: null,
                                });
                                if (await this.eventQueue.executeEventHandler(onoccur)) {
                                    return true;
                                }
                                this.eventDispatcher.resetCurrentEvent();
                                return false;
                            });
                        }
                    }
                }
                this.eventQueue.processEventQueue();
            });
        }
    }

    public addDRCSFont(font: FontFace) {
        this.fonts.push(font);
        document.fonts.add(font);
    }
}
