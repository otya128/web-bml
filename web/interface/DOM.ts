import { BMLCSS2Properties } from "./BMLCSS2Properties";
export namespace BML {
    type DOMString = string;

    export function nodeToBMLNode(node: globalThis.Node | null): Node | null {
        return node == null ? null : wrapNodeNonNull(node);
    }

    export function htmlElementToBMLHTMLElement(node: globalThis.HTMLElement | null): HTMLElement | null {
        if (node == null) {
            return null;
        }
        const result = wrapNodeNonNull(node);
        if (!(result instanceof HTMLElement)) {
            throw new TypeError("failed to cast to BML.HTMLElement");
        }
        return result;
    }

    function wrapNode(node: globalThis.Node | null): Node | null {
        return node == null ? null : wrapNodeNonNull(node);
    }

    function wrapNodeNonNull(node: globalThis.Node): Node {
        const a: any = node;
        const klass = getNodeClass(node);
        if (a.__klass) {
            if (a.__klass !== klass) {
                console.error("??", a);
            } else {
                return a.__bmlInstance;
            }
        }
        a.__klass = klass;
        const inst = new klass(node);
        a.__bmlInstance = inst;
        return inst;
    }

    function getNodeClass(node: globalThis.Node): typeof Node {
        if (node instanceof globalThis.HTMLInputElement) {
            return BMLInputElement;
        } else if (node instanceof globalThis.HTMLBRElement) {
            return BMLBRElement;
        } else if (node instanceof globalThis.HTMLAnchorElement) {
            return BMLAnchorElement;
        } else if (node instanceof globalThis.HTMLHtmlElement) {
            return BMLBmlElement;
        } else if (node instanceof globalThis.HTMLScriptElement) {
            return HTMLScriptElement;
        } else if (node instanceof globalThis.HTMLObjectElement) {
            return BMLObjectElement;
        } else if (node instanceof globalThis.HTMLHeadElement) {
            return HTMLHeadElement;
        } else if (node instanceof globalThis.HTMLInputElement) {
            return BMLInputElement;
        } else if (node instanceof globalThis.HTMLTitleElement) {
            return HTMLTitleElement;
        } else if (node instanceof globalThis.HTMLSpanElement) {
            return BMLSpanElement;
        } else if (node instanceof globalThis.HTMLMetaElement) {
            return HTMLMetaElement;
        } else if (node instanceof globalThis.HTMLStyleElement) {
            return HTMLStyleElement;
        } else if (node instanceof globalThis.HTMLElement && node.nodeName === "bevent") {
            return BMLBeventElement;
        } else if (node instanceof globalThis.HTMLElement && node.nodeName === "beitem") {
            return BMLBeitemElement;
        } else if (node instanceof globalThis.HTMLBodyElement) {
            return BMLBodyElement;
        } else if (node instanceof globalThis.HTMLParagraphElement) {
            return BMLParagraphElement;
        } else if (node instanceof globalThis.HTMLDivElement) {
            return BMLDivElement;
        } else if (node instanceof globalThis.HTMLHtmlElement) {
            return BMLBmlElement;
        } else if (node instanceof globalThis.HTMLElement) {
            console.error(node);
            return HTMLElement;
        } else if (node instanceof globalThis.Element) {
            console.error(node);
            return Element;
        } else if (node instanceof globalThis.CDATASection) {
            return CDATASection;
        } else if (node instanceof globalThis.Text) {
            console.error(node);
            return Text;
            // CharcterDataは誤植
        } else if (node instanceof globalThis.CharacterData) {
            console.error(node);
            return CharacterData;
        } else if (node instanceof globalThis.HTMLDocument) {
            return BMLDocument;
        } else if (node instanceof globalThis.Document) {
            console.error(node);
            return BMLDocument;
        } else if (node instanceof globalThis.Node) {
            console.error(node);
            return Node;
        }
        return Node;
    }
    function getNormalStyle(node: globalThis.HTMLElement): BMLCSS2Properties {
        return new BMLCSS2Properties(window.getComputedStyle(node), node.style);
    }
    function getFocusStyle(node: globalThis.HTMLElement): BMLCSS2Properties {
        console.error("focusStyle is not implemented");
        return new BMLCSS2Properties(window.getComputedStyle(node), node.style);
    }
    function getActiveStyle(node: globalThis.HTMLElement): BMLCSS2Properties {
        console.error("activeStyle is not implemented");
        return new BMLCSS2Properties(window.getComputedStyle(node), node.style);
    }
    function focus(node: HTMLElement) {
    }
    function blur(node: HTMLElement) {

    }
    // impl
    export class Node {
        protected node: globalThis.Node;
        constructor(node: globalThis.Node) {
            this.node = node;
        }
        public get parentNode(): Node | null {
            return wrapNode(this.node.parentNode);
        }
        public get firstChild(): Node | null {
            return wrapNode(this.node.firstChild);
        }
        public get lastChild(): Node | null {
            return wrapNode(this.node.lastChild);
        }
        public get previousSibling(): Node | null {
            return wrapNode(this.node.previousSibling);
        }
        get nextSibling(): Node | null {
            return wrapNode(this.node.nextSibling);
        }
    }

