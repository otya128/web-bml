const { Interpreter }: { Interpreter: any } = require("../../JS-Interpreter/interpreter");
import * as BT from "../binary_table";
import { Interpreter } from "./interpreter";
import { Content } from "../content";
import { getTrace, getLog } from "../util/trace";
import { Profile, Resources } from "../resource";
import { BML } from "../interface/DOM";
import { BMLCSS2Properties } from "../interface/BMLCSS2Properties";
import { BrowserAPI } from "../browser";
import * as bmlDate from "../date";
import * as bmlNumber from "../number";
import * as bmlString from "../string";
import { EPG } from "../bml_browser";
import { getTextDecoder } from "../text";

const domTrace = getTrace("js-interpreter.dom");
const eventTrace = getTrace("js-interpreter.event");
const browserLog = getLog("js-interpreter.browser");
const interpreterTrace = getTrace("js-interpreter");

const LAUNCH_DOCUMENT_CALLED = {};

/*
 * Object
 * Function
 * Array
 * String
 * Boolean
 * Number
 * Date
 * Math (運用しない)
 * CSVTable (運用しない)
 * BinaryTable
 * browser
 * XMLDoc (Class.XMLDocが1であればサポート)
 * navigator (運用しない)
 */

function initNumber(interpreter: any, globalObject: any) {
    var thisInterpreter = interpreter;
    var wrapper;
    // Number constructor.
    wrapper = function Number(this: { data: number }, value: any) {
        value = arguments.length ? Math.trunc(Interpreter.nativeGlobal.Number(value)) : 0;
        if (thisInterpreter.calledWithNew()) {
            // Called as `new Number()`.
            this.data = value;
            return this;
        } else {
            // Called as `Number()`.
            return value;
        }
    };
    interpreter.NUMBER = interpreter.createNativeFunction(wrapper, true);
    interpreter.setProperty(globalObject, 'Number', interpreter.NUMBER,
        Interpreter.NONENUMERABLE_DESCRIPTOR);

    interpreter.setProperty(interpreter.NUMBER, "MAX_VALUE", bmlNumber.MAX_VALUE, Interpreter.NONCONFIGURABLE_READONLY_NONENUMERABLE_DESCRIPTOR);
    interpreter.setProperty(interpreter.NUMBER, "MIN_VALUE", bmlNumber.MIN_VALUE, Interpreter.NONCONFIGURABLE_READONLY_NONENUMERABLE_DESCRIPTOR);
    interpreter.setProperty(interpreter.NUMBER, "NaN", Number.NaN, Interpreter.NONCONFIGURABLE_READONLY_NONENUMERABLE_DESCRIPTOR);

    wrapper = function toString(this: number, radix: number) {
        try {
            return Number(this).toString(radix);
        } catch (e: any) {
            // Throws if radix isn't within 2-36.
            thisInterpreter.throwException(thisInterpreter.ERROR, e.message);
        }
    };
    interpreter.setNativeFunctionPrototype(interpreter.NUMBER, 'toString', wrapper);
}

function initString(interpreter: any, globalObject: any) {
    var wrapper;
    // String constructor.
    wrapper = function String(this: { data: string }, value: any) {
        value = arguments.length ? globalThis.String(value) : '';
        if (interpreter.calledWithNew()) {
            // Called as `new String()`.
            this.data = value;
            return this;
        } else {
            // Called as `String()`.
            return value;
        }
    };
    interpreter.STRING = interpreter.createNativeFunction(wrapper, true);
    interpreter.setProperty(globalObject, 'String', interpreter.STRING,
        Interpreter.NONENUMERABLE_DESCRIPTOR);

    // Instance methods on String.
    // Methods with exclusively primitive arguments.
    // toUpperCase/toLowerCaseは全角英字では動かずASCIIの範囲のみかも
    var functions = ['charAt', 'indexOf', 'lastIndexOf', 'substring', 'toLowerCase', 'toUpperCase'];
    for (var i = 0; i < functions.length; i++) {
        interpreter.setNativeFunctionPrototype(interpreter.STRING, functions[i],
            String.prototype[functions[i] as any]);
    }

    wrapper = function split(this: string, separator: string) {
        var string = String(this);
        var jsList = string.split(separator);
        return interpreter.arrayNativeToPseudo(jsList);
    };
    interpreter.setNativeFunctionPrototype(interpreter.STRING, 'split', wrapper);
}

