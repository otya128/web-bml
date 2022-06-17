// @ts-ignore
import { BML } from "./interface/DOM";
import { Interpreter } from "./interpreter/interpreter";
import { Resources } from "./resource";

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
    messageId: number;
    messageVersion: number;
    messageGroupId: number;
    moduleRef: string;
    languageTag: number;
    registerId: number;
    serviceId: number;
    eventId: number;
    peripheralRef: string;
    object: BMLObjectElement | null;
    segmentId: string | null;
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

export type SyncChangeEvent = {
    type: "change";
    target: HTMLElement;
};

export type SyncEvent = SyncFocusEvent | SyncBlurEvent | SyncClickEvent | SyncChangeEvent;

export class EventDispatcher {
    private readonly eventQueue: EventQueue;
    private readonly bmlDocument: BML.BMLDocument;
    private readonly resources: Resources;
    public constructor(eventQueue: EventQueue, bmlDocument: BML.BMLDocument, resources: Resources) {
        this.eventQueue = eventQueue;
        this.bmlDocument = bmlDocument;
        this.resources = resources;
    }

    public setCurrentEvent(a: BMLEvent) {
        const { target: _, ...b } = a;
        const c = { target: BML.htmlElementToBMLHTMLElement(a.target, this.bmlDocument), ...b }
        this.bmlDocument._currentEvent = new BML.BMLEvent(c);
    }

    public setCurrentIntrinsicEvent(a: BMLIntrinsicEvent) {
        const { target: _, ...b } = a;
        const c = { target: BML.htmlElementToBMLHTMLElement(a.target, this.bmlDocument), ...b }
        this.bmlDocument._currentEvent = new BML.BMLIntrinsicEvent(c);
    }

    public setCurrentBeventEvent(ev: Partial<BMLBeventEvent> & BMLEvent) {
        const a: BMLBeventEvent = {
            ...{
                target: null,
                status: 0,
                privateData: "",
                esRef: "",
                messageId: 0,
                messageVersion: 0,
                messageGroupId: 0,
                moduleRef: "",
                languageTag: 0,
                registerId: 0,
                serviceId: 0,
                eventId: 0,
                peripheralRef: "",
                object: null,
                segmentId: null,
            }, ...ev
        };
        const { target: _1, object: _2, ...b } = a;
        const c = { target: BML.htmlElementToBMLHTMLElement(a.target, this.bmlDocument), object: BML.htmlElementToBMLHTMLElement(a.object, this.bmlDocument) as (BML.BMLObjectElement | null), ...b }
        this.bmlDocument._currentEvent = new BML.BMLBeventEvent(c);
    }

    public resetCurrentEvent() {
        this.bmlDocument._currentEvent = null;
    }

    public dispatchModuleLockedEvent(module: string, isEx: boolean, status: number) {
        console.log("ModuleLocked", module);
        const moduleLocked = (BML.bmlNodeToNode(this.bmlDocument.documentElement) as HTMLElement).querySelectorAll("beitem[type=\"ModuleLocked\"]");
        const { componentId, moduleId } = this.resources.parseURLEx(module);
        for (const beitem of Array.from(moduleLocked)) {
            if (beitem.getAttribute("subscribe") !== "subscribe") {
                continue;
            }
            const moduleRef = beitem.getAttribute("module_ref");
            const { componentId: refComponentId, moduleId: refModuleId } = this.resources.parseURLEx(moduleRef);
            if (componentId === refComponentId && moduleId == refModuleId) {
                const onoccur = beitem.getAttribute("onoccur");
                if (onoccur) {
                    this.eventQueue.queueAsyncEvent(async () => {
                        this.setCurrentBeventEvent({
                            type: "ModuleLocked",
                            target: beitem as HTMLElement,
                            status,
                            moduleRef: module,
                        } as BMLBeventEvent);
                        if (await this.eventQueue.executeEventHandler(onoccur)) {
                            return true;
                        }
                        this.resetCurrentEvent();
                        return false;
                    });
                    this.eventQueue.processEventQueue();
                }
            }
        }
    }

