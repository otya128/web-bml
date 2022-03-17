import { transpile } from "../transpile_ecm";
import { Browser } from "../browser";
import * as bmlDate from "../date";
import * as bmlNumber from "../number";
import * as bmlString from "../string";
import { LongJump } from "../resource";
import { IInterpreter } from "./interpreter";
import { BinaryTable, BinaryTableConstructor } from "../binary_table";
import * as resource from "../resource";
import { BML } from "../interface/DOM";

interface BMLEvent {
    type: string;
    target: HTMLElement | null;
}

type BMLElement = HTMLElement;

declare global {
    interface Window {
        browser: any;
        dummy: any;
        BinaryTable: BinaryTableConstructor;
    }
    interface Document {
        currentEvent: BMLEvent | null;
        currentFocus: BMLElement | null;
    }
}

const originalNumber = Number;

function overrideNumber() {
    Number = new Proxy(function Number(...args: any[]) {
        return originalNumber(...args);
    }, {
        get(_obj, prop) {
            if (prop === "MIN_VALUE") {
                return bmlNumber.MIN_VALUE;
            } else if (prop === "MAX_VALUE") {
                return bmlNumber.MAX_VALUE;
            }
            return Reflect.get(originalNumber, prop);
        },
        set(_obj, prop, value) {
            Reflect.set(originalNumber, prop, value);
            return true;
        }
    }) as any;
    // ToNumber
};

function overrideString() {
    // EUC-JPベースで動いてるらしい
    String.prototype.charCodeAt = bmlString.eucJPCharCodeAt;
    String.fromCharCode = bmlString.eucJPFromCharCode;
}

function overrideDate() {
    Date.prototype.toString = bmlDate.toString;
    Date.prototype.toLocaleString = Date.prototype.toString;
    Date.prototype.toUTCString = Date.prototype.toString;
}

export class NativeInterpreter implements IInterpreter {
    _isExecuting: boolean;
    windowKeys: Set<string>;
    public constructor(browser: Browser) {
        // status, historyは存在しない
        // @ts-ignore
        delete window.status;
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
        (window as any).__newBT = function __newBT(klass: any, ...args: any[]) {
            if (klass === BinaryTable) {
                try {
                    return new klass(...args);
                } catch {
                    return null;
                }
            } else if (klass === Date) {
                if (args.length === 0 && resource.currentTime?.timeUnixMillis != null) {
                    // currentDateMode=1ならtimeUnixMillisを取得した時間からオフセット追加とかが理想かもしれない
                    return new Date(resource.currentTime?.timeUnixMillis);
                }
                return new klass(...args);
            } else {
                return new klass(...args);
            }
        };
    
        function defineAttributeProperty(propertyName: string, attrName: string, nodeName: string, readable: boolean, writable: boolean, defaultValue?: string) {
            Object.defineProperty(HTMLElement.prototype, propertyName, {
                get: readable ? function (this: HTMLElement): string | undefined | null {
                    return (BML.htmlElementToBMLHTMLElement(this) as any)[propertyName];
                } : undefined,
                set: writable ? function (this: HTMLElement, value: any): void {
                    (BML.htmlElementToBMLHTMLElement(this) as any)[propertyName] = value;
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
                return (BML.htmlElementToBMLHTMLElement(this) as BML.BMLBeitemElement).subscribe;
            },
            set: function (v: boolean) {
                return (BML.htmlElementToBMLHTMLElement(this) as BML.BMLBeitemElement).subscribe = v;
            },
        });
    
        Object.defineProperty(HTMLBodyElement.prototype, "invisible", {
            get: function (this: HTMLBodyElement) {
                return (BML.htmlElementToBMLHTMLElement(this) as BML.BMLBodyElement).invisible;
            },
            set: function (this: HTMLBodyElement, v: boolean) {
                (BML.htmlElementToBMLHTMLElement(this) as BML.BMLBodyElement).invisible = v;
            },
        });
    
        HTMLElement.prototype.focus = function focus() {
            (BML.htmlElementToBMLHTMLElement(this) as any).focus();
        };
    
        Object.defineProperty(Document.prototype, "currentFocus", {
            get: function () { return BML.bmlNodeToNode(BML.document.currentFocus); },
        });
    
        Object.defineProperty(Document.prototype, "currentEvent", {
            get: function () {
                return BML.document.currentEvent == null ? null : new Proxy(BML.document.currentEvent, {
                    get(currentEvent, p: string) {
                        if (p === "target") {
                            return BML.bmlNodeToNode(currentEvent.target);
                        } else if (p === "object") {
                            return BML.bmlNodeToNode((currentEvent as any).object);
                        }
                        return (currentEvent as any)[p];
                    }
                });
            },
        });
    
        Object.defineProperty(HTMLElement.prototype, "normalStyle", {
            get: function (this: HTMLElement) {
                return (BML.htmlElementToBMLHTMLElement(this) as any).normalStyle;
            }
        });
    
        Object.defineProperty(HTMLObjectElement.prototype, "data", {
            get: function getObjectData(this: HTMLObjectElement) {
                return (BML.htmlElementToBMLHTMLElement(this) as BML.BMLObjectElement).data;
            },
            set: async function setObjectData(this: HTMLObjectElement, v: string) {
                (BML.htmlElementToBMLHTMLElement(this) as BML.BMLObjectElement).data = v;
            }
        });
        window.BinaryTable = BinaryTable;
        window.browser = browser;
        window.dummy = undefined;
        this._isExecuting = false;
        this.windowKeys = new Set<string>(Object.keys(window));
    }
    
    public reset() {
        for (const k of Object.keys(window)) {
            if (Number.parseInt(k).toString() === k) {
                continue;
            }
            if (!this.windowKeys.has(k)) {
                (window as any)[k] = undefined;
                // delete (window as any)[k];
            }
        }
    }

    public addScript(script: string, src?: string): Promise<boolean> {
        const elem = document.createElement("script");
        elem.textContent = transpile(script);
        document.body.appendChild(elem);
        return Promise.resolve(false);
    }

    public get isExecuting() {
        return this._isExecuting;
    }

    public runEventHandler(funcName: string): Promise<boolean> {
        if (this.isExecuting) {
            throw new Error("this.isExecuting");
        }
        try {
            this._isExecuting = true;
            new Function(funcName + "();")();
            return Promise.resolve(false);
        } finally {
            this._isExecuting = false;
        }
    }

    public destroyStack(): void {
        throw new LongJump("long jump");
    }

    public resetStack(): void {
        this._isExecuting = false;
    }
}