export class JSInterpreter implements Interpreter {
    interpreter: any;

    nativeProtoToPseudoObject = new Map<any, any>();

    domObjectToPseudo(interpreter: any, object: any): any {
        const pseudo = this.nativeProtoToPseudoObject.get(Object.getPrototypeOf(object));
        if (!pseudo) {
            throw new Error("!?");
        }
        const wrapper = interpreter.createObjectProto(pseudo.properties["prototype"]);
        wrapper.data = object;
        return wrapper;
    }

    domClassToPseudo(interpreter: any, prototype: any): any {
        const p = this.nativeProtoToPseudoObject.get(prototype);
        if (p) {
            return p;
        }

        const pseudo = interpreter.createNativeFunction(function elementWrapper(this: any) {
            throw new TypeError("forbidden");
        }, true);
        const parent = Object.getPrototypeOf(prototype);
        if (Object.getPrototypeOf(Object) !== parent) {
            const parentPseudo = this.domClassToPseudo(interpreter, parent);
            interpreter.setProperty(pseudo, "prototype", interpreter.createObject(parentPseudo), Interpreter.NONENUMERABLE_DESCRIPTOR);
        }
        const proto = pseudo.properties["prototype"];
        interpreter.setProperty(pseudo, "name", prototype.constructor.name === "Function" ? prototype.name : prototype.constructor.name, Interpreter.NONENUMERABLE_DESCRIPTOR);
        type PseudoDesc = {
            configurable?: boolean;
            enumerable?: boolean;
            value?: any;
            writable?: boolean;
            get?: any;
            set?: any;
        };
        const nativeProtoToPseudoObject = this.nativeProtoToPseudoObject;
        const domObjectToPseudo = this.domObjectToPseudo.bind(this);
        for (const [name, desc] of Object.entries(Object.getOwnPropertyDescriptors(prototype.prototype))) {
            if (name === "constructor") {
                continue;
            }
            const pseudoDesc: PseudoDesc = {};
            const { get, set, value } = desc;
            if (get) {
                pseudoDesc.get = interpreter.createNativeFunction(function wrap(this: { data: any }) {
                    domTrace("get", name, this.data);
                    const result = get.bind(this.data)();
                    domTrace("=>", result);
                    if (result != null && nativeProtoToPseudoObject.has(Object.getPrototypeOf(result))) {
                        return domObjectToPseudo(interpreter, result);
                    }
                    return result;
                });
            }
            if (set) {
                pseudoDesc.set = interpreter.createNativeFunction(function wrap(this: { data: any }, value: any) {
                    domTrace("set", name, value, this.data);
                    set.bind(this.data)(value);
                });
            }

            if (typeof value === "function") {
                pseudoDesc.value = interpreter.createNativeFunction(function wrap(this: { data: any }, ...args: any[]) {
                    domTrace("call", name, value, this.data, args);
                    const result = value.bind(this.data)(...args);
                    domTrace("=>", result);
                    if (result != null && nativeProtoToPseudoObject.has(Object.getPrototypeOf(result))) {
                        return domObjectToPseudo(interpreter, result);
                    }
                    return result;
                });
            } else if (typeof value === "undefined") {
            } else {
                throw new Error("unreachable");
            }
            if ("enumerable" in desc) {
                pseudoDesc.enumerable = desc["enumerable"];
            }
            if ("configurable" in desc) {
                pseudoDesc.configurable = desc["configurable"];
            }
            if ("writable" in desc) {
                pseudoDesc.enumerable = desc["writable"];
            }
            interpreter.setProperty(proto, name, Interpreter.VALUE_IN_DESCRIPTOR, pseudoDesc);
        }
        this.nativeProtoToPseudoObject.set(prototype.prototype, pseudo);
        return pseudo;
    }