    public dispatchTimerFiredEvent(status: number, beitem: Element) {
        console.log("TimerFired", status);
        if (beitem.getAttribute("subscribe") !== "subscribe") {
            return;
        }
        const onoccur = beitem.getAttribute("onoccur");
        if (onoccur) {
            this.eventQueue.queueAsyncEvent(async () => {
                this.setCurrentBeventEvent({
                    type: "TimerFired",
                    target: beitem as HTMLElement,
                    status,
                });
                if (await this.eventQueue.executeEventHandler(onoccur)) {
                    return true;
                }
                this.resetCurrentEvent();
                return false;
            });
            this.eventQueue.processEventQueue();
        }
    }

    public dispatchDataButtonPressedEvent() {
        console.log("DataButtonPressed");
        const moduleLocked = (BML.bmlNodeToNode(this.bmlDocument.documentElement) as HTMLElement).querySelectorAll("beitem[type=\"DataButtonPressed\"]");
        for (const beitem of Array.from(moduleLocked)) {
            if (beitem.getAttribute("subscribe") !== "subscribe") {
                continue;
            }
            const onoccur = beitem.getAttribute("onoccur");
            if (onoccur) {
                this.eventQueue.queueAsyncEvent(async () => {
                    this.setCurrentBeventEvent({
                        type: "DataButtonPressed",
                        target: beitem as HTMLElement,
                        status: 0,
                    });
                    if (await this.eventQueue.executeEventHandler(onoccur)) {
                        return true;
                    }
                    this.resetCurrentEvent();
                    return false;
                });
                this.eventQueue.processEventQueue();
            }
        }
    }

    public dispatchMainAudioStreamChangedEvent(prevComponentId: number, prevChannelId: number | undefined, componentId: number, channelId: number | undefined): void {
        console.log("MainAudioStreamChanged");
        const moduleLocked = (BML.bmlNodeToNode(this.bmlDocument.documentElement) as HTMLElement).querySelectorAll("beitem[type=\"MainAudioStreamChanged\"]");
        for (const beitem of Array.from(moduleLocked)) {
            if (beitem.getAttribute("subscribe") !== "subscribe") {
                continue;
            }
            const onoccur = beitem.getAttribute("onoccur");
            if (!onoccur) {
                continue;
            }
            const es_ref = beitem.getAttribute("es_ref");
            let selected: boolean;
            if (es_ref) {
                const { componentId: refComponentId, channelId: refChannelId } = this.resources.parseAudioReference(es_ref);
                if (refComponentId == null) {
                    continue;
                }
                // チャンネルID未指定で主/副切り替えの場合イベントは発生しない
                if (refChannelId == null && prevComponentId === componentId) {
                    continue;
                }
                const unselected = refComponentId === prevComponentId && (prevChannelId ?? refChannelId) === (prevChannelId ?? null);
                selected = refComponentId === componentId && (channelId ?? refChannelId) === (channelId ?? null);
                if (!selected && !unselected) {
                    continue;
                }
            } else {   
                // 省略した場合商品企画 (TR-14)
                selected = true;
            }
            const prefix = (this.resources.isInternetContent ? "arib://-1.-1.-1/" /* ? */ : "/");
            const component = componentId.toString(16).padStart(2, "0");
            let esRef: string;
            if (channelId != null) {
                esRef = prefix + component + ";" + channelId;
            } else {
                esRef = prefix + component;
            }
            this.eventQueue.queueAsyncEvent(async () => {
                this.setCurrentBeventEvent({
                    type: "MainAudioStreamChanged",
                    target: beitem as HTMLElement,
                    esRef,
                    status: selected ? 1 : 0, // 0: 選択解除 1: 選択
                });
                if (await this.eventQueue.executeEventHandler(onoccur)) {
                    return true;
                }
                this.resetCurrentEvent();
                return false;
            });
            this.eventQueue.processEventQueue();
        }
    }

