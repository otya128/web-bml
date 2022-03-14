import css from "css";
import { bmlSetInterval, dispatchDataButtonPressed, eventQueueOnModuleUpdated, executeEventHandler, lockSyncEventQueue, processEventQueue, queueAsyncEvent, queueSyncEvent, resetCurrentEvent, resetEventQueue, setCurrentIntrinsicEvent, unlockSyncEventQueue } from "./event";
import { activeDocument, CachedFile, fetchLockedResource, lockCachedModule, parseURL, parseURLEx, LongJump } from "./resource";
import * as resource from "./resource";
import { browser, browserStatus } from "./browser";
// @ts-ignore
import defaultCss from "./default.css";
import { setRemoteControllerMessage } from "./remote_controller_client";
import { decodeEUCJP } from "../src/euc_jp";
import { defaultCLUT } from "../src/default_clut";
import { readCLUT } from "../src/clut";
import { transpileCSS } from "../src/transpile_css";
import { Buffer } from "buffer";
import { newContext } from "./context";
import { BML } from "./interface/DOM";
import { bmlToXHTML } from "./bml_to_xhtml";

const videoContainer = document.getElementById("arib-video-container") as HTMLDivElement;

function loadDocumentToDOM(data: string) {
    const documentElement = document.createElement("html");
    const newDocument = bmlToXHTML(data);
    // Element->HTMLElementにする手っ取り早い方法
    documentElement.innerHTML = newDocument.documentElement.innerHTML;
    const p = Array.from(document.documentElement.childNodes).filter(x => x.nodeName === "body" || x.nodeName === "head");
    const videoElementNew = documentElement.querySelector("[arib-type=\"video/X-arib-mpeg2\"]");
    // document.documentElement.append(...Array.from(newDocument.documentElement.children));
    documentElement.querySelectorAll("arib-style, arib-link").forEach(style => {
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

    documentElement.querySelectorAll("[style]").forEach(style => {
        const styleAttribute = style.getAttribute("style");
        if (!styleAttribute) {
            return;
        }
        style.setAttribute("style", transpileCSS(styleAttribute, { inline: true, href: "http://localhost" + activeDocument, clutReader: getCLUT, convertUrl: convertCSSUrl }));
    });

    document.documentElement.append(...Array.from(documentElement.children));

    if (videoElementNew != null) {
        videoElementNew.appendChild(videoContainer);
    }
    for (const n of p) {
        n.remove();
    }
}

function focusHelper(element?: HTMLElement | null) {
    if (element == null) {
        return;
    }
    const felem = BML.htmlElementToBMLHTMLElement(element);
    if (felem && (felem as any).focus) {
        (felem as any).focus();
    }
}

async function loadDocument(file: CachedFile, documentName: string): Promise<boolean> {
    // スクリプトが呼ばれているときにさらにスクリプトが呼ばれることはないがonunloadだけ例外
    browserStatus.interpreter.resetStack();
    const onunload = document.body.getAttribute("arib-onunload");
    if (onunload != null) {
        if (await executeEventHandler(onunload)) {
            // readPersistentArray writePersistentArray unlockModuleOnMemoryEx unlockAllModulesOnMemoryしか呼び出せないので終了したらおかしい
            console.error("onunload");
            return true;
        }
    }
    newContext({ from: activeDocument, to: documentName });
    resetEventQueue();
    browserStatus.interpreter.reset();
    resource.setActiveDocument(documentName);
    document.currentFocus = null;
    BML.document._currentFocus = null;
    resource.unlockAllModule();
    browserStatus.currentDateMode = 0;
    loadDocumentToDOM(decodeEUCJP(file.data));
    setRemoteControllerMessage(activeDocument + "\n" + (resource.currentProgramInfo?.eventName ?? ""));
    init();
    (document.body as any).invisible = (document.body as any).invisible;
    // フォーカスはonloadの前に当たるがonloadが実行されるまではイベントは実行されない
    // STD-B24 第二分冊(2/2) 第二編 付属1 5.1.3参照
    lockSyncEventQueue();
    let exit = false;
    try {
        focusHelper(findNavIndex(0));
        for (const x of Array.from(document.querySelectorAll("arib-script"))) {
            const src = x.getAttribute("src");
            if (src) {
                const res = fetchLockedResource(src);
                if (res !== null) {
                    if (exit = await browserStatus.interpreter.addScript(decodeEUCJP(res.data), src ?? undefined)) {
                        return true;
                    }
                }
            } else if (x.textContent != null) {
                if (exit = await browserStatus.interpreter.addScript(x.textContent, activeDocument ?? "")) {
                    return true;
                }
            }
        }
        const onload = document.body.getAttribute("arib-onload");
        if (onload != null) {
            console.debug("START ONLOAD");
            if (exit = await executeEventHandler(onload)) {
                return true;
            }
            console.debug("END ONLOAD");
        }
    }
    finally {
        if (!exit) {
            unlockSyncEventQueue();
        }
    }
    console.debug("START PROC EVQ");
    if (await processEventQueue()) {
        return true;
    }
    console.debug("END PROC EVQ");
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
    return false;
}

export function launchDocument(documentName: string) {
    const { component, module, filename } = parseURL(documentName);
    const componentId = Number.parseInt(component ?? "", 16);
    const moduleId = Number.parseInt(module ?? "", 16);
    if (!Number.isInteger(componentId) || !Number.isInteger(moduleId)) {
        return NaN;
    }
    if (!lockCachedModule(componentId, moduleId, "system")) {
        resource.fetchResourceAsync(documentName).then((res) => {
            if (res == null) {
                console.error("document", documentName, "not found");
                return;
            }
            launchDocument(documentName);
        });
        return NaN;
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
    return NaN;
}

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

export function findNavIndex(navIndex: number): HTMLElement | undefined {
    return Array.from(document.querySelectorAll("*")).find(elem => {
        return parseInt(window.getComputedStyle(elem).getPropertyValue("--nav-index")) == navIndex;
    }) as (HTMLElement | undefined);
}

export function processKeyDown(k: AribKeyCode) {
    if (k === AribKeyCode.DataButton) {
        // データボタンの場合DataButtonPressedのみが発生する
        try {
            dispatchDataButtonPressed();
        } catch (e) {
            if (e instanceof LongJump) {
                console.log("long jump");
            } else {
                throw e;
            }
        }
        return;
    }
    let focusElement = BML.document.currentFocus && BML.document.currentFocus["node"];
    if (!focusElement) {
        return;
    }
    const computedStyle = window.getComputedStyle(focusElement);
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
                focusHelper(next);
            }
        }
        break;
    }
    focusElement = BML.document.currentFocus && BML.document.currentFocus["node"];
    if (!focusElement) {
        return;
    }
    const onkeydown = focusElement.getAttribute("onkeydown");
    if (onkeydown) {
        queueAsyncEvent(async () => {
            setCurrentIntrinsicEvent({
                keyCode: k as number,
                type: "keydown",
                target: focusElement,
            });
            let exit = false;
            try {
                lockSyncEventQueue();
                if (exit = await executeEventHandler(onkeydown)) {
                    return true;
                }
            } finally {
                if (!exit) {
                    unlockSyncEventQueue();
                }
            }
            resetCurrentEvent();
            if (k == AribKeyCode.Enter && BML.document.currentFocus && BML.document.currentFocus["node"]) {
                queueSyncEvent({ type: "click", target: BML.document.currentFocus["node"] });
            }
            return false;
        });
        processEventQueue();
    }
}

export function processKeyUp(k: AribKeyCode) {
    if (k === AribKeyCode.DataButton) {
        return;
    }
    const focusElement = BML.document.currentFocus && BML.document.currentFocus["node"];
    if (!focusElement) {
        return;
    }
    const computedStyle = window.getComputedStyle(focusElement);
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
        queueAsyncEvent(async () => {
            setCurrentIntrinsicEvent({
                keyCode: k,
                type: "keyup",
                target: focusElement,
            });
            let exit = false;
            try {
                lockSyncEventQueue();
                if (exit = await executeEventHandler(onkeyup)) {
                    return true;
                }
            } finally {
                if (!exit) {
                    unlockSyncEventQueue();
                }
            }
            resetCurrentEvent();
            return false;
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

function init() {
    //observer.observe(document.body, config);
    document.querySelectorAll("object").forEach(obj => {
        const adata = obj.getAttribute("arib-data");
        if (adata != null) {
            obj.data = adata;
            reloadObjectElement(obj);
        }
    });
}
