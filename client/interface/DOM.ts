import { EventQueue } from "../event_queue";
import { BMLCSS2Properties, BMLCSSStyleDeclaration } from "./BMLCSS2Properties";
import { CachedFileMetadata, Resources } from "../resource";
import { aribPNGToPNG } from "../arib_png";
import { readCLUT } from "../clut";
import { defaultCLUT } from "../default_clut";
import { parseCSSValue } from "../transpile_css";
import { Buffer } from "buffer";
import { Interpreter } from "../interpreter/interpreter";
import { AudioNodeProvider, BMLBrowserEventTarget, InputApplication, inputCharacters, InputCharacterType } from "../bml_browser";
import { convertJPEG } from "../arib_jpeg";
import { aribMNGToCSSAnimation } from "../arib_mng";
import { playAIFF } from "../arib_aiff";
import { unicodeToJISMap } from "../unicode_to_jis_map";
import { decodeEUCJP, encodeEUCJP } from "../euc_jp";
import { ModuleListEntry } from "../../server/ws_api";

export namespace BML {
    type DOMString = string;
    export function nodeToBMLNode(node: globalThis.HTMLInputElement, ownerDocument: BMLDocument): BMLInputElement;
    export function nodeToBMLNode(node: globalThis.HTMLBRElement, ownerDocument: BMLDocument): BMLBRElement;
    export function nodeToBMLNode(node: globalThis.HTMLAnchorElement, ownerDocument: BMLDocument): BMLAnchorElement;
    export function nodeToBMLNode(node: globalThis.HTMLHtmlElement, ownerDocument: BMLDocument): BMLBmlElement;
    export function nodeToBMLNode(node: globalThis.HTMLScriptElement, ownerDocument: BMLDocument): HTMLScriptElement;
    export function nodeToBMLNode(node: globalThis.HTMLObjectElement, ownerDocument: BMLDocument): BMLObjectElement;
    export function nodeToBMLNode(node: globalThis.HTMLHeadElement, ownerDocument: BMLDocument): HTMLHeadElement;
    export function nodeToBMLNode(node: globalThis.HTMLTitleElement, ownerDocument: BMLDocument): HTMLTitleElement;
    export function nodeToBMLNode(node: globalThis.HTMLSpanElement, ownerDocument: BMLDocument): BMLSpanElement;
    export function nodeToBMLNode(node: globalThis.HTMLMetaElement, ownerDocument: BMLDocument): HTMLMetaElement;
    export function nodeToBMLNode(node: globalThis.HTMLStyleElement, ownerDocument: BMLDocument): HTMLStyleElement;
    export function nodeToBMLNode(node: globalThis.HTMLElement, ownerDocument: BMLDocument): HTMLElement | BMLBeventElement | BMLBeitemElement;
    export function nodeToBMLNode(node: globalThis.HTMLBodyElement, ownerDocument: BMLDocument): BMLBodyElement;
    export function nodeToBMLNode(node: globalThis.HTMLParagraphElement, ownerDocument: BMLDocument): BMLParagraphElement;
    export function nodeToBMLNode(node: globalThis.HTMLDivElement, ownerDocument: BMLDocument): BMLDivElement;
    export function nodeToBMLNode(node: globalThis.HTMLHtmlElement, ownerDocument: BMLDocument): BMLBmlElement;
    export function nodeToBMLNode(node: globalThis.HTMLElement, ownerDocument: BMLDocument): HTMLElement;
    export function nodeToBMLNode(node: globalThis.Element, ownerDocument: BMLDocument): Element;
    export function nodeToBMLNode(node: globalThis.CDATASection, ownerDocument: BMLDocument): CDATASection;
    export function nodeToBMLNode(node: globalThis.Text, ownerDocument: BMLDocument): Text;
    export function nodeToBMLNode(node: globalThis.CharacterData, ownerDocument: BMLDocument): CharacterData;
    export function nodeToBMLNode(node: globalThis.HTMLAnchorElement, ownerDocument: BMLDocument): BMLAnchorElement;
    export function nodeToBMLNode(node: globalThis.Node, ownerDocument: BMLDocument): Node;
    export function nodeToBMLNode(node: null, ownerDocument: BMLDocument): null;
    export function nodeToBMLNode(node: globalThis.Node | null, ownerDocument: BMLDocument): Node | null {
        return node == null ? null : wrapNodeNonNull(node, ownerDocument);
    }

    export function bmlNodeToNode(node: Node | null): globalThis.Node | null {
        return node == null ? null : node["node"];
    }

    export function htmlElementToBMLHTMLElement(node: globalThis.HTMLElement | null, ownerDocument: BMLDocument): HTMLElement | null {
        if (node == null) {
            return null;
        }
        const result = wrapNodeNonNull(node, ownerDocument);
        if (!(result instanceof HTMLElement)) {
            throw new TypeError("failed to cast to BML.HTMLElement");
        }
        return result;
    }

    function wrapNode(node: globalThis.Node | null, ownerDocument: BMLDocument): Node | null {
        return node == null ? null : wrapNodeNonNull(node, ownerDocument);
    }

