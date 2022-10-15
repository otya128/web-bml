import { ResponseMessage } from "../server/ws_api";
import { BroadcasterDatabase } from "./broadcaster_database";
import { BrowserAPI } from "./browser";
import { Content } from "./content";
import { EventDispatcher, EventQueue } from "./event_queue";
import { BML } from "./interface/DOM";
import { Interpreter } from "./interpreter/interpreter";
import { JSInterpreter } from "./interpreter/js_interpreter";
import { NVRAM } from "./nvram";
import { Resources } from "./resource";

export interface AudioNodeProvider {
    getAudioDestinationNode(): AudioNode;
}

class DefaultAudioNodeProvider implements AudioNodeProvider {
    private audioContext: AudioContext = new AudioContext();
    public getAudioDestinationNode(): AudioNode {
        return this.audioContext.destination;
    }
    public destroy(): void {
        this.audioContext.close();
    }
}

export interface Indicator {
    // arib-dc://<..>/以降
    setUrl(name: string, loading: boolean): void;
    // テレビの下の方に出てくるデータ受信中...の表示
    setReceivingStatus(receiving: boolean): void;
    setNetworkingGetStatus(get: boolean): void;
    setNetworkingPostStatus(post: boolean): void;
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

export interface IP {
    isIPConnected?(): number;
    getConnectionType?(): number;
    transmitTextDataOverIP?(uri: string, body: Uint8Array): Promise<{ resultCode: number, statusCode: string, response: Uint8Array }>;
    get?(uri: string): Promise<{ response?: Uint8Array, headers?: Headers, statusCode?: number }>;
    confirmIPNetwork?(destination: string, isICMP: boolean, timeoutMillis: number): Promise<{ success: boolean, ipAddress: string | null, responseTimeMillis: number | null } | null>;
}

export type InputCharacterType = "all" | "number" | "alphabet" | "hankaku" | "zenkaku" | "katakana" | "hiragana";

const hankakuNumber = "0123456789";
const hankakuAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const hankakuSymbol = " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const zenkakuHiragana = "ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわをん";
const zenkakuKatakana = "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヲン";
const zenkakuNumber = "０１２３４５６７８９";
const zenkakuAlphabet = "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ";
const zenkakuSymbol = "　、。・ー―「」";

export const inputCharacters: Map<InputCharacterType, string> = new Map([
    ["number", hankakuNumber],
    ["alphabet", hankakuAlphabet + hankakuSymbol],
    ["hankaku", hankakuAlphabet + hankakuNumber + hankakuSymbol],
    ["zenkaku", zenkakuHiragana + zenkakuKatakana + zenkakuAlphabet + zenkakuNumber + zenkakuSymbol],
    ["katakana", zenkakuKatakana + zenkakuSymbol],
    ["hiragana", zenkakuHiragana + zenkakuSymbol],
]);

export type InputCancelReason = "other" | "unload" | "readonly" | "blur" | "invisible";

export type InputApplicationLaunchOptions = {
    // 入力できる文字種
    characterType: InputCharacterType,
    // 入力できる文字 undefinedならば制限はない(ただしデータ放送で扱える範囲の文字のみで半角ｶﾀｶﾅなど扱えない文字もある)
    allowedCharacters?: string,
    // 最大文字数
    maxLength: number,
    // 以前入力されていた文字
    value: string,
    inputMode: "text" | "password",
    // 複数行
    multiline: boolean,
    // 文字入力が完了した際に呼ぶコールバック
    callback: (value: string) => void,
};

/**
 * TR-B14 第二分冊 1.6 文字入力機能
 */
export interface InputApplication {
    /**
     * 文字入力アプリケーションを起動
     */
    launch(options: InputApplicationLaunchOptions): void;
    /**
     * 文字入力アプリケーションを終了
     * 起動中に文書の遷移、フォーカス移動、readonly属性の設定、invisible属性が有効になった場合など
     */
    cancel(reason: InputCancelReason): void;
}

export interface Reg {
    getReg(index: number): string | undefined;
    setReg(index: number, value: string): void;
}

export type KeyGroup = "basic" | "data-button" | "numeric-tuning" | "other-tuning"
    | "special-1" | "special-2" // Cプロファイル
    ;

export type Profile = "C" | "A" | "BS" | "CS" | "";

interface BMLBrowserEventMap {
    // 読み込まれたとき
    "load": CustomEvent<{ resolution: { width: number, height: number }, displayAspectRatio: { numerator: number, denominator: number }, profile: Profile }>;
    // invisibleが設定されているときtrue
    "invisible": CustomEvent<boolean>;
    /**
     * 動画の位置や大きさが変わった際に呼ばれるイベント
     * invisibleがtrueである場合渡される矩形に関わらず全面に表示する必要がある
     */
    "videochanged": CustomEvent<{ clientRect: { left: number, top: number, right: number, bottom: number }, boundingRect: DOMRect }>;
    "usedkeylistchanged": CustomEvent<{ usedKeyList: Set<KeyGroup> }>;
    "audiostreamchanged": CustomEvent<{ componentId: number, channelId?: number }>;
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
    /**
     * 動画像プレーンモードを有効化
     * 動画像が配置されている部分が切り抜かれるためvideochangedイベントに合わせて動画を配置する
     */
    videoPlaneModeEnabled?: boolean;
    audioNodeProvider?: AudioNodeProvider;
    ip?: IP,
    inputApplication?: InputApplication;
    ureg?: Reg;
    greg?: Reg;
    setMainAudioStreamCallback?: (componentId: number, channelId?: number) => boolean;
    X_DPA_startResidentApp?: (appName: string, showAV: number, returnURI: string, Ex_info: string[]) => number;
    /**
     * エラーメッセージを表示
     * 未指定の時は<dialog>とshowModalが使われる
     */
    showErrorMessage?: (title: string, message: string, code?: string) => void;
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
    public readonly content: Content;
    private readonly bmlDocument: BML.BMLDocument;
    private indicator?: Indicator;
    private eventTarget: BMLBrowserEventTarget = new EventTarget();
    private fonts: FontFace[] = [];
    private readonly epg: EPG;
    private readonly defaultAudioNodeProvider?: DefaultAudioNodeProvider;
    public constructor(options: BMLBrowserOptions) {
        this.containerElement = options.containerElement;
        this.mediaElement = options.mediaElement;
        this.indicator = options.indicator;
        this.shadowRoot = options.containerElement.attachShadow({ mode: "closed" });
        this.documentElement = document.createElement("html");
        if (options.tabIndex != null) {
            this.documentElement.tabIndex = options.tabIndex;
        }
        this.shadowRoot.appendChild(this.documentElement);
        let audioNodeProvider = options.audioNodeProvider;
        if (audioNodeProvider == null) {
            this.defaultAudioNodeProvider = new DefaultAudioNodeProvider();
            audioNodeProvider = this.defaultAudioNodeProvider;
        }
        this.epg = options.epg ?? {};
        this.interpreter = new JSInterpreter();
        this.eventQueue = new EventQueue(this.interpreter);
        this.resources = new Resources(this.indicator, options.ip ?? {});
        this.broadcasterDatabase = new BroadcasterDatabase(this.resources, (options.storagePrefix ?? "") + (options.broadcasterDatabasePrefix ?? ""));
        this.broadcasterDatabase.openDatabase();
        this.nvram = new NVRAM(this.resources, this.broadcasterDatabase, (options.storagePrefix ?? "") + (options.nvramPrefix ?? "nvram_"));
        this.bmlDocument = new BML.BMLDocument(this.documentElement, this.interpreter, this.eventQueue, this.resources, this.eventTarget, audioNodeProvider, options.inputApplication, options.setMainAudioStreamCallback);
        this.eventDispatcher = new EventDispatcher(this.eventQueue, this.bmlDocument, this.resources);
        this.eventQueue.dispatchBlur = this.eventDispatcher.dispatchBlur.bind(this.eventDispatcher);
        this.eventQueue.dispatchClick = this.eventDispatcher.dispatchClick.bind(this.eventDispatcher);
        this.eventQueue.dispatchFocus = this.eventDispatcher.dispatchFocus.bind(this.eventDispatcher);
        this.eventQueue.dispatchChange = this.eventDispatcher.dispatchChange.bind(this.eventDispatcher);
        this.content = new Content(
            this.bmlDocument,
            this.documentElement,
            this.resources,
            this.eventQueue,
            this.eventDispatcher,
            this.interpreter,
            this.mediaElement,
            this.eventTarget,
            this.indicator,
            options.videoPlaneModeEnabled ?? false,
            options.inputApplication,
            options.showErrorMessage
        );
        this.browserAPI = new BrowserAPI(this.resources, this.eventQueue, this.eventDispatcher, this.content, this.nvram, this.interpreter, audioNodeProvider, options.ip ?? {}, this.indicator, options.ureg, options.greg, options.X_DPA_startResidentApp);
        this.interpreter.setupEnvironment(this.browserAPI, this.resources, this.content, this.epg);
        if (options.fonts?.roundGothic) {
            this.fonts.push(new FontFace(bmlBrowserFontNames.roundGothic, options.fonts?.roundGothic.source, options.fonts?.roundGothic.descriptors));
        }
        if (options.fonts?.boldRoundGothic) {
            this.fonts.push(new FontFace(bmlBrowserFontNames.boldRoundGothic, options.fonts?.boldRoundGothic.source, options.fonts?.boldRoundGothic.descriptors));
        } else if (options.fonts?.roundGothic) {
            this.fonts.push(new FontFace(bmlBrowserFontNames.boldRoundGothic, options.fonts?.roundGothic.source, options.fonts?.roundGothic.descriptors));
        }
        if (options.fonts?.squareGothic) {
            this.fonts.push(new FontFace(bmlBrowserFontNames.squareGothic, options.fonts?.squareGothic.source, options.fonts?.squareGothic.descriptors));
        }
        for (const font of this.fonts) {
            document.fonts.add(font);
        }
    }

    public emitMessage(msg: ResponseMessage) {
        if (msg.type === "programInfo") {
            this.indicator?.setEventName(msg.eventName);
        }
        this.resources.onMessage(msg);
        this.broadcasterDatabase.onMessage(msg);
        this.browserAPI.onMessage(msg);
        this.content.onMessage(msg);
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

    public destroy(): void {
        for (const font of this.fonts) {
            document.fonts.delete(font);
        }
        this.fonts.length = 0;
        this.content.unloadAllDRCS();
        if (this.defaultAudioNodeProvider != null) {
            this.defaultAudioNodeProvider.destroy();
        }
    }

    public setMainAudioStream(componentId: number, channelId?: number): void {
        const { mainAudioComponentId: prevComponentId, mainAudioChannelId: prevChannelId } = this.resources;
        if (componentId === prevComponentId && channelId === prevChannelId) {
            return;
        }
        this.resources.mainAudioComponentId = componentId;
        this.resources.mainAudioChannelId = channelId;
        if (prevComponentId == null) {
            return;
        }
        this.eventDispatcher.dispatchMainAudioStreamChangedEvent(prevComponentId, prevChannelId, componentId, channelId);
    }
}