    // impl
    export class CharacterData extends Node {
        protected node: globalThis.CharacterData;
        constructor(node: globalThis.CharacterData) {
            super(node);
            this.node = node;
        }
        public get data(): string {
            return this.node.data;
        }
        public set data(value: string) {
            this.node.data = value;
        }
        public get length(): number {
            return this.node.length;
        }
    }

    // impl
    export class Text extends CharacterData {

    }

    // impl
    export class CDATASection extends Text {

    }

    // impl
    export class Document extends Node {
        protected node: globalThis.Document;
        protected _implementation: DOMImplementation;
        constructor(node: globalThis.Document) {
            super(node);
            this.node = node;
            this._implementation = new DOMImplementation();
        }
        public get implementation(): DOMImplementation {
            return this._implementation;
        }
        public get documentElement(): HTMLElement {
            return wrapNodeNonNull(this.node.documentElement) as HTMLElement;
        }
    }


    // impl
    export abstract class HTMLDocument extends Document {
        protected node: globalThis.HTMLDocument;
        constructor(node: globalThis.HTMLDocument) {
            super(node);
            this.node = node;
        }
        public getElementById(id: string): HTMLElement | null {
            return wrapNode(this.node.getElementById(id)) as (HTMLElement | null);
        }
    }

    // impl
    export class BMLDocument extends HTMLDocument {
        _currentFocus: HTMLElement | null = null;
        _currentEvent: BMLEvent | null = null;

        public get currentFocus(): HTMLElement | null {
            return this._currentFocus;
        }
        public get currentEvent(): BMLEvent | null {
            return this._currentEvent;
        }
    }

    // impl
    export class Element extends Node {
        protected node: globalThis.Element;
        constructor(node: globalThis.Element) {
            super(node);
            this.node = node;
        }
        public get tagName(): string {
            return this.node.tagName;
        }
    }

    // impl
    export class HTMLElement extends Element {
        protected node: globalThis.HTMLElement;
        constructor(node: globalThis.HTMLElement) {
            super(node);
            this.node = node;
        }
        public get id(): string {
            return this.node.id;
        }
        public get className(): string {
            return this.node.className;
        }
    }

    // impl
    export class HTMLBRElement extends HTMLElement {

    }

    // impl
    export class BMLBRElement extends HTMLBRElement {
        public get normalStyle(): BMLCSS2Properties {
            return getNormalStyle(this.node);
        }
    }

    // impl
    export class HTMLHtmlElement extends HTMLElement {

    }

    // impl
    export class BMLBmlElement extends HTMLHtmlElement {

    }

    // impl
    export class HTMLAnchorElement extends HTMLElement {
        protected node: globalThis.HTMLAnchorElement;
        constructor(node: globalThis.HTMLAnchorElement) {
            super(node);
            this.node = node;
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        public get href(): string {
            return this.node.href;
        }
        public set href(value: string) {
            this.node.href = value;
        }
    }