    function wrapNodeNonNull(node: globalThis.Node, ownerDocument: BMLDocument): Node {
        const bmlNode = ownerDocument.internalBMLNodeInstanceMap.get(node);
        if (bmlNode != null) {
            return bmlNode;
        }
        const klass = getNodeClass(node);
        const inst = new klass(node, ownerDocument);
        ownerDocument.internalBMLNodeInstanceMap.set(node, inst);
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
        } else if (node instanceof globalThis.HTMLTitleElement) {
            return HTMLTitleElement;
        } else if (node instanceof globalThis.HTMLSpanElement) {
            return BMLSpanElement;
        } else if (node instanceof globalThis.HTMLMetaElement) {
            return HTMLMetaElement;
        } else if (node instanceof globalThis.HTMLStyleElement) {
            return HTMLStyleElement;
        } else if (node instanceof globalThis.HTMLElement && node.nodeName.toLowerCase() === "bevent") {
            return BMLBeventElement;
        } else if (node instanceof globalThis.HTMLElement && node.nodeName.toLowerCase() === "beitem") {
            return BMLBeitemElement;
        } else if (node instanceof globalThis.HTMLElement && node.nodeName.toLowerCase() === "arib-cdata") {
            return CDATASection;
        } else if (node instanceof globalThis.HTMLElement && node.nodeName.toLowerCase() === "arib-text") {
            return Text;
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
            return Element;
        } else if (node instanceof globalThis.CDATASection) {
            return CDATASection;
        } else if (node instanceof globalThis.Text) {
            return Text;
            // CharcterData?????????
        } else if (node instanceof globalThis.CharacterData) {
            return CharacterData;
        } else if (node instanceof globalThis.Node) {
            console.error(node);
            return Node;
        }
        return Node;
    }

    export function isFocusable(elem: globalThis.Element) {
        if (elem instanceof globalThis.HTMLInputElement) {
            if (elem.disabled) {
                return false;
            }
        }
        const style = window.getComputedStyle(elem);
        if (style.visibility === "hidden") {
            return false;
        }
        return true;
    }

    function focus(node: HTMLElement, ownerDocument: BMLDocument) {
        const prevFocus = ownerDocument.currentFocus;
        if (prevFocus === node) {
            return;
        }
        if (!isFocusable(node["node"])) {
            return;
        }
        if (prevFocus != null) {
            blur(prevFocus, ownerDocument, node);
        } else {
            ownerDocument._currentFocus = node;
        }
        node.internalSetFocus(true);
        ownerDocument.eventQueue.queueSyncEvent({ type: "focus", target: node["node"] });
    }

    function blur(node: HTMLElement, ownerDocument: BMLDocument, newFocus?: HTMLElement) {
        if (ownerDocument.currentFocus !== node) {
            return;
        }
        node.internalSetActive(false);
        node.internalSetFocus(false);
        if (node instanceof HTMLInputElement) {
            // change???????????????blur??????????????????????????????????????????
            ownerDocument.inputApplication?.cancel("blur");
        }
        ownerDocument._currentFocus = newFocus ?? null;
        ownerDocument.eventQueue.queueSyncEvent({ type: "blur", target: node["node"] });
    }

    // impl
    export class Node {
        protected node: globalThis.Node;
        protected ownerDocument: BMLDocument;
        constructor(node: globalThis.Node, ownerDocument: BMLDocument) {
            this.node = node;
            this.ownerDocument = ownerDocument;
        }
        public get parentNode(): Node | null {
            return wrapNode(this.node.parentNode, this.ownerDocument);
        }
        public get firstChild(): Node | null {
            let firstChild = this.node.firstChild;
            if (firstChild != null && firstChild.nodeName.toLowerCase() === "arib-bg") {
                firstChild = firstChild.nextSibling;
            }
            return wrapNode(firstChild, this.ownerDocument);
        }
        public get lastChild(): Node | null {
            let lastChild = this.node.lastChild;
            if (lastChild != null && lastChild.nodeName.toLowerCase() === "arib-bg") {
                lastChild = null;
            }
            return wrapNode(lastChild, this.ownerDocument);
        }
        public get previousSibling(): Node | null {
            let previousSibling = this.node.previousSibling;
            if (previousSibling != null && previousSibling.nodeName.toLowerCase() === "arib-bg") {
                previousSibling = null;
            }
            return wrapNode(previousSibling, this.ownerDocument);
        }
        get nextSibling(): Node | null {
            return wrapNode(this.node.nextSibling, this.ownerDocument);
        }
    }

    // impl
    export class CharacterData extends Node {
        protected node: globalThis.CharacterData;
        protected textNode: globalThis.HTMLElement;
        protected parentBlock: globalThis.HTMLElement;
        protected root: ShadowRoot;
        protected textNodeInRoot?: globalThis.CharacterData;
        protected textData: string;
        constructor(node: globalThis.CharacterData, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
            // strictTextRendering??????????????????
            if (node.nodeName.toLowerCase() === "arib-text" || node.nodeName.toLowerCase() === "arib-cdata") {
                this.textNode = node as unknown as globalThis.HTMLElement;
                this.textData = this.textNode.textContent ?? "";
                this.textNode.replaceChildren();
                this.root = this.textNode.attachShadow({ mode: "closed" });
                this.parentBlock = this.getParentBlock()!;
            } else {
                this.textNode = undefined!;
                this.root = undefined!;
                this.textData = undefined!;
                this.parentBlock = undefined!;
            }
            this.node = node;
        }

        private getParentBlock() {
            let parent: globalThis.HTMLElement | null = this.textNode.parentElement;
            while (parent != null) {
                if (window.getComputedStyle(parent).display !== "inline") {
                    return parent;
                }
                parent = parent.parentElement;
            }
            return null;
        }

        private flowText(text: string) {
            const nextElement = this.textNode.nextElementSibling;
            const computedStyle = window.getComputedStyle(this.textNode);
            if (computedStyle.letterSpacing === "normal" || computedStyle.letterSpacing === "0px") {
                if (this.textNodeInRoot == null) {
                    // shadow DOM?????????????????????* {}????????????CSS????????????????????????????????????????????????????????????
                    this.textNodeInRoot = document.createTextNode(text);
                    this.root.replaceChildren(this.textNodeInRoot);
                }
                return;
            }
            if (this.textNodeInRoot != null) {
                this.textNodeInRoot = undefined;
            }
            const left = this.textNode.clientLeft;
            const top = this.textNode.clientTop;
            const parent = this.parentBlock;
            const width = parent.clientWidth;
            let fontSize = Number.parseInt(computedStyle.fontSize);
            if (Number.isNaN(fontSize)) {
                fontSize = 16;
            }
            let letterSpacing = Number.parseInt(computedStyle.letterSpacing);
            if (Number.isNaN(letterSpacing)) {
                letterSpacing = 0;
            }
            let lineHeight = Number.parseInt(computedStyle.lineHeight);
            if (Number.isNaN(lineHeight)) {
                lineHeight = fontSize * 1;
            }
            let x = left;
            let y = top;
            const children: globalThis.Node[] = [];
            for (let i = 0; i < text.length; i++) {
                const c = text.charAt(i);
                const isLast = nextElement == null && i === text.length - 1;
                if (c === "\r") {
                    continue;
                }
                if (c === "\n") {
                    const char = document.createTextNode("\n");
                    children.push(char);
                    x = 0;
                    y += lineHeight;
                    continue;
                }
                const isFull = c.charCodeAt(0) in unicodeToJISMap;
                const char = document.createElement("span");
                char.textContent = c;
                char.style.display = "inline-block";
                char.style.textAlign = "center";
                const fontWidth = isFull ? fontSize : fontSize / 2;
                char.style.width = `${fontWidth}px`;
                char.style.lineHeight = `${lineHeight}px`;
                if (x + fontWidth > width) {
                    x = 0;
                    y += lineHeight;
                }
                // ???????????????????????????????????????????????????????????????????????? (STD-B24 ???????????? (2/2) ????????? ????????? 6.3.2??????)
                if (!isLast && x + fontWidth + letterSpacing <= width) {
                    char.style.marginRight = `${letterSpacing}px`;
                    x += letterSpacing;
                }
                children.push(char);
                x += fontWidth;
            }
            this.root.replaceChildren(...children);
        }

        public internalReflow() {
            this.flowText(this.data);
        }

        public get data(): string {
            if (this.textNode) {
                return this.textData;
            }
            return this.node.data;
        }
        public set data(value: string) {
            value = String(value);
            if (this.textNode) {
                this.textData = value;
                if (this.textNodeInRoot != null) {
                    this.textNodeInRoot.data = value;
                } else {
                    this.flowText(value);
                }
                return;
            }
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
        constructor(node: globalThis.Document, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
            this.node = node;
            this._implementation = new DOMImplementation();
        }
        public get implementation(): DOMImplementation {
            return this._implementation;
        }
        public get documentElement(): HTMLElement {
            return wrapNodeNonNull(this.node.documentElement, this.ownerDocument) as HTMLElement;
        }
    }


    // impl
    export abstract class HTMLDocument extends Document {
        protected node: globalThis.HTMLDocument;
        constructor(node: globalThis.HTMLDocument, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
            this.node = node;
        }
        public getElementById(id: string | null | undefined): HTMLElement | null {
            const stringId = String(id);
            if (stringId === "") {
                return null;
            }
            return wrapNode(this.node.querySelector("#" + CSS.escape(stringId)), this.ownerDocument) as (HTMLElement | null);
        }
    }

    // impl
    export class BMLDocument extends HTMLDocument {
        public readonly internalBMLNodeInstanceMap = new WeakMap<globalThis.Node, Node>();
        _currentFocus: HTMLElement | null = null;
        _currentEvent: BMLEvent | null = null;
        public readonly interpreter: Interpreter;
        public readonly eventQueue: EventQueue;
        public readonly resources: Resources;
        public readonly browserEventTarget: BMLBrowserEventTarget;
        public readonly audioNodeProvider: AudioNodeProvider;
        public readonly inputApplication?: InputApplication;
        public readonly setMainAudioStreamCallback?: (componentId: number, channelId?: number) => boolean;
        public constructor(node: globalThis.HTMLElement, interpreter: Interpreter, eventQueue: EventQueue, resources: Resources, browserEventTarget: BMLBrowserEventTarget, audioNodeProvider: AudioNodeProvider, inputApplication: InputApplication | undefined, setMainAudioStreamCallback: ((componentId: number, channelId?: number) => boolean) | undefined) {
            super(node as any, null!); // !
            this.ownerDocument = this; // !!
            this.interpreter = interpreter;
            this.eventQueue = eventQueue;
            this.resources = resources;
            this.browserEventTarget = browserEventTarget;
            this.audioNodeProvider = audioNodeProvider;
            this.inputApplication = inputApplication;
            this.setMainAudioStreamCallback = setMainAudioStreamCallback;
        }

        public get documentElement(): HTMLElement {
            return wrapNodeNonNull(this.node, this.ownerDocument) as HTMLElement;
        }
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
        constructor(node: globalThis.Element, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
            this.node = node;
        }
        public get tagName(): string {
            const tagName = this.node.tagName.toLowerCase();
            if (tagName.startsWith("arib-")) {
                return tagName.substring("arib-".length);
            }
            return tagName;
        }
    }

    // impl
    export class HTMLElement extends Element {
        protected node: globalThis.HTMLElement;
        protected normalStyleMap: Map<string, string>;
        protected focusStyleMap: Map<string, string>;
        protected activeStyleMap: Map<string, string>;

        constructor(node: globalThis.HTMLElement, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
            this.node = node;
            this.normalStyleMap = new Map();
            this.focusStyleMap = new Map();
            this.activeStyleMap = new Map();
            for (const style of this.node.style) {
                this.normalStyleMap.set(style, this.node.style.getPropertyValue(style));
            }
        }
        public get id(): string {
            return this.node.id;
        }
        public get className(): string {
            return this.node.className;
        }

        public internalSetFocus(focus: boolean): void {
            if (focus === (this.node.getAttribute("web-bml-state") === "focus")) {
                return;
            }
            if (focus) {
                this.node.setAttribute("web-bml-state", "focus");
            } else {
                this.node.removeAttribute("web-bml-state");
            }
            this.applyStyle();
        }
    
        public internalSetActive(active: boolean): void {
            if (active === (this.node.getAttribute("web-bml-state") === "active")) {
                return;
            }
            if (active) {
                this.node.setAttribute("web-bml-state", "active");
            } else {
                this.node.removeAttribute("web-bml-state");
            }
            this.applyStyle();
        }

        private applyStyle() {
            if (this.focusStyleMap.size === 0 && this.activeStyleMap.size === 0) {
                return;
            }
            const state = this.node.getAttribute("web-bml-state");
            this.node.style.cssText = "";
            for (const [style, value] of this.normalStyleMap) {
                this.node.style.setProperty(style, value);
            }
            if (state === "focus") {
                for (const [style, value] of this.focusStyleMap) {
                    this.node.style.setProperty(style, value);
                }
            } else if (state === "active") {
                for (const [style, value] of this.activeStyleMap) {
                    this.node.style.setProperty(style, value);
                }
            }
        }

        protected getNormalStyle(): BMLCSS2Properties {
            const normalComputedPropertyGetter = (property: string): string => {
                const savedState = this.node.getAttribute("web-bml-state");
                if (savedState === "active") {
                    this.internalSetActive(false);
                } else if (savedState === "focus") {
                    this.internalSetFocus(false);
                }
                const value = window.getComputedStyle(this.node).getPropertyValue(property);
                if (savedState === "active") {
                    this.internalSetActive(true);
                } else if (savedState === "focus") {
                    this.internalSetFocus(true);
                }
                return value;
            };
            const normalPropertySetter = (property: string, value: string): void => {
                const currentState = this.node.getAttribute("web-bml-state");
                if (currentState === "focus") {
                    if (!this.focusStyleMap.has(property)) {
                        this.node.style.setProperty(property, value);
                    }
                } else if (currentState === "active") {
                    if (!this.activeStyleMap.has(property)) {
                        this.node.style.setProperty(property, value);
                    }
                } else {
                    this.node.style.setProperty(property, value);
                }
            };
            const declaration = new BMLCSSStyleDeclaration(this.normalStyleMap, this.normalStyleMap, normalComputedPropertyGetter, normalPropertySetter);
            return new BMLCSS2Properties(declaration, this.node, this.ownerDocument.browserEventTarget);
        }

        protected getFocusStyle(): BMLCSS2Properties {
            const focusComputedPropertyGetter = (property: string): string => {
                const savedState = this.node.getAttribute("web-bml-state");
                this.internalSetFocus(true);
                const value = window.getComputedStyle(this.node).getPropertyValue(property);
                if (savedState === "active") {
                    this.internalSetActive(true);
                } else {
                    this.internalSetFocus(savedState === "focus");
                }
                return value;
            };
            const focusPropertySetter = (property: string, value: string): void => {
                const currentState = this.node.getAttribute("web-bml-state");
                if (currentState === "focus") {
                    this.node.style.setProperty(property, value);
                }
            };
            const declaration = new BMLCSSStyleDeclaration(this.normalStyleMap, this.focusStyleMap, focusComputedPropertyGetter, focusPropertySetter);
            return new BMLCSS2Properties(declaration, this.node, this.ownerDocument.browserEventTarget);
        }

        protected getActiveStyle(): BMLCSS2Properties {
            const activeComputedPropertyGetter = (property: string): string => {
                const savedState = this.node.getAttribute("web-bml-state");
                this.internalSetActive(true);
                const value = window.getComputedStyle(this.node).getPropertyValue(property);
                if (savedState === "focus") {
                    this.internalSetFocus(true);
                } else {
                    this.internalSetActive(savedState === "active");
                }
                return value;
            };
            const activePropertySetter = (property: string, value: string): void => {
                const currentState = this.node.getAttribute("web-bml-state");
                if (currentState === "active") {
                    this.node.style.setProperty(property, value);
                }
            };
            const declaration = new BMLCSSStyleDeclaration(this.normalStyleMap, this.activeStyleMap, activeComputedPropertyGetter, activePropertySetter);
            return new BMLCSS2Properties(declaration, this.node, this.ownerDocument.browserEventTarget);
        }
    }

    // impl
    export class HTMLBRElement extends HTMLElement {

    }

    // impl
    export class BMLBRElement extends HTMLBRElement {
        public get normalStyle(): BMLCSS2Properties {
            return this.getNormalStyle();
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
        constructor(node: globalThis.HTMLAnchorElement, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
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
            return this.getNormalStyle();
        }
        public get focusStyle(): BMLCSS2Properties {
            return this.getFocusStyle();
        }
        public get activeStyle(): BMLCSS2Properties {
            return this.getActiveStyle();
        }
    }

    // impl
    export class HTMLInputElement extends HTMLElement {
        protected node: globalThis.HTMLInputElement;
        constructor(node: globalThis.HTMLInputElement, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
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
            return this.node.maxLength === -1 ? 40 : this.node.maxLength;
        }
        public get readOnly(): boolean {
            return this.node.readOnly;
        }
        public set readOnly(value: boolean) {
            if (this.ownerDocument.currentFocus === this && value && !this.node.readOnly) {
                this.ownerDocument.inputApplication?.cancel("readonly");
            }
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
            blur(this, this.ownerDocument);
        }
        public focus(): void {
            focus(this, this.ownerDocument);
        }

        public internalLaunchInputApplication(): void {
            const ctype = this.node.getAttribute("charactertype")?.toLowerCase() as InputCharacterType ?? "all";
            const allowed = inputCharacters.get(ctype);
            this.ownerDocument.inputApplication?.launch({
                characterType: ctype,
                allowedCharacters: allowed,
                maxLength: this.maxLength,
                value: this.value,
                inputMode: this.type === "password" ? "password" : "text",
                callback: (value) => {
                    value = decodeEUCJP(encodeEUCJP(value));
                    value = value.substring(0, this.maxLength);
                    if (allowed != null) {
                        value = value.split("").filter(x => {
                            return allowed.includes(x);
                        }).join("");
                    }
                    if (this.value !== value) {
                        this.value = value;
                        this.ownerDocument.eventQueue.queueSyncEvent({
                            type: "change",
                            target: this.node,
                        });
                        this.ownerDocument.eventQueue.processEventQueue();
                    }
                }
            });
        }
    }

    // impl
    export class BMLInputElement extends HTMLInputElement {
        public get normalStyle(): BMLCSS2Properties {
            return this.getNormalStyle();
        }
        public get focusStyle(): BMLCSS2Properties {
            return this.getFocusStyle();
        }
        public get activeStyle(): BMLCSS2Properties {
            return this.getActiveStyle();
        }
    }

    // STD B-24 ???????????? (2/2) ????????? ??????2 ???5-3??????
    // ???????????????????????????
    function fixImageSize(resolution: string, width: number, height: number, type: string): { width?: number, height?: number } {
        type = type.toLowerCase();
        // ???5-4??????
        //const scaleNumerator = [256, 192, 160, 128, 96, 80, 64, 48, 32];
        //const scaleDenominator = 128;
        const is720x480 = resolution.trim() === "720x480";
        if (type === "image/jpeg") {
            if (is720x480) {
                if (width % 2 != 0) {
                    return { width: width - 1, height };
                }
                return { width, height };
            }
            if (width === 960 && height === 540) {
                return { width, height };
            }
            return { width: Math.floor(width / 2), height: Math.floor(height / 2) };
        } else if (type === "image/x-arib-png" || type === "image/x-arib-mng") {
            return { width, height };
        }
        return {};
    }
    // impl
    export class HTMLObjectElement extends HTMLElement {
        protected node: globalThis.HTMLObjectElement;
        constructor(node: globalThis.HTMLObjectElement, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
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
        public get data(): string {
            const aribData = this.node.getAttribute("arib-data");
            if (aribData == null || aribData == "") {
                return this.node.getAttribute("data") ?? "";
            }
            return aribData;
        }
        private version: number = 0;
        protected animation: Animation | undefined;
        protected effect: KeyframeEffect | undefined;
        protected delete() {
            if (this.animation != null) {
                this.animation.cancel();
                this.effect = undefined;
                this.animation = undefined;
            }
            // Chrome??????data???????????????type?????????????????????????????????????????????????????????????????????type?????????
            this.node.removeAttribute("type");
            this.node.removeAttribute("data");
        }

        protected updateAnimation() {
            if (this.animation == null) {
                return;
            }
            const streamStatus = this.node.getAttribute("streamstatus");
            if (streamStatus === "play") {
                this.animation.play();
            } else if (streamStatus === "pause") {
                this.animation.pause();
            } else if (streamStatus === "stop") {
                this.animation.cancel();
            }
        }

        public set data(value: string) {
            (async () => {
                if (value == null) {
                    this.delete();
                    this.node.removeAttribute("arib-data");
                    return;
                }
                const aribType = this.node.getAttribute("arib-type");
                this.node.setAttribute("arib-data", value);
                if (value == "") {
                    this.delete();
                    return;
                }
                if (aribType?.toLowerCase() === "audio/x-arib-mpeg2-aac") {
                    // (arib-dc://-1\.-1\.-1)?/((?<component_tag>\d+(;?<channel_id>\d+))|-1)
                    const { componentId, channelId } = this.ownerDocument.resources.parseAudioReference(value);
                    if (componentId == null) {
                        return;
                    }
                    this.ownerDocument.browserEventTarget.dispatchEvent<"audiostreamchanged">(
                        new CustomEvent("audiostreamchanged", {
                            detail: {
                                componentId,
                                channelId: channelId ?? undefined,
                            }
                        })
                    );
                    return;
                }
                // ?????????????????????????????????
                this.version = this.version + 1;
                const version: number = this.version;
                const fetched = await this.ownerDocument.resources.fetchResourceAsync(value);
                if (this.version !== version) {
                    return;
                }
                if (!fetched) {
                    this.delete();
                    return;
                }

                let imageUrl: CachedFileMetadata | undefined;
                const isPNG = aribType?.toLowerCase() === "image/x-arib-png";
                const isMNG = aribType?.toLowerCase() === "image/x-arib-mng";
                let imageType: string | undefined;
                if (isPNG || isMNG) {
                    const clutCss = window.getComputedStyle(this.node).getPropertyValue("--clut");
                    const clutUrl = clutCss == null ? null : parseCSSValue(clutCss);
                    const fetchedClut = clutUrl == null ? null : (await this.ownerDocument.resources.fetchResourceAsync(clutUrl))?.data;
                    if (this.version !== version) {
                        return;
                    }
                    if (isMNG) {
                        const clut = fetchedClut == null ? defaultCLUT : readCLUT(Buffer.from(fetchedClut?.buffer));
                        const keyframes = aribMNGToCSSAnimation(Buffer.from(fetched.data), clut);
                        this.node.removeAttribute("data");
                        if (this.animation != null) {
                            this.animation.cancel();
                            this.animation = undefined;
                            this.effect = undefined;
                        }
                        if (keyframes == null) {
                            return;
                        }
                        this.effect = new KeyframeEffect(this.node, keyframes.keyframes, keyframes.options);
                        this.animation = new Animation(this.effect);
                        for (const blob of keyframes.blobs) {
                            fetched.blobUrl.set(blob, { blobUrl: blob });
                        }
                        const { width, height } = fixImageSize(window.getComputedStyle((bmlNodeToNode(this.ownerDocument.documentElement) as globalThis.HTMLElement).querySelector("body")!).getPropertyValue("resolution"), keyframes.width, keyframes.height, (aribType ?? this.type));
                        if (width != null && height != null) {
                            this.node.style.maxWidth = width + "px";
                            this.node.style.minWidth = width + "px";
                            this.node.style.maxHeight = height + "px";
                            this.node.style.minHeight = height + "px";
                        }
                        // streamlooping???1?????????????????????????????????????????????
                        // streamstatus=play?????????streamposition????????????????????????????????????????????????
                        // streamstatus=stop?????????????????? streamposition???0????????????????????????
                        // streamstatus=pause????????? streamposition???????????????????????????????????????
                        if (this.streamStatus !== "stop") {
                            console.error("unexpected streamStatus", this.streamStatus, this.data);
                        }
                        this.updateAnimation();
                        return;
                    } else {
                        imageUrl = fetched.blobUrl.get(fetchedClut);
                        if (imageUrl == null) {
                            const clut = fetchedClut == null ? defaultCLUT : readCLUT(Buffer.from(fetchedClut?.buffer));
                            const png = aribPNGToPNG(Buffer.from(fetched.data), clut);
                            const blob = new Blob([png.data], { type: "image/png" });
                            imageUrl = { blobUrl: URL.createObjectURL(blob), width: png.width, height: png.height };
                            fetched.blobUrl.set(fetchedClut, imageUrl);
                        }
                        imageType = "image/png";
                    }
                } else if (aribType?.toLowerCase() === "image/jpeg") {
                    imageUrl = fetched.blobUrl.get("BT.709");
                    if (imageUrl == null) {
                        try {
                            const bt601 = await globalThis.createImageBitmap(new Blob([fetched.data]));
                            imageUrl = await convertJPEG(bt601);
                            if (this.version !== version) {
                                return;
                            }
                        } catch {
                            this.delete();
                            return;
                        }
                        fetched.blobUrl.set("BT.709", imageUrl);
                    }
                    imageType = "image/jpeg";
                } else {
                    this.delete();
                    return;
                }
                if (imageUrl == null) {
                    this.delete();
                    return;
                }
                if (imageUrl.width != null && imageUrl.height != null) {
                    const { width, height } = fixImageSize(window.getComputedStyle((bmlNodeToNode(this.ownerDocument.documentElement) as globalThis.HTMLElement).querySelector("body")!).getPropertyValue("--resolution"), imageUrl.width, imageUrl.height, (aribType ?? this.type));
                    if (width != null && height != null) {
                        this.node.style.maxWidth = width + "px";
                        this.node.style.minWidth = width + "px";
                        this.node.style.maxHeight = height + "px";
                        this.node.style.minHeight = height + "px";
                    }
                }
                this.node.type = imageType;
                this.node.data = imageUrl.blobUrl;
            })();
        }
        public get type() {
            const aribType = this.node.getAttribute("arib-type");
            if (aribType != null) {
                return aribType;
            }
            return this.node.type;
        }
        public get normalStyle(): BMLCSS2Properties {
            return this.getNormalStyle();
        }
        public get focusStyle(): BMLCSS2Properties {
            return this.getFocusStyle();
        }
        public get activeStyle(): BMLCSS2Properties {
            return this.getActiveStyle();
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        // ??????id????????????????????????????????????????????????
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

        // MNG
        // streamstatus=play?????????streamPosition??????????????????
        // streamstatus=stop?????????streamPosition???0
        // streamstatus=pause???????????????????????????????????????????????????????????????
        public get streamPosition(): number {
            const v = Number.parseInt(this.node.getAttribute("streamposition") ?? "0");
            if (Number.isFinite(v)) {
                return v;
            } else {
                return 0;
            }
        }

        // MNG
        // streamstatus=play?????????streamPosition??????????????????
        // streamstatus=stop?????????streamPosition???0???????????????????????????????????????
        // streamstatus=pause????????????????????????????????????????????? ???????????????????????????????????????????????????
        public set streamPosition(value: number) {
            if (this.streamStatus === "pause") {
                value = Number(value);
                if (Number.isFinite(value)) {
                    this.node.setAttribute("streamposition", value.toString());
                    if (this.effect != null) {
                        const timing = this.effect.getTiming();
                        const duration = Number(timing.duration);
                        const keyframes = this.effect.getKeyframes();
                        const keyframe = keyframes[Math.max(0, Math.min(value, keyframes.length - 1))];
                        timing.delay = -(keyframe.computedOffset * duration);
                        this.effect.updateTiming(timing);
                    }
                }
            } else {
                if (this.effect != null) {
                    const timing = this.effect.getTiming();
                    timing.delay = 0;
                    this.effect.updateTiming(timing);
                }
                this.node.setAttribute("streamposition", "0");
            }
        }

        static offsetToFrame(keyframes: ComputedKeyframe[], offset: number): number {
            // offset???????????????????????????????????????
            for (let i = 0; i < keyframes.length; i++) {
                if (keyframes[i].computedOffset <= offset) {
                    return i;
                }
            }
            return 0;
        }

        public get streamStatus(): DOMString {
            if (this.animation != null) {
                if (this.animation.playState === "finished" && this.streamStatus !== "pause") {
                    this.streamStatus = "pause";
                }
            }
            const value = this.node.getAttribute("streamstatus");
            if (value == null) {
                const type = this.type.toLowerCase();
                // stop?????????????????????????????????stop (STD-B24 ???????????? (2/2) ??????2 4.8.5.2 ???2)
                if (type === "audio/x-arib-mpeg2-aac" || type === "audio/x-arib-aiff" || type === "image/gif" || type === "image/x-arib-mng") {
                    return "stop";
                }
                return "play";
            }
            return value; // "stop" | "play" | "pause"
        }

        private audioBufferSourceNode?: AudioBufferSourceNode;
        // STD-B24 ???????????? (2/2) ??????2 4.8.5.3
        // MNG
        // stop???????????????data?????????????????????
        // ??????????????????????????????pause??????????????????
        public set streamStatus(value: DOMString) {
            const type = this.type.toLowerCase();
            if (type === "audio/x-arib-aiff") {
                if (value === "play") {
                    this.audioBufferSourceNode?.stop();
                    this.ownerDocument.resources.fetchResourceAsync(this.data).then(x => {
                        const data = x?.data;
                        if (data == null) {
                            return;
                        }
                        this.audioBufferSourceNode = playAIFF(this.ownerDocument.audioNodeProvider.getAudioDestinationNode(), Buffer.from(data)) ?? undefined;
                        this.node.setAttribute("streamstatus", "play");
                        if (this.audioBufferSourceNode != null) {
                            const sourceNode = this.audioBufferSourceNode;
                            sourceNode.onended = () => {
                                if (sourceNode === this.audioBufferSourceNode) {
                                    this.node.setAttribute("streamstatus", "stop");
                                }
                            };
                        }
                    });
                } else if (value === "stop") {
                    this.audioBufferSourceNode?.stop();
                    this.audioBufferSourceNode = undefined;
                    this.node.setAttribute("streamstatus", "stop");
                }
                return;
            }
            if (this.animation == null || this.effect == null) {
                this.node.setAttribute("streamstatus", value);
                return;
            }
            if (this.streamStatus === value) {
                return;
            }
            const prevStatus = this.streamStatus;
            if (value === "play") {
                this.node.setAttribute("streamstatus", "play");
                if (prevStatus === "pause") {
                    // pause=>play streamposition??????????????????????????????????????????????????????
                    this.animation.play();
                } else if (prevStatus === "stop") {
                    // stop=>play 0??????????????????????????????
                    this.streamPosition = 0;
                    this.animation.play();
                }
            } else if (value === "pause") {
                this.node.setAttribute("streamstatus", "pause");
                if (prevStatus === "play") {
                    // play=>pause ?????????????????????????????????????????????????????? streamposition??????????????????????????????????????? ?????????????????????????????????
                    this.animation.pause();
                    const duration = Number(this.effect.getTiming().duration);
                    this.streamPosition = BMLObjectElement.offsetToFrame(this.effect.getKeyframes(), ((this.animation.currentTime! - this.animation.startTime!) % duration) / duration);
                } else if (prevStatus === "stop") {
                    // stop=>pause 0?????????????????????????????????
                    this.streamPosition = 0;
                    this.animation.play();
                    this.animation.pause();
                }
            } else if (value === "stop") {
                // play=>stop streamposition???0 ?????????????????????????????????
                // pause=>stop play=>pause??????????????????
                this.animation.cancel();
                this.streamPosition = 0;
                this.node.setAttribute("streamstatus", "stop");
            }
        }

        public setMainAudioStream(audio_ref: DOMString): boolean {
            const { componentId, channelId } = this.ownerDocument.resources.parseAudioReference(audio_ref);
            if (componentId == null) {
                return false;
            }
            return this.ownerDocument.setMainAudioStreamCallback?.(componentId, channelId ?? undefined) ?? false;
        }

        public getMainAudioStream(): DOMString | null {
            const componentId = this.ownerDocument.resources.mainAudioComponentId ?? this.ownerDocument.resources.defaultAudioComponentId;
            const channelId = this.ownerDocument.resources.mainAudioChannelId;
            const prefix = (this.ownerDocument.resources.isInternetContent ? "arib://-1.-1.-1/" /* ? */ : "/");
            const component = componentId.toString(16).padStart(2, "0");
            if (channelId != null) {
                return prefix + component + ";" + channelId;
            } else {
                return prefix + component;
            }
        }

        public blur(): void {
            blur(this, this.ownerDocument);
        }
        public focus(): void {
            focus(this, this.ownerDocument);
        }
    }

    // impl
    export class BMLSpanElement extends HTMLElement {
        public get normalStyle(): BMLCSS2Properties {
            return this.getNormalStyle();
        }
        public get focusStyle(): BMLCSS2Properties {
            return this.getFocusStyle();
        }
        public get activeStyle(): BMLCSS2Properties {
            return this.getActiveStyle();
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        public blur(): void {
            blur(this, this.ownerDocument);
        }
        public focus(): void {
            focus(this, this.ownerDocument);
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
            v = Boolean(v);
            if (this.ownerDocument.currentFocus instanceof HTMLInputElement && !v) {
                this.ownerDocument.inputApplication?.cancel("invisible");
            }
            if (v) {
                this.node.setAttribute("invisible", "invisible");
            } else {
                this.node.removeAttribute("invisible");
            }
            this.ownerDocument.browserEventTarget.dispatchEvent<"invisible">(new CustomEvent("invisible", { detail: v }));
        }
        public get normalStyle(): BMLCSS2Properties {
            return this.getNormalStyle();
        }
    }

    // impl
    export class HTMLDivElement extends HTMLElement {

    }

    // impl
    export class BMLDivElement extends HTMLDivElement {
        public get normalStyle(): BMLCSS2Properties {
            return this.getNormalStyle();
        }
        public get focusStyle(): BMLCSS2Properties {
            return this.getFocusStyle();
        }
        public get activeStyle(): BMLCSS2Properties {
            return this.getActiveStyle();
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        public blur(): void {
            blur(this, this.ownerDocument);
        }
        public focus(): void {
            focus(this, this.ownerDocument);
        }
    }

    // impl
    export class HTMLParagraphElement extends HTMLElement {

    }

    // impl
    export class BMLParagraphElement extends HTMLParagraphElement {
        public get normalStyle(): BMLCSS2Properties {
            return this.getNormalStyle();
        }
        public get focusStyle(): BMLCSS2Properties {
            return this.getFocusStyle();
        }
        public get activeStyle(): BMLCSS2Properties {
            return this.getActiveStyle();
        }
        public get accessKey(): string {
            return this.node.accessKey;
        }
        public blur(): void {
            blur(this, this.ownerDocument);
        }
        public focus(): void {
            focus(this, this.ownerDocument);
        }
    }

    // impl
    export class HTMLMetaElement extends HTMLElement {
        protected node: globalThis.HTMLMetaElement;
        constructor(node: globalThis.HTMLMetaElement, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
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
        constructor(node: globalThis.HTMLTitleElement, ownerDocument: BMLDocument) {
            super(node, ownerDocument);
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
        // ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
        // subscribe=false => subscribe=true??????????????????????????????????????????
        public internalTimerFired: boolean = false;

        public internalModuleUpdateDataEventId?: number;
        public internalModuleUpdateVersion?: number;
        public internalModuleExistsInDII?: boolean;

        // key: message_id, value: ??????????????????message_version
        public internalMessageVersion?: Map<number, number>;

        public internalNPTReferred: boolean = false;

        public get type(): DOMString {
            return this.node.getAttribute("type") ?? "";
        }
        public get esRef(): DOMString {
            return this.node.getAttribute("es_ref") ?? "";
        }
        public set esRef(value: DOMString) {
            if (value !== this.esRef) {
                this.node.setAttribute("es_ref", value);
                this.internalMessageVersion = undefined;
                this.internalNPTReferred = false;
            }
        }
        public get messageId(): number {
            return attrToNumber(this.node.getAttribute("message_id")) ?? 255;
        }
        public set messageId(value: number) {
            this.node.setAttribute("message_id", String(value));
        }
        public get messageVersion(): number {
            return attrToNumber(this.node.getAttribute("message_version")) ?? 255;
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
            if (this.moduleRef !== value) {
                this.node.setAttribute("module_ref", value);
                this.internalModuleUpdateDataEventId = undefined;
                this.internalModuleUpdateVersion = undefined;
                this.internalModuleExistsInDII = undefined;
            }
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
            if (this.timeValue !== value) {
                this.node.setAttribute("time_value", value);
                this.internalTimerFired = false;
            }
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

        private dispatchModuleUpdatedEvent(module: string, status: number): void {
            if (!this.subscribe) {
                return;
            }
            console.log("ModuleUpdated", module, status);
            const onoccur = this.node.getAttribute("onoccur");
            if (!onoccur) {
                return;
            }
            this.ownerDocument.eventQueue.queueAsyncEvent(async () => {
                this.ownerDocument._currentEvent = new BMLBeventEvent({
                    type: "ModuleUpdated",
                    target: this,
                    status,
                    moduleRef: module,
                });
                if (await this.ownerDocument.eventQueue.executeEventHandler(onoccur)) {
                    return true;
                }
                this.ownerDocument._currentEvent = null;
                return false;
            });
            this.ownerDocument.eventQueue.processEventQueue();
        }

        private subscribeModuleUpdated(): void {
            const { componentId, moduleId } = this.ownerDocument.resources.parseURLEx(this.moduleRef);
            if (!this.subscribe || componentId == null || moduleId == null) {
                return;
            }
            if (!this.ownerDocument.resources.getPMTComponent(componentId)) {
                this.dispatchModuleUpdatedEvent(this.moduleRef, 1);
                this.internalModuleExistsInDII = false;
                this.internalModuleUpdateVersion = undefined;
                this.internalModuleUpdateDataEventId = undefined;
                return;
            }
            const dii = this.ownerDocument.resources.getDownloadComponentInfo(componentId);
            if (dii == null) {
                // DII?????????
                return;
            }
            const module = dii.modules.get(moduleId);
            if (module != null) {
                this.dispatchModuleUpdatedEvent(this.moduleRef, 2);
                this.internalModuleExistsInDII = true;
                this.internalModuleUpdateVersion = module.version;
                this.internalModuleUpdateDataEventId = dii.dataEventId;
            } else {
                this.dispatchModuleUpdatedEvent(this.moduleRef, 1);
                this.internalModuleExistsInDII = false;
                this.internalModuleUpdateVersion = undefined;
                this.internalModuleUpdateDataEventId = dii.dataEventId;
            }
        }

        public internalPMTUpdated(components: ReadonlySet<number>): void {
            const { componentId, moduleId } = this.ownerDocument.resources.parseURLEx(this.moduleRef);
            if (!this.subscribe || componentId == null || moduleId == null) {
                return;
            }
            if (!components.has(componentId)) {
                if (this.internalModuleExistsInDII) {
                    // ???????????????????????????->?????????
                    this.dispatchModuleUpdatedEvent(this.moduleRef, 1);
                }
                this.internalModuleExistsInDII = false;
                this.internalModuleUpdateVersion = undefined;
                this.internalModuleUpdateDataEventId = undefined;
            }
        }

        public internalDIIUpdated(updatedComponentId: number, modules: ReadonlyMap<number, ModuleListEntry>, dataEventId: number): void {
            const { componentId, moduleId } = this.ownerDocument.resources.parseURLEx(this.moduleRef);
            if (!this.subscribe || updatedComponentId !== componentId || moduleId == null) {
                return;
            }
            const module = modules.get(moduleId);
            if (module == null) {
                if (this.internalModuleExistsInDII) {
                    // ?????????????????????->?????????
                    this.dispatchModuleUpdatedEvent(this.moduleRef, 1);
                }
                // ???????????????????????????
                if (this.internalModuleUpdateDataEventId != null && this.internalModuleUpdateDataEventId !== dataEventId) {
                    if (this.internalModuleExistsInDII) {
                        // ?????????????????????->????????????????????????
                        this.dispatchModuleUpdatedEvent(this.moduleRef, 5);
                    }
                }
                this.internalModuleExistsInDII = false;
                this.internalModuleUpdateVersion = undefined;
                this.internalModuleUpdateDataEventId = dataEventId;
            } else {
                if (!this.internalModuleExistsInDII) {
                    // ????????????????????????->?????????????????????
                    this.dispatchModuleUpdatedEvent(this.moduleRef, 2);
                } else {
                    // ??????DII?????????????????????????????????????????????
                    if (this.internalModuleUpdateVersion != null) {
                        if (this.internalModuleUpdateVersion !== module.version) {
                            // ??????????????????????????????????????????
                            this.dispatchModuleUpdatedEvent(this.moduleRef, 0);
                        }
                    }
                }
                // ???????????????????????????
                if (this.internalModuleUpdateDataEventId != null && this.internalModuleUpdateDataEventId !== dataEventId) {
                    if (this.internalModuleExistsInDII) {
                        // ?????????????????????->?????????????????????
                        this.dispatchModuleUpdatedEvent(this.moduleRef, 6);
                    } else {
                        // ????????????????????????->?????????????????????
                        this.dispatchModuleUpdatedEvent(this.moduleRef, 4);
                    }
                }
                this.internalModuleExistsInDII = true;
                this.internalModuleUpdateVersion = module.version;
                this.internalModuleUpdateDataEventId = dataEventId;
            }
        }

        public set subscribe(value: boolean) {
            if (Boolean(value)) {
                if (!this.subscribe) {
                    this.internalTimerFired = false;
                    this.internalModuleUpdateDataEventId = undefined;
                    this.internalModuleUpdateVersion = undefined;
                    this.internalModuleExistsInDII = undefined;
                    this.internalMessageVersion = undefined;
                    this.internalNPTReferred = false;
                }
                this.node.setAttribute("subscribe", "subscribe");
                if (this.type === "ModuleUpdated" && this.internalModuleExistsInDII == null) {
                    this.subscribeModuleUpdated();
                }
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
        constructor(partialData: Partial<BMLBeventEventData> & BMLEventData) {
            const data = {
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
                },
                ...partialData,
            };
            super(data);
            this._data = data;
        }
        public get status(): number { return this._data.status; }
        public get privateData(): string { return this._data.privateData; }
        public get esRef(): string { return this._data.esRef; }
        public get messageId(): number { return this._data.messageId; }
        public get messageVersion(): number { return this._data.messageVersion; }
        public get messageGroupId(): number { return this._data.messageGroupId; }
        public get moduleRef(): string { return this._data.moduleRef; }
        public get languageTag(): number { return this._data.languageTag; }
        // public get registerId(): number { return this.registerId; }
        // public get serviceId(): string { return this.serviceId; }
        // public get eventId(): string { return this.eventId; }
        public get peripheralRef(): string { return this.peripheralRef; }
        public get object(): BMLObjectElement | null { return this._data.object; }
        public get segmentId(): string | null { return this._data.segmentId; }
    }

    // impl
    export class DOMImplementation {
        public hasFeature(feature: string, version: string) {
            return feature.toUpperCase() === "BML" && version === "1.0";
        }
    }
}
