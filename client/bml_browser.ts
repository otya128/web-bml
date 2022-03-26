import { ResponseMessage } from "../server/ws_api";
import { BroadcasterDatabase } from "./broadcaster_database";
import { BrowserAPI } from "./browser";
import { BMLDocument } from "./document";
import { EventDispatcher, EventQueue } from "./event_queue";
import { BML } from "./interface/DOM";
import { Interpreter } from "./interpreter/interpreter";
import { JSInterpreter } from "./interpreter/js_interpreter";
import { NVRAM } from "./nvram";
import { Resources } from "./resource";
// @ts-ignore
import defaultCSS from "../public/default.css";

export interface Indicator {
    // arib-dc://<..>/以降
    setUrl(name: string, loading: boolean): void;
    // テレビの下の方に出てくるデータ受信中...の表示
    setReceivingStatus(receiving: boolean): void;
    // 番組名
    setEventName(eventName: string | null): void;
}

export interface EPG {
    // 指定されたサービスを選局する
    // true: 成功, false: 失敗, never: ページ遷移などで帰らない
    tune?(originalNetworkId: number, transportStreamId: number, serviceId: number): boolean | never;
    // 指定されたサービスを選局して指定されたコンポーネントを表示する
    tuneToComponent?(originalNetworkId: number, transportStreamId: number, serviceId: number, component: string): boolean | never;
}

interface BMLBrowserEventMap {
    // 読み込まれたとき
    "load": CustomEvent<{ resolution: { width: number, height: number } }>;
    // invisibleが設定されているときtrue
    "invisible": CustomEvent<boolean>;
}

