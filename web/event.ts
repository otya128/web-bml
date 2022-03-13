import * as resource from "./resource";
// @ts-ignore
import { BML } from "./interface/DOM";
import { browserStatus } from "./browser";

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
const bmlDocument = BML.document;

export function setCurrentEvent(a: BMLEvent) {
    const { target: _, ...b } = a;
    const c = { target: BML.htmlElementToBMLHTMLElement(a.target), ...b }
    bmlDocument._currentEvent = new BML.BMLEvent(c);
}

export function setCurrentIntrinsicEvent(a: BMLIntrinsicEvent) {
    const { target: _, ...b } = a;
    const c = { target: BML.htmlElementToBMLHTMLElement(a.target), ...b }
    bmlDocument._currentEvent = new BML.BMLIntrinsicEvent(c);
}

export function setCurrentBeventEvent(a: BMLBeventEvent) {
    const { target: _1, object: _2, ...b } = a;
    const c = { target: BML.htmlElementToBMLHTMLElement(a.target), object: BML.htmlElementToBMLHTMLElement(a.object) as (BML.BMLObjectElement | null), ...b }
    bmlDocument._currentEvent = new BML.BMLBeventEvent(c);
}

export function resetCurrentEvent() {
    bmlDocument._currentEvent = null;
}

export async function executeEventHandler(handler: string): Promise<void> {
    if (/^\s*$/.exec(handler)) {
        return;
    }
    const groups = /^\s*(?<funcName>[a-zA-Z_][0-9a-zA-Z_]*)\s*\(\s*\)\s*;?\s*$/.exec(handler)?.groups;
    if (!groups) {
        throw new Error("invalid event handler attribute " + handler);
    }
    await browserStatus.interpreter.runEventHandler(groups.funcName);
}

const timeoutHandles = new Set<number>();
const intervalHandles = new Set<number>();
export function bmlSetTimeout(handler: TimerHandler, timeout: number, ...args: any[]): number {
    const handle = window.setTimeout(handler, timeout, ...args);
    timeoutHandles.add(handle);
    return handle;
}

export function bmlSetInterval(handler: TimerHandler, timeout: number, ...args: any[]): number {
    const handle = window.setInterval(handler, timeout, ...args);
    intervalHandles.add(handle);
    return handle;
}

export function bmlClearInterval(handle: number): void {
    window.clearInterval(handle);
    intervalHandles.delete(handle);
}

resource.registerOnModuleLockedHandler((module: string, isEx: boolean, status: number) => {
    eventQueueOnModuleLocked(module, isEx, status);
});

export function eventQueueOnModuleLocked(module: string, isEx: boolean, status: number) {
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

export function eventQueueOnModuleUpdated(module: string, status: number) {
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

export function dispatchDataButtonPressed() {
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

// 同期割り込み事象キュー
export type SyncFocusEvent = {
    type: "focus";
    target: HTMLElement;
};

export type SyncBlurEvent = {
    type: "blur";
    target: HTMLElement;
};

export type SyncClickEvent = {
    type: "click";
    target: HTMLElement;
};

export type SyncEvent = SyncFocusEvent | SyncBlurEvent | SyncClickEvent;

let asyncEventQueue: (() => Promise<void>)[] = [];
let syncEventQueue: SyncEvent[] = [];
let syncEventQueueLockCount = 0;


export async function processEventQueue(): Promise<void> {
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

export function queueSyncEvent(event: SyncEvent) {
    syncEventQueue.push(event);
}

export async function queueAsyncEvent(callback: () => Promise<void>): Promise<void> {
    asyncEventQueue.push(callback);
}

export function lockSyncEventQueue() {
    syncEventQueueLockCount++;
}

export function unlockSyncEventQueue() {
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

export function resetEventQueue() {   
    asyncEventQueue.splice(0, asyncEventQueue.length);
    syncEventQueue.splice(0, syncEventQueue.length);
    for (const i of intervalHandles.values()) {
        window.clearInterval(i);
    }
    intervalHandles.clear();
    for (const i of timeoutHandles.values()) {
        window.clearTimeout(i);
    }
    timeoutHandles.clear();
}