    // impl
    export class BMLAnchorElement extends HTMLAnchorElement {
        public get normalStyle(): BMLCSS2Properties {
            return getNormalStyle(this.node);
        }
        public get focusStyle(): BMLCSS2Properties {
            return getFocusStyle(this.node);
        }
        public get activeStyle(): BMLCSS2Properties {
            return getActiveStyle(this.node);
        }
    }

    // impl
    export class HTMLInputElement extends HTMLElement {
        protected node: globalThis.HTMLInputElement;
        constructor(node: globalThis.HTMLInputElement) {
            super(node);
            this.node = node;
        }
        public get defaultValue(): string {
            return this.node.defaultValue;
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        public get disabled(): boolean {
            return this.node.disabled;
        }
        public set disabled(value: boolean) {
            this.node.disabled = value;
        }
        public get maxLength(): number {
            return this.node.maxLength;
        }
        public get readOnly(): boolean {
            return this.node.readOnly;
        }
        public set readOnly(value: boolean) {
            this.node.readOnly = value;
        }
        public get type(): string {
            return this.node.type;
        }
        public get value(): string {
            return this.node.value;
        }
        public set value(value: string) {
            this.node.value = value;
        }
        public blur(): void {
            blur(this);
        }
        public focus(): void {
            focus(this);
        }
    }

    // impl
    export class BMLInputElement extends HTMLInputElement {
        public get normalStyle(): BMLCSS2Properties {
            return getNormalStyle(this.node);
        }
        public get focusStyle(): BMLCSS2Properties {
            return getFocusStyle(this.node);
        }
        public get activeStyle(): BMLCSS2Properties {
            return getActiveStyle(this.node);
        }
    }

    // impl
    export class HTMLObjectElement extends HTMLElement {
        protected node: globalThis.HTMLObjectElement;
        constructor(node: globalThis.HTMLObjectElement) {
            super(node);
            this.node = node;
        }
        public get data(): string {
            return this.node.data;
        }
        public set data(value: string) {
            this.node.data = value;
        }
        public get type(): string {
            return this.node.type;
        }
    }

    // impl
    export class BMLObjectElement extends HTMLObjectElement {
        public get normalStyle(): BMLCSS2Properties {
            return getNormalStyle(this.node);
        }
        public get focusStyle(): BMLCSS2Properties {
            return getFocusStyle(this.node);
        }
        public get activeStyle(): BMLCSS2Properties {
            return getActiveStyle(this.node);
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        // 同じidであれば遷移時にも状態を保持する
        public get remain(): boolean {
            return this.node.getAttribute("remain") === "remain";
        }
        public set remain(value: boolean) {
            if (value) {
                this.node.setAttribute("remain", "remain");
            } else {
                this.node.removeAttribute("remain");
            }
        }
        public get streamPosition(): number {
            throw new Error("BMLObjectElement.streamPosition");
        }
        public set streamPosition(value: number) {
            throw new Error("BMLObjectElement.streamPosition");
        }
        public get streamStatus(): DOMString {
            return this.node.getAttribute("streamstatus") ?? ""; // "stop" | "play" | "pause"
        }
        public set streamStatus(value: DOMString) {
            this.node.setAttribute("streamstatus", value);
        }
        public setMainAudioStream(autdio_ref: DOMString): boolean {
            throw new Error("BMLObjectElement.setMainAudioStream()");
        }
        public getMainAudioStream(): DOMString {
            throw new Error("BMLObjectElement.getMainAudioStream()");
        }
        public blur(): void {
            blur(this);
        }
        public focus(): void {
            focus(this);
        }
    }

    // impl
    export class BMLSpanElement extends HTMLElement {
        public get normalStyle(): BMLCSS2Properties {
            return getNormalStyle(this.node);
        }
        public get focusStyle(): BMLCSS2Properties {
            return getFocusStyle(this.node);
        }
        public get activeStyle(): BMLCSS2Properties {
            return getActiveStyle(this.node);
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        public blur(): void {
            blur(this);
        }
        public focus(): void {
            focus(this);
        }
    }