    registerDOMClasses(interpreter: any, globalObject: any) {
        this.nativeProtoToPseudoObject.clear();
        interpreter.setProperty(globalObject, "Node", this.domClassToPseudo(interpreter, BML.Node));
        interpreter.setProperty(globalObject, "CharacterData", this.domClassToPseudo(interpreter, BML.CharacterData));
        interpreter.setProperty(globalObject, "Text", this.domClassToPseudo(interpreter, BML.Text));
        interpreter.setProperty(globalObject, "CDATASection", this.domClassToPseudo(interpreter, BML.CDATASection));
        interpreter.setProperty(globalObject, "Document", this.domClassToPseudo(interpreter, BML.Document));
        interpreter.setProperty(globalObject, "HTMLDocument", this.domClassToPseudo(interpreter, BML.HTMLDocument));
        interpreter.setProperty(globalObject, "BMLDocument", this.domClassToPseudo(interpreter, BML.BMLDocument));
        interpreter.setProperty(globalObject, "Element", this.domClassToPseudo(interpreter, BML.Element));
        interpreter.setProperty(globalObject, "HTMLElement", this.domClassToPseudo(interpreter, BML.HTMLElement));
        interpreter.setProperty(globalObject, "HTMLBRElement", this.domClassToPseudo(interpreter, BML.HTMLBRElement));
        interpreter.setProperty(globalObject, "BMLBRElement", this.domClassToPseudo(interpreter, BML.BMLBRElement));
        interpreter.setProperty(globalObject, "HTMLHtmlElement", this.domClassToPseudo(interpreter, BML.HTMLHtmlElement));
        interpreter.setProperty(globalObject, "BMLBmlElement", this.domClassToPseudo(interpreter, BML.BMLBmlElement));
        interpreter.setProperty(globalObject, "HTMLAnchorElement", this.domClassToPseudo(interpreter, BML.HTMLAnchorElement));
        interpreter.setProperty(globalObject, "BMLAnchorElement", this.domClassToPseudo(interpreter, BML.BMLAnchorElement));
        interpreter.setProperty(globalObject, "HTMLInputElement", this.domClassToPseudo(interpreter, BML.HTMLInputElement));
        interpreter.setProperty(globalObject, "BMLInputElement", this.domClassToPseudo(interpreter, BML.BMLInputElement));
        interpreter.setProperty(globalObject, "HTMLTextAreaElement", this.domClassToPseudo(interpreter, BML.HTMLTextAreaElement)); // Cプロファイル
        interpreter.setProperty(globalObject, "BMLTextAreaElement", this.domClassToPseudo(interpreter, BML.BMLTextAreaElement)); // Cプロファイル
        interpreter.setProperty(globalObject, "HTMLFormElement", this.domClassToPseudo(interpreter, BML.HTMLFormElement)); // Cプロファイル
        interpreter.setProperty(globalObject, "BMLFormElement", this.domClassToPseudo(interpreter, BML.BMLFormElement)); // Cプロファイル
        interpreter.setProperty(globalObject, "HTMLObjectElement", this.domClassToPseudo(interpreter, BML.HTMLObjectElement));
        interpreter.setProperty(globalObject, "BMLObjectElement", this.domClassToPseudo(interpreter, BML.BMLObjectElement));
        interpreter.setProperty(globalObject, "HTMLImageElement", this.domClassToPseudo(interpreter, BML.HTMLImageElement)); // Cプロファイル
        interpreter.setProperty(globalObject, "BMLImageElement", this.domClassToPseudo(interpreter, BML.BMLImageElement)); // Cプロファイル
        interpreter.setProperty(globalObject, "BMLSpanElement", this.domClassToPseudo(interpreter, BML.BMLSpanElement));
        interpreter.setProperty(globalObject, "HTMLBodyElement", this.domClassToPseudo(interpreter, BML.HTMLBodyElement));
        interpreter.setProperty(globalObject, "BMLBodyElement", this.domClassToPseudo(interpreter, BML.BMLBodyElement));
        interpreter.setProperty(globalObject, "HTMLDivElement", this.domClassToPseudo(interpreter, BML.HTMLDivElement));
        interpreter.setProperty(globalObject, "BMLDivElement", this.domClassToPseudo(interpreter, BML.BMLDivElement));
        interpreter.setProperty(globalObject, "HTMLParagraphElement", this.domClassToPseudo(interpreter, BML.HTMLParagraphElement));
        interpreter.setProperty(globalObject, "BMLParagraphElement", this.domClassToPseudo(interpreter, BML.BMLParagraphElement));
        interpreter.setProperty(globalObject, "HTMLMetaElement", this.domClassToPseudo(interpreter, BML.HTMLMetaElement));
        interpreter.setProperty(globalObject, "HTMLTitleElement", this.domClassToPseudo(interpreter, BML.HTMLTitleElement));
        interpreter.setProperty(globalObject, "HTMLScriptElement", this.domClassToPseudo(interpreter, BML.HTMLScriptElement));
        interpreter.setProperty(globalObject, "HTMLStyleElement", this.domClassToPseudo(interpreter, BML.HTMLStyleElement));
        interpreter.setProperty(globalObject, "HTMLHeadElement", this.domClassToPseudo(interpreter, BML.HTMLHeadElement));
        interpreter.setProperty(globalObject, "BMLBeventElement", this.domClassToPseudo(interpreter, BML.BMLBeventElement));
        interpreter.setProperty(globalObject, "BMLBeitemElement", this.domClassToPseudo(interpreter, BML.BMLBeitemElement));
        interpreter.setProperty(globalObject, "BMLEvent", this.domClassToPseudo(interpreter, BML.BMLEvent));
        interpreter.setProperty(globalObject, "BMLIntrinsicEvent", this.domClassToPseudo(interpreter, BML.BMLIntrinsicEvent));
        interpreter.setProperty(globalObject, "BMLBeventEvent", this.domClassToPseudo(interpreter, BML.BMLBeventEvent));
        interpreter.setProperty(globalObject, "DOMImplementation", this.domClassToPseudo(interpreter, BML.DOMImplementation));
        interpreter.setProperty(globalObject, "BMLCSS2Properties", this.domClassToPseudo(interpreter, BMLCSS2Properties));
    }