interface CustomEventTarget<M> {
    addEventListener<K extends keyof M>(type: K, callback: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void;
    dispatchEvent<K extends keyof M>(event: M[K]): boolean;
    removeEventListener<K extends keyof M>(type: K, callback: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean): void;
}

export type BMLBrowserEventTarget = CustomEventTarget<BMLBrowserEventMap>;

/* STD-B24 第二分冊(2/2) 第二編 付属2 4.4.8 */
export type BMLBrowserFontFace = { source: string | BinaryData, descriptors?: FontFaceDescriptors | undefined };
export type BMLBrowserFonts = {
    roundGothic?: BMLBrowserFontFace;
    boldRoundGothic?: BMLBrowserFontFace;
    squareGothic?: BMLBrowserFontFace;
};

export const bmlBrowserFontNames = Object.freeze({
    roundGothic: "丸ゴシック",
    boldRoundGothic: "太丸ゴシック",
    squareGothic: "角ゴシック",
});

export type BMLBrowserOptions = {
    // 親要素
    containerElement: HTMLElement;
    // 動画の要素
    mediaElement: HTMLElement;
    // 番組名などを表示
    indicator?: Indicator;
    fonts?: BMLBrowserFonts;
    // localStorageのprefix (default: "")
    storagePrefix?: string;
    // nvramのprefix (default: "nvram_")
    nvramPrefix?: string;
    // 放送者ID DBのprefix (default: "")
    broadcasterDatabasePrefix?: string;
    // フォーカスを受け付けキー入力を受け取る
    tabIndex?: number;
    epg?: EPG;
};

export class BMLBrowser {
    private containerElement: HTMLElement;
    private shadowRoot: ShadowRoot;
    private documentElement: HTMLElement;
    private interpreter: Interpreter;
    public readonly nvram: NVRAM;
    public readonly browserAPI: BrowserAPI;
    private mediaElement: HTMLElement;
    private resources: Resources;
    private eventQueue: EventQueue;
    private eventDispatcher: EventDispatcher;
    public readonly broadcasterDatabase: BroadcasterDatabase;
    public readonly bmlDocument: BMLDocument;
    private bmlDomDocument: BML.BMLDocument;
    private indicator?: Indicator;
    private eventTarget = new EventTarget() as BMLBrowserEventTarget;
    private fonts: FontFace[] = [];
    private readonly epg: EPG;
    public constructor(options: BMLBrowserOptions) {
        this.containerElement = options.containerElement;
        this.mediaElement = options.mediaElement;
        this.indicator = options.indicator;
        this.shadowRoot = options.containerElement.attachShadow({ mode: "closed" });
        const uaStyle = document.createElement("style");
        uaStyle.textContent = defaultCSS;
        this.shadowRoot.appendChild(uaStyle);
        this.documentElement = document.createElement("html");
        if (options.tabIndex != null) {
            this.documentElement.tabIndex = options.tabIndex;
        }
        this.shadowRoot.appendChild(this.documentElement);
        this.resources = new Resources(this.indicator);
        this.broadcasterDatabase = new BroadcasterDatabase(this.resources);
        this.broadcasterDatabase.openDatabase();
        this.nvram = new NVRAM(this.resources, this.broadcasterDatabase, options.nvramPrefix);
        this.epg = options.epg ?? {};
        this.interpreter = new JSInterpreter();
        this.eventQueue = new EventQueue(this.interpreter);
        this.bmlDomDocument = new BML.BMLDocument(this.documentElement, this.interpreter, this.eventQueue, this.resources, this.eventTarget);
        this.eventDispatcher = new EventDispatcher(this.eventQueue, this.bmlDomDocument, this.resources);
        this.bmlDocument = new BMLDocument(this.bmlDomDocument, this.documentElement, this.resources, this.eventQueue, this.eventDispatcher, this.interpreter, this.mediaElement, this.eventTarget, this.indicator);
        this.browserAPI = new BrowserAPI(this.resources, this.eventQueue, this.eventDispatcher, this.bmlDocument, this.nvram, this.interpreter);

        this.eventQueue.dispatchBlur = this.eventDispatcher.dispatchBlur.bind(this.eventDispatcher);
        this.eventQueue.dispatchClick = this.eventDispatcher.dispatchClick.bind(this.eventDispatcher);
        this.eventQueue.dispatchFocus = this.eventDispatcher.dispatchFocus.bind(this.eventDispatcher);
        this.interpreter.setupEnvironment(this.browserAPI.browser, this.resources, this.bmlDocument, this.epg);
        if (options.fonts?.roundGothic) {
            this.fonts.push(new FontFace(bmlBrowserFontNames.roundGothic, options.fonts?.roundGothic.source, options.fonts?.roundGothic.descriptors));
        }
        if (options.fonts?.boldRoundGothic) {
            this.fonts.push(new FontFace(bmlBrowserFontNames.boldRoundGothic, options.fonts?.boldRoundGothic.source, options.fonts?.boldRoundGothic.descriptors));
        }
        if (options.fonts?.squareGothic) {
            this.fonts.push(new FontFace(bmlBrowserFontNames.squareGothic, options.fonts?.squareGothic.source, options.fonts?.squareGothic.descriptors));
        }
        for (const font of this.fonts) {
            document.fonts.add(font);
        }
    }
    // スタートアップ文書を表示させる
    public async launchStartupDocument(): Promise<void> {
        await this.resources.getProgramInfoAsync();
        await this.resources.fetchResourceAsync("/40/0000");
        if (this.resources.fetchLockedResource("/40/0000/startup.bml")) {
            this.bmlDocument.launchDocument("/40/0000/startup.bml");
        } else if (this.resources.fetchLockedResource("/40/0000")) {
            this.bmlDocument.launchDocument("/40/0000");
        } else {
        }
    }

    public emitMessage(msg: ResponseMessage) {
        if (msg.type === "programInfo") {
            this.indicator?.setEventName(msg.eventName);
        }
        this.resources.onMessage(msg);
        this.broadcasterDatabase.onMessage(msg);
        this.browserAPI.onMessage(msg);
        this.bmlDocument.onMessage(msg);
    }

    public addEventListener<K extends keyof BMLBrowserEventMap>(type: K, callback: (this: undefined, evt: BMLBrowserEventMap[K]) => void, options?: AddEventListenerOptions | boolean) {
        this.eventTarget.addEventListener(type, callback as EventListener, options);
    }

    public removeEventListener<K extends keyof BMLBrowserEventMap>(type: K, callback: (this: undefined, evt: BMLBrowserEventMap[K]) => void, options?: AddEventListenerOptions | boolean) {
        this.eventTarget.removeEventListener(type, callback as EventListener, options);
    }

    public getVideoElement(): HTMLElement | null {
        return this.documentElement.querySelector("object[arib-type=\"video/X-arib-mpeg2\"]");
    }

    public destroy() {
        for (const font of this.fonts) {
            document.fonts.delete(font);
        }
        this.fonts.length = 0;
        this.bmlDocument.unloadAllDRCS();
    }
}