    // impl
    export class HTMLBodyElement extends HTMLElement {

    }

    // impl
    export class BMLBodyElement extends HTMLBodyElement {
        public get invisible(): boolean {
            return this.node.getAttribute("invisible") === "invisible";
        }
        public set invisible(v: boolean) {
            (this.node as any).invisible = v;
        }
        public get normalStyle(): BMLCSS2Properties {
            return getNormalStyle(this.node);
        }
    }

    // impl
    export class HTMLDivElement extends HTMLElement {

    }

    // impl
    export class BMLDivElement extends HTMLDivElement {
        public get normalStyle(): BMLCSS2Properties {
            return getNormalStyle(this.node);
        }
        public get focusStyle(): BMLCSS2Properties {
            return getFocusStyle(this.node);
        }
        public get activeStyle(): BMLCSS2Properties {
            return getActiveStyle(this.node);
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        public blur(): void {
            blur(this);
        }
        public focus(): void {
            focus(this);
        }
    }

    // impl
    export class HTMLParagraphElement extends HTMLElement {

    }

    // impl
    export class BMLParagraphElement extends HTMLParagraphElement {
        public get normalStyle(): BMLCSS2Properties {
            return getNormalStyle(this.node);
        }
        public get focusStyle(): BMLCSS2Properties {
            return getFocusStyle(this.node);
        }
        public get activeStyle(): BMLCSS2Properties {
            return getActiveStyle(this.node);
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        public blur(): void {
            blur(this);
        }
        public focus(): void {
            focus(this);
        }
    }

    // impl
    export class HTMLMetaElement extends HTMLElement {
        protected node: globalThis.HTMLMetaElement;
        constructor(node: globalThis.HTMLMetaElement) {
            super(node);
            this.node = node;
        }
        public get content(): string {
            return this.node.content;
        }
        public get name(): string {
            return this.node.name;
        }
    }

    // impl
    export class HTMLTitleElement extends HTMLElement {
        protected node: globalThis.HTMLTitleElement;
        constructor(node: globalThis.HTMLTitleElement) {
            super(node);
            this.node = node;
        }
        public get text(): string {
            return this.node.text;
        }
    }

    // impl
    export class HTMLScriptElement extends HTMLElement {

    }

    // impl
    export class HTMLStyleElement extends HTMLElement {

    }

    // impl
    export class HTMLHeadElement extends HTMLElement {

    }

    // impl
    export class BMLBeventElement extends HTMLElement {
    }

    function attrToNumber(attr: string | null): number | null {
        const n = Number.parseInt(attr ?? "");
        if (Number.isNaN(n)) {
            return null;
        }
        return n;
    }