    public reset() {
        const content = this.content;
        const epg = this.epg;
        const resources = this.resources;
        function launchDocument(callback: (result: any, promiseValue: any) => void, documentName: string, transitionStyle: string | undefined): void {
            browserLog("launchDocument", documentName, transitionStyle);
            if (documentName.startsWith("#")) {
                // Cプロファイル TR-B14 第三分冊
                // 8.2.3.4 #fragment運用における受信機動作およびコンテンツガイドライン
                // "#top"の場合リロードされないことが望ましい
                // "startup.bml#top"の場合リロードが行われることが望ましい
                content.focusFragment(documentName);
                callback(0, undefined);
                return;
            }
            const r = content.launchDocument(String(documentName));
            callback(r, LAUNCH_DOCUMENT_CALLED);
        }

        function reloadActiveDocument(callback: (result: any, promiseValue: any) => void): void {
            browserLog("reloadActiveDocument");
            const r = content.launchDocument(browser.getActiveDocument()!);
            callback(r, LAUNCH_DOCUMENT_CALLED);
        }

        function X_DPA_launchDocWithLink(callback: (result: any, promiseValue: any) => void, documentName: string, transitionStyle: string | undefined): void {
            console.log("%X_DPA_launchDocWithLink", "font-size: 4em", documentName);
            if (resources.profile !== Profile.TrProfileC) {
                callback(NaN, LAUNCH_DOCUMENT_CALLED);
                return;
            }
            // 絶対URIを使用すること
            // TR-B14 第三分冊 8.3.10.2
            if (!documentName.startsWith("http://") && documentName.startsWith("https://")) {
                callback(NaN, LAUNCH_DOCUMENT_CALLED);
                return;
            }
            if (!resources.isInternetContent) {
                // 放送受信状態で使われた場合失敗動作となる
                // エラーメッセージを表示すべき (8.3.11.4)
                content.quitDocument();
                callback(NaN, LAUNCH_DOCUMENT_CALLED);
                return;
            }
            const r = content.launchDocument(documentName, { withLink: true });
            callback(r, LAUNCH_DOCUMENT_CALLED);
        }

        function epgTune(callback: (result: any, promiseValue: any) => void, service_ref: string): void {
            browserLog("%cepgTune", "font-size: 4em", service_ref);
            const { originalNetworkId, transportStreamId, serviceId } = resources.parseServiceReference(service_ref);
            if (originalNetworkId == null || transportStreamId == null || serviceId == null) {
                callback(NaN, LAUNCH_DOCUMENT_CALLED);
            } else {
                const r = epg.tune?.(originalNetworkId, transportStreamId, serviceId);
                callback(r, LAUNCH_DOCUMENT_CALLED);
            }
        }
        const browserAPI = this.browserAPI;
        const browser = browserAPI.browser;
        const asyncBrowser = browserAPI.asyncBrowser;
        this.interpreter = new Interpreter("", (interpreter: any, globalObject: any) => {
            interpreter.setProperty(globalObject, "___log", interpreter.createNativeFunction(function log(log: string) {
                eventTrace(log);
            }));
            const pseudoBrowser = interpreter.nativeToPseudo(browser);
            for (let i = 0; i < 64; i++) {
                function defineRW2(pseudo: any, propName: string) {
                    interpreter.setProperty(pseudo, propName, Interpreter.VALUE_IN_DESCRIPTOR, {
                        get: interpreter.createNativeFunction(function getGreg(this: { data: any }) {
                            return browserAPI.getGreg(i);
                        }),
                        set: interpreter.createNativeFunction(function setGreg(this: { data: any }, value: any) {
                            browserAPI.setGreg(i, String(value));
                        }),
                    });
                }

                function defineRW3(pseudo: any, propName: string) {
                    interpreter.setProperty(pseudo, propName, Interpreter.VALUE_IN_DESCRIPTOR, {
                        get: interpreter.createNativeFunction(function getUreg(this: { data: any }) {
                            return browserAPI.getUreg(i);
                        }),
                        set: interpreter.createNativeFunction(function setUreg(this: { data: any }, value: any) {
                            browserAPI.setUreg(i, String(value));
                        }),
                    });
                }
                defineRW2(interpreter.getProperty(pseudoBrowser, "Greg"), i.toString());
                defineRW3(interpreter.getProperty(pseudoBrowser, "Ureg"), i.toString());
            }

            interpreter.setProperty(globalObject, "browser", pseudoBrowser);
            for (const prop in asyncBrowser) {
                const asyncFunc = (asyncBrowser as any)[prop];
                interpreter.setProperty(pseudoBrowser, prop, interpreter.createAsyncFunction(function asyncWrap(callback: (result: any, resolveValue: any) => void, ...args: any[]): void {
                    (asyncFunc(...args.map(x => interpreter.pseudoToNative(x))) as Promise<any>).then(result => {
                        callback(interpreter.nativeToPseudo(result), undefined);
                    });
                }));
            }
            interpreter.setProperty(pseudoBrowser, "launchDocument", interpreter.createAsyncFunction(launchDocument));
            interpreter.setProperty(pseudoBrowser, "reloadActiveDocument", interpreter.createAsyncFunction(reloadActiveDocument));
            interpreter.setProperty(pseudoBrowser, "X_DPA_launchDocWithLink", interpreter.createAsyncFunction(X_DPA_launchDocWithLink));
            interpreter.setProperty(pseudoBrowser, "epgTune", interpreter.createAsyncFunction(epgTune));
            interpreter.setProperty(pseudoBrowser, "readPersistentArray", interpreter.createNativeFunction(function readPersistentArray(filename: string, structure: string): any[] | null {
                return interpreter.arrayNativeToPseudo(browser.readPersistentArray(filename, structure));
            }));
            interpreter.setProperty(pseudoBrowser, "writePersistentArray", interpreter.createNativeFunction(function writePersistentArray(filename: string, structure: string, data: any[], period?: Date): number {
                return browser.writePersistentArray(filename, structure, interpreter.arrayPseudoToNative(data), period);
            }));
            const resources = this.resources;
            interpreter.setProperty(pseudoBrowser, "getProgramID", interpreter.createAsyncFunction(function getProgramID(callback: (result: any, promiseValue: any) => void, type: number) {
                resources.getProgramInfoAsync().then(_ => {
                    const pid = browser.getProgramID(type);
                    callback(pid, undefined);
                });
            }));

            this.registerDOMClasses(interpreter, globalObject);
            interpreter.setProperty(globalObject, "document", this.domObjectToPseudo(interpreter, this.content.bmlDocument));

            const pseudoBinaryTable = interpreter.createAsyncFunction(function BinaryTable(this: any, callback: (result: any, resolveValue: any) => void, table_ref: string, structure: string) {
                resources.fetchResourceAsync(table_ref).then(res => {
                    if (!res) {
                        browserLog("BinaryTable", table_ref, "not found");
                        callback(null, undefined);
                        return;
                    }
                    browserLog("new BinaryTable", table_ref);
                    let buffer: Uint8Array = res.data;
                    this.instance = new BT.BinaryTable(buffer, structure, getTextDecoder(resources.profile));
                    callback(this, undefined);
                });
            });
            interpreter.setNativeFunctionPrototype(pseudoBinaryTable, "close", function close(this: { instance: BT.BinaryTable }) {
                return this.instance.close();
            });
            interpreter.setNativeFunctionPrototype(pseudoBinaryTable, "toNumber", function toNumber(this: { instance: BT.BinaryTable }, row: number, column: number): number {
                return this.instance.toNumber(row, column);
            });
            interpreter.setNativeFunctionPrototype(pseudoBinaryTable, "toString", function toString(this: { instance: BT.BinaryTable }, row: number, column: number): string | null {
                return this.instance.toString(row, column);
            });
            interpreter.setNativeFunctionPrototype(pseudoBinaryTable, "toArray", function toArray(this: { instance: BT.BinaryTable }, startRow: number, numRow: number): any[] | null {
                const r = this.instance.toArray(startRow, numRow);
                if (r == null) {
                    return r;
                }
                return interpreter.arrayNativeToPseudo(r.map(x => interpreter.arrayNativeToPseudo(x)));
            });
            interpreter.setNativeFunctionPrototype(pseudoBinaryTable, "search", function toArray(this: { instance: BT.BinaryTable }, startRow: number, ...args: any[]): number {
                const resultArray = args[args.length - 1];
                args[args.length - 1] = interpreter.arrayPseudoToNative(args[args.length - 1]);
                const result = this.instance.search(startRow, ...args);
                // FIXME: errorshori
                const props = Object.getOwnPropertyNames(args[args.length - 1]);
                for (var i = 0; i < props.length; i++) {
                    interpreter.setProperty(resultArray, props[i], interpreter.nativeToPseudo(args[args.length - 1][props[i]]));
                }
                return result;
            });
            interpreter.setProperty(pseudoBinaryTable.properties["prototype"], "nrow", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getNRow(this: { instance: BT.BinaryTable }) {
                    return this.instance.nrow;
                })
            });
            interpreter.setProperty(pseudoBinaryTable.properties["prototype"], "ncolumn", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getNColumn(this: { instance: BT.BinaryTable }) {
                    return this.instance.ncolumn;
                })
            });
            interpreter.setProperty(globalObject, "BinaryTable", pseudoBinaryTable);
            function initDate(interpreter: any, globalObject: any) {
                var thisInterpreter = interpreter;
                var wrapper;
                // Date constructor.
                wrapper = function Date(this: { data: Date }, value: any, _var_args: any) {
                    if (!thisInterpreter.calledWithNew()) {
                        // Called as `Date()`.
                        // Calling Date() as a function returns a string, no arguments are heeded.
                        if (resources.currentTimeUnixMillis != null) {
                            return bmlDate.toString.call(new Interpreter.nativeGlobal.Date(resources.currentTimeUnixMillis));
                        } else {
                            return bmlDate.toString.call(new Interpreter.nativeGlobal.Date());
                        }
                    }
                    // Called as `new Date(...)`.
                    var args = [null].concat(Array.from(arguments));
                    if (args.length <= 1 && value == null && resources.currentTimeUnixMillis != null) {
                        // currentDateMode=1ならtimeUnixMillisを取得した時間からオフセット追加とかが理想かもしれない
                        browserLog("new Date()");
                        this.data = new Interpreter.nativeGlobal.Date(resources.currentTimeUnixMillis);
                    } else {
                        this.data = new (Function.prototype.bind.apply(
                            Interpreter.nativeGlobal.Date, args as any));
                    }
                    return this;
                };
                interpreter.DATE = interpreter.createNativeFunction(wrapper, true);
                interpreter.DATE_PROTO = interpreter.DATE.properties['prototype'];
                interpreter.setProperty(globalObject, 'Date', interpreter.DATE,
                    Interpreter.NONENUMERABLE_DESCRIPTOR);

                // Static methods on Date.
                interpreter.setProperty(interpreter.DATE, 'now', interpreter.createNativeFunction(Date.now, false),
                    Interpreter.NONENUMERABLE_DESCRIPTOR);

                interpreter.setProperty(interpreter.DATE, 'parse',
                    interpreter.createNativeFunction(Date.parse, false),
                    Interpreter.NONENUMERABLE_DESCRIPTOR);

                interpreter.setProperty(interpreter.DATE, 'UTC', interpreter.createNativeFunction(Date.UTC, false),
                    Interpreter.NONENUMERABLE_DESCRIPTOR);

                // Instance methods on Date.
                var functions = ['getDate', 'getDay', 'getFullYear', 'getHours',
                    'getMilliseconds', 'getMinutes', 'getMonth', 'getSeconds', 'getTime',
                    'getTimezoneOffset', 'getUTCDate', 'getUTCDay', 'getUTCFullYear',
                    'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth',
                    'getUTCSeconds', 'getYear',
                    'setDate', 'setFullYear', 'setHours', 'setMilliseconds',
                    'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate',
                    'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes',
                    'setUTCMonth', 'setUTCSeconds', 'setYear',
                    'toDateString', 'toISOString', 'toJSON', 'toGMTString',
                    'toLocaleDateString', 'toLocaleString', 'toLocaleTimeString',
                    'toTimeString', 'toUTCString'];
                for (var i = 0; i < functions.length; i++) {
                    wrapper = (function (nativeFunc) {
                        return function (this: { data: Date }, _var_args: any) {
                            var date = this.data;
                            if (!(date instanceof Date)) {
                                thisInterpreter.throwException(thisInterpreter.TYPE_ERROR,
                                    nativeFunc + ' not called on a Date');
                            }
                            var args = [];
                            for (var i = 0; i < arguments.length; i++) {
                                args[i] = thisInterpreter.pseudoToNative(arguments[i]);
                            }
                            return (date as any)[nativeFunc].apply(date, args);
                        };
                    })(functions[i]);
                    interpreter.setNativeFunctionPrototype(interpreter.DATE, functions[i], wrapper);
                }
                interpreter.setNativeFunctionPrototype(interpreter.DATE, "toString", function (this: { data: Date }) {
                    browserLog("Date.toString()", this.data);
                    return bmlDate.toString.call(this.data);
                });
                interpreter.setNativeFunctionPrototype(interpreter.DATE, "toLocaleString", function (this: { data: Date }) {
                    browserLog("Date.toLocaleString()", this.data);
                    return bmlDate.toString.call(this.data);
                });
                interpreter.setNativeFunctionPrototype(interpreter.DATE, "toUTCString", function (this: { data: Date }) {
                    browserLog("Date.toUTCString()", this.data);
                    return bmlDate.toUTCString.call(this.data);
                });
            }
            initDate(interpreter, globalObject);
            initString(interpreter, globalObject);
            if (resources.profile === Profile.TrProfileC) {
                interpreter.setProperty(interpreter.STRING, "fromCharCode", interpreter.createNativeFunction(bmlString.shiftJISFromCharCode, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
                interpreter.setNativeFunctionPrototype(interpreter.STRING, "charCodeAt", bmlString.shiftJISCharCodeAt);
            } else {
                interpreter.setProperty(interpreter.STRING, "fromCharCode", interpreter.createNativeFunction(bmlString.eucJPFromCharCode, false), Interpreter.NONENUMERABLE_DESCRIPTOR);
                interpreter.setNativeFunctionPrototype(interpreter.STRING, "charCodeAt", bmlString.eucJPCharCodeAt);
            }
            initNumber(interpreter, globalObject);
        });
        this.resetStack();
    }

    private _isExecuting: boolean;
    // lazyinit
    private browserAPI: BrowserAPI = null!;
    private resources: Resources = null!;
    private content: Content = null!;
    private epg: EPG = null!;
    public constructor() {
        this._isExecuting = false;
    }

    public setupEnvironment(browserAPI: BrowserAPI, resources: Resources, content: Content, epg: EPG): void {
        this.browserAPI = browserAPI;
        this._isExecuting = false;
        this.resources = resources;
        this.content = content;
        this.epg = epg;
        this.reset();
    }

    public addScript(script: string, src?: string): Promise<boolean> {
        try {
            this.interpreter.appendCode(script, src);
        } catch (e) {
            console.error("failed to append script", src, e);
            return Promise.resolve(false);
        }
        return this.runScript();
    }

    exeNum: number = 0;

    async runScript(): Promise<boolean> {
        if (this.isExecuting) {
            throw new Error("this.isExecuting");
        }
        const prevContext = this.content.context;
        let exit = false;
        const exeNum = this.exeNum++;
        interpreterTrace("runScript()", exeNum, prevContext, this.content.context);
        try {
            this._isExecuting = true;
            while (true) {
                interpreterTrace("RUN SCRIPT", exeNum, prevContext, this.content.context);
                try {
                    const r = await this.interpreter.runAsync(500, () => {
                        console.warn("script execution timeout");
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve(true);
                            }, 100);
                        });
                    });
                    interpreterTrace("RETURN RUN SCRIPT", exeNum, r, prevContext, this.content.context);
                    if (r === true) {
                        continue;
                    }
                    if (r === LAUNCH_DOCUMENT_CALLED) {
                        interpreterTrace("browser.launchDocument called.");
                        exit = true;
                    }
                } catch (e) {
                    console.error("unhandled error", exeNum, prevContext, this.content.context, e);
                }
                if (this.content.context !== prevContext) {
                    console.error("context switched", this.content.context, prevContext);
                    exit = true;
                }
                break;
            }
            if (!exit && this.content.context !== prevContext) {
                console.error("context switched", this.content.context, prevContext);
                exit = true;
            }
        } finally {
            interpreterTrace("leave runScript()", exeNum, exit, prevContext, this.content.context);
            if (exit) {
                return true;
            } else {
                this._isExecuting = false;
            }
        }
        return false;
    }

    public get isExecuting() {
        return this._isExecuting;
    }

    public async runEventHandler(funcName: string): Promise<boolean> {
        this.interpreter.appendCode(`___log(\"${funcName}\");${funcName}();`);
        return await this.runScript();
    }

    public destroyStack(): void {
    }

    public resetStack(): void {
        const state = new Interpreter.State(this.interpreter.ast, this.interpreter.globalScope);
        state.done = false;
        this.interpreter.stateStack.length = 0;
        this.interpreter.stateStack[0] = state;
        this._isExecuting = false;
    }
}