    async dispatchFocus(event: SyncFocusEvent): Promise<boolean> {
        this.setCurrentEvent({
            type: "focus",
            target: event.target,
        } as BMLEvent);
        const handler = event.target.getAttribute("onfocus");
        if (handler) {
            if (await this.eventQueue.executeEventHandler(handler)) {
                return true;
            }
        }
        this.resetCurrentEvent();
        if (event.target instanceof HTMLInputElement) {
            // TR-B14 第二分冊 1.6.1 focus割り込み事象の発生の後、直ちに文字入力アプリを起動
            if (event.target.getAttribute("inputmode") === "direct") {
                BML.nodeToBMLNode(event.target, this.bmlDocument).internalLaunchInputApplication();
            }
        }
        return false;
    }

    async dispatchBlur(event: SyncBlurEvent): Promise<boolean> {
        this.setCurrentEvent({
            type: "blur",
            target: event.target,
        } as BMLEvent);
        const handler = event.target.getAttribute("onblur");
        if (handler) {
            if (await this.eventQueue.executeEventHandler(handler)) {
                return true;
            }
        }
        this.resetCurrentEvent();
        return false;
    }

    async dispatchClick(event: SyncClickEvent): Promise<boolean> {
        this.setCurrentEvent({
            type: "click",
            target: event.target,
        } as BMLEvent);
        const handler = event.target.getAttribute("onclick");
        if (handler) {
            if (await this.eventQueue.executeEventHandler(handler)) {
                return true;
            }
        }
        this.resetCurrentEvent();
        return false;
    }

    async dispatchChange(event: SyncChangeEvent): Promise<boolean> {
        this.setCurrentEvent({
            type: "change",
            target: event.target,
        } as BMLEvent);
        const handler = event.target.getAttribute("onchange");
        if (handler) {
            if (await this.eventQueue.executeEventHandler(handler)) {
                return true;
            }
        }
        this.resetCurrentEvent();
        return false;
    }

}

type Timer = {
    handle: number | null,
    handler: TimerHandler,
    timeout: number,
};

type BMLTimerID = number;

export class EventQueue {
    private readonly interpreter: Interpreter;
    public dispatchFocus = (_event: SyncFocusEvent): Promise<boolean> => Promise.resolve(false);
    public dispatchBlur = (_event: SyncBlurEvent): Promise<boolean> => Promise.resolve(false);
    public dispatchClick = (_event: SyncClickEvent): Promise<boolean> => Promise.resolve(false);
    public dispatchChange = (_event: SyncChangeEvent): Promise<boolean> => Promise.resolve(false);

    public constructor(interpreter: Interpreter) {
        this.interpreter = interpreter;
    }

    public async executeEventHandler(handler: string): Promise<boolean> {
        if (/^\s*$/.exec(handler)) {
            return false;
        }
        const groups = /^\s*(?<funcName>[a-zA-Z_][0-9a-zA-Z_]*)\s*\(\s*\)\s*;?\s*$/.exec(handler)?.groups;
        if (!groups) {
            throw new Error("invalid event handler attribute " + handler);
        }
        console.debug("EXECUTE", handler);
        const result = await this.interpreter.runEventHandler(groups.funcName);
        console.debug("END", handler);
        return result;
    }

    private readonly timerHandles = new Map<BMLTimerID, Timer>();

    public setInterval(handler: TimerHandler, timeout: number, ...args: any[]): BMLTimerID {
        const handle = window.setInterval(handler, timeout, ...args);
        this.timerHandles.set(handle, {
            handle,
            handler,
            timeout,
        });
        return handle;
    }