    // impl
    export class BMLBeitemElement extends HTMLElement {
        public get type(): DOMString {
            return this.node.getAttribute("type") ?? "";
        }
        public get esRef(): DOMString {
            return this.node.getAttribute("es_ref") ?? "";
        }
        public set esRef(value: DOMString) {
            this.node.setAttribute("es_ref", value);
        }
        public get messageId(): number {
            return attrToNumber(this.node.getAttribute("message_id")) ?? 0;
        }
        public set messageId(value: number) {
            this.node.setAttribute("message_id", String(value));
        }
        public get messageVersion(): number {
            return attrToNumber(this.node.getAttribute("message_version")) ?? 0;
        }
        public set messageVersion(value: number) {
            this.node.setAttribute("message_version", String(value));
        }
        public get messageGroupId(): number {
            return attrToNumber(this.node.getAttribute("message_group_id")) ?? 0;
        }
        // public set messageGroupId(value: number) {
        //     this.node.setAttribute("message_group_id", String(value));
        // }
        public get moduleRef(): DOMString {
            return this.node.getAttribute("module_ref") ?? "";
        }
        public set moduleRef(value: DOMString) {
            this.node.setAttribute("module_ref", value);
        }
        public get languageTag(): number {
            return attrToNumber(this.node.getAttribute("language_tag")) ?? 0;
        }
        public set languageTag(value: number) {
            this.node.setAttribute("language_tag", String(value));
        }
        /*
        public get registerId(): number {
            return attrToNumber(this.node.getAttribute("register_id")) ?? 0;
        }
        public set registerId(value: number) {
            this.node.setAttribute("register_id", String(value));
        }
        public get serviceId(): number {
            return attrToNumber(this.node.getAttribute("service_id")) ?? 0;
        }
        public set serviceId(value: number) {
            this.node.setAttribute("service_id", String(value));
        }
        public get eventId(): number {
            return attrToNumber(this.node.getAttribute("event_id")) ?? 0;
        }
        public set eventId(value: number) {
            this.node.setAttribute("event_id", String(value));
        }*/
        public get peripheralRef(): DOMString {
            return this.node.getAttribute("peripheral_ref") ?? "";
        }
        public set peripheralRef(value: DOMString) {
            this.node.setAttribute("peripheral_ref", value);
        }
        public get timeMode() {
            return this.node.getAttribute("time_mode") ?? "";
        }
        // public set timeMode(value: DOMString) {
        //     this.node.setAttribute("time_mode", value);
        // }
        public get timeValue() {
            return this.node.getAttribute("time_value") ?? "";
        }
        public set timeValue(value: DOMString) {
            this.node.setAttribute("time_value", value);
        }
        public get objectId() {
            return this.node.getAttribute("object_id") ?? "";
        }
        public set objectId(value: DOMString) {
            this.node.setAttribute("object_id", value);
        }
        public get segmentId(): DOMString {
            return this.node.getAttribute("segment_id") ?? "";
        }
        public set segmentId(value: DOMString) {
            this.node.setAttribute("segment_id", value);
        }
        public get subscribe(): boolean {
            return this.node.getAttribute("subscribe") === "subscribe";
        }
        public set subscribe(value: boolean) {
            if (value) {
                this.node.setAttribute("subscribe", "subscribe");
            } else {
                this.node.removeAttribute("subscribe");
            }
        }
    }

    interface BMLEventData {
        type: string;
        target: HTMLElement | null;
    }


    interface BMLIntrinsicEventData extends BMLEventData {
        keyCode: number;
    }

    interface BMLBeventEventData extends BMLEventData {
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

    // impl
    export class BMLEvent {
        protected _data: BMLEventData;
        constructor(data: BMLEventData) {
            this._data = { ...data };
        }
        public get type(): DOMString { return this._data.type; }
        public get target(): HTMLElement | null { return this._data.target; }
    }

    // impl
    export class BMLIntrinsicEvent extends BMLEvent {
        protected _keyCode: number;
        constructor(data: BMLIntrinsicEventData) {
            super(data);
            this._keyCode = data.keyCode;
        }
        public get keyCode(): number { return this._keyCode; }
    }

    // impl
    export class BMLBeventEvent extends BMLEvent {
        protected _data: BMLBeventEventData;
        constructor(data: BMLBeventEventData) {
            super(data);
            this._data = data;
        }
        public get status(): number { return this._data.status; }
        public get privateData(): string { return this._data.privateData; }
        public get esRef(): string { return this._data.esRef; }
        public get messageId(): string { return this._data.messageId; }
        public get messageVersion(): string { return this._data.messageVersion; }
        public get messageGroupId(): string { return this._data.messageGroupId; }
        public get moduleRef(): string { return this._data.moduleRef; }
        public get languageTag(): number { return this._data.languageTag; }
        // public get registerId(): number { return this.registerId; }
        // public get serviceId(): string { return this.serviceId; }
        // public get eventId(): string { return this.eventId; }
        public get object(): BMLObjectElement | null { return this._data.object; }
        public get segmentId(): string | null { return this._data.segmentId; }
    }

    // impl
    export class DOMImplementation {
        public hasFeature(feature: string, version: string) {
            return feature.toUpperCase() === "BML" && version === "1.0";
        }
    }
    export const document = wrapNodeNonNull(window.document) as BMLDocument;
}
