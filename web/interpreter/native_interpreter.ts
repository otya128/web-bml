import { transpile } from "../../src/transpile_ecm";
import { Browser } from "../browser";
import * as bmlDate from "../date";
import * as bmlNumber from "../number";
import * as bmlString from "../string";
import { LongJump } from "../resource";
import { IInterpreter } from "./interpreter";
import { BinaryTable } from "../binary_table";
import * as resource from "../resource";

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
    
        (window as any).BinaryTable = BinaryTable;
        window.browser = browser;
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