    public pauseTimer(timerID: BMLTimerID): boolean {
        const timer = this.timerHandles.get(timerID);
        if (timer == null) {
            return false;
        }
        if (timer.handle != null) {
            window.clearInterval(timer.handle);
            timer.handle = null;
        }
        return true;
    }

    public resumeTimer(timerID: BMLTimerID): boolean {
        const timer = this.timerHandles.get(timerID);
        if (timer == null) {
            return false;
        }
        if (timer.handle == null) {
            timer.handle = window.setInterval(timer.handler, timer.timeout);
        }
        return true;
    }

    public clearInterval(timerID: BMLTimerID): boolean {
        const timer = this.timerHandles.get(timerID);
        if (timer == null) {
            return false;
        }
        if (timer.handle != null) {
            window.clearInterval(timer.handle);
        }
        this.timerHandles.delete(timerID);
        return true;
    }

    private asyncEventQueue: { callback: () => Promise<boolean>, local: boolean }[] = [];
    private syncEventQueue: SyncEvent[] = [];
    private syncEventQueueLockCount = 0;

    public async processEventQueue(): Promise<boolean> {
        if (this.discarded) {
            return false;
        }
        while (this.syncEventQueue.length || this.asyncEventQueue.length) {
            if (this.syncEventQueueLockCount) {
                return false;
            }
            if (this.syncEventQueue.length) {
                let exit = false;
                try {
                    this.lockSyncEventQueue();
                    const event = this.syncEventQueue.shift();
                    if (event?.type === "focus") {
                        if (exit = await this.dispatchFocus(event)) {
                            return true;
                        }
                    } else if (event?.type === "blur") {
                        if (exit = await this.dispatchBlur(event)) {
                            return true;
                        }
                    } else if (event?.type === "click") {
                        if (exit = await this.dispatchClick(event)) {
                            return true;
                        }
                    } else if (event?.type === "change") {
                        if (exit = await this.dispatchChange(event)) {
                            return true;
                        }
                    } else {
                        const _: never | undefined = event;
                    }
                } finally {
                    if (!exit) {
                        this.unlockSyncEventQueue();
                    }
                }
                continue;
            }
            if (this.asyncEventQueue.length) {
                let exit = false;
                try {
                    this.lockSyncEventQueue();
                    const event = this.asyncEventQueue.shift();
                    if (event != null) {
                        exit = await event.callback();
                        if (exit) {
                            return true;
                        }
                    }
                } finally {
                    if (!exit) {
                        this.unlockSyncEventQueue();
                    }
                }
            }
        }
        return false;
    }

    public queueSyncEvent(event: SyncEvent) {
        if (!this.discarded) {
            this.syncEventQueue.push(event);
        }
    }

    // タイマーイベントなど文書が変わったら無効になる非同期イベント
    public queueAsyncEvent(callback: () => Promise<boolean>) {
        if (!this.discarded) {
            this.asyncEventQueue.push({ callback, local: true });
        }
    }

    public queueGlobalAsyncEvent(callback: () => Promise<boolean>) {
        this.asyncEventQueue.push({ callback, local: false });
    }

    public lockSyncEventQueue() {
        this.syncEventQueueLockCount++;
    }

    public unlockSyncEventQueue() {
        this.syncEventQueueLockCount--;
        if (this.syncEventQueueLockCount < 0) {
            throw new Error("syncEventQueueLockCount < 0");
        }
    }

    private discarded = false;

    // launchDocumentが呼び出されて読み込まれるまでの間イベントキューは無効になる
    public discard() {
        this.discarded = true;
        this.clear();
    }

    private clear() {
        this.asyncEventQueue = this.asyncEventQueue.filter(x => !x.local);
        this.syncEventQueue.splice(0, this.syncEventQueue.length);
        for (const i of this.timerHandles.keys()) {
            this.clearInterval(i);
        }
    }

    public reset() {
        this.discarded = false;
        this.clear();
        this.syncEventQueueLockCount = 0;
    }
}
