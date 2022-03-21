import { ResponseMessage } from "../server/ws_api";
import { BroadcasterDatabase } from "./broadcaster_database";
import { BrowserAPI } from "./browser";
import { BMLDocument } from "./document";
import { EventDispatcher, EventQueue } from "./event";
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
    setEventName(eventName: string): void;
}
export class BMLBrowser {
    private containerElement: HTMLElement;
    private shadowRoot: ShadowRoot;
    private documentElement: HTMLElement;
    private interpreter: Interpreter;
    private nvram: NVRAM;
    private browserAPI: BrowserAPI;
    private mediaElement: HTMLElement;
    private resources: Resources;
    private eventQueue: EventQueue;
    private eventDispatcher: EventDispatcher;
    private broadcasterDatabase: BroadcasterDatabase;
    private bmlDocument: BMLDocument;
    private bmlDomDocument: BML.BMLDocument;
    private indicator?: Indicator;
    public constructor(containerElement: HTMLElement, mediaElement: HTMLElement, indicator?: Indicator) {
        this.containerElement = containerElement;
        this.mediaElement = mediaElement;
        this.indicator = indicator;
        this.shadowRoot = containerElement.attachShadow({ mode: "closed" });
        const uaStyle = document.createElement("style");
        uaStyle.textContent = defaultCSS;
        this.shadowRoot.appendChild(uaStyle);
        this.documentElement = document.createElement("html");
        this.shadowRoot.appendChild(this.documentElement);
        this.documentElement.appendChild(mediaElement);
        this.resources = new Resources();
        this.broadcasterDatabase = new BroadcasterDatabase(this.resources);
        this.broadcasterDatabase.openDatabase();
        this.nvram = new NVRAM(this.resources, this.broadcasterDatabase);
        this.interpreter = new JSInterpreter();
        this.eventQueue = new EventQueue(this.resources, this.interpreter);
        this.bmlDomDocument = new BML.BMLDocument(this.documentElement, this.interpreter, this.eventQueue, this.resources);
        this.eventDispatcher = new EventDispatcher(this.resources, this.eventQueue, this.bmlDomDocument);
        this.bmlDocument = new BMLDocument(this.bmlDomDocument, this.documentElement, this.resources, this.eventQueue, this.eventDispatcher, this.interpreter, this.mediaElement, this.indicator);
        this.browserAPI = new BrowserAPI(this.resources, this.eventQueue, this.eventDispatcher, this.bmlDocument, this.nvram, this.interpreter);

        this.eventQueue.dispatchBlur = this.eventDispatcher.dispatchBlur.bind(this.eventDispatcher);
        this.eventQueue.dispatchClick = this.eventDispatcher.dispatchClick.bind(this.eventDispatcher);
        this.eventQueue.dispatchFocus = this.eventDispatcher.dispatchFocus.bind(this.eventDispatcher);
        this.interpreter.setupEnvironment(this.browserAPI.browser, this.resources, this.bmlDocument);
    }
    // スタートアップ文書を表示させる
    public async launchStartupDocument(): Promise<void> {
        await this.resources.fetchResourceAsync("/40/0000");
        if (this.resources.fetchLockedResource("/40/0000/startup.bml")) {
            this.bmlDocument.launchDocument("/40/0000/startup.bml");
        } else {
            this.bmlDocument.launchDocument("/40/0000");
        }
    }
    // そのうちID3とかにできればよさそう

    public onMessage(msg: ResponseMessage) {
        this.resources.onMessage(msg);
        this.broadcasterDatabase.onMessage(msg);
        this.browserAPI.onMessage(msg);
        this.bmlDocument.onMessage(msg);
    }
}