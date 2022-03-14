// @ts-ignore
import { Interpreter } from "../../JS-Interpreter/interpreter";
import * as BT from "../binary_table";
import { IInterpreter } from "./interpreter";
import * as context from "../context";
import { launchDocument as documentLaunchDocument } from "../document";

function sleep(ms: number, callback: (result: any, resolveValue: any) => void) {
    console.log("SLEEP ", ms);
    setTimeout(() => {
        console.log("END SLEEP ", ms);
        callback(1, true);
    }, ms);
}

const LAUNCH_DOCUMENT_CALLED = {};

function launchDocument(documentName: string, transitionStyle: string | undefined, callback: (result: any, promiseValue: any) => void): void {
    console.log("%claunchDocument", "font-size: 4em", documentName, transitionStyle);
    const r = documentLaunchDocument(documentName);
    callback(r, LAUNCH_DOCUMENT_CALLED);
}
/*
 * Object
 * Function
 * Array
 * String
 * Boolean
 * Number
 * Date
 * Math (運用しない)
 * document
 *   close()
 *   getElementById()
 *   currentFocus R
 *   currentEvent R
 * HTMLElement
 *   id R
 *   className R
 * HTMLAnchorElement
 *   accessKey R
 *   href RW
 * CSVTable (運用しない)
 * BinaryTable
 * browser
 * XMLDoc (Class.XMLDocが1であればサポート)
 * navigator (運用しない)
 */

import { BML } from "../interface/DOM";
import { BMLCSS2Properties } from "../interface/BMLCSS2Properties";
import { Browser } from "../browser";
import { queueSyncEvent } from "../event";

export class JSInterpreter implements IInterpreter {
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
                    console.debug("get", name, this.data);
                    const result = get.bind(this.data)();
                    console.debug("=>", result);
                    if (result != null && nativeProtoToPseudoObject.has(Object.getPrototypeOf(result))) {
                        return domObjectToPseudo(interpreter, result);
                    }
                    return result;
                });
            }
            if (set) {
                pseudoDesc.set = interpreter.createNativeFunction(function wrap(this: { data: any }, value: any) {
                    console.debug("set", name, value, this.data);
                    set.bind(this.data)(value);
                });
            }

            if (typeof value === "function") {
                pseudoDesc.value = interpreter.createNativeFunction(function wrap(this: { data: any }, ...args: any[]) {
                    console.debug("call", name, value, this.data, args);
                    const result = value.bind(this.data)(...args);
                    console.debug("=>", result);
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
        interpreter.setProperty(globalObject, "HTMLObjectElement", this.domClassToPseudo(interpreter, BML.HTMLObjectElement));
        interpreter.setProperty(globalObject, "BMLObjectElement", this.domClassToPseudo(interpreter, BML.BMLObjectElement));
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

        function focus(this: BML.HTMLElement) {
            const prevFocus = BML.document.currentFocus;
            if (prevFocus === this) {
                return;
            }
            if (window.getComputedStyle(this["node"]).visibility === "hidden") {
                return;
            }
            BML.document._currentFocus = this;
            queueSyncEvent({ type: "focus", target: this["node"] });
            if (prevFocus != null) {
                queueSyncEvent({ type: "blur", target: prevFocus["node"] });
            }
        };
        BML.BMLSpanElement.prototype.focus = focus;
        BML.BMLDivElement.prototype.focus = focus;
        BML.BMLParagraphElement.prototype.focus = focus;
        BML.BMLObjectElement.prototype.focus = focus;
        BML.BMLInputElement.prototype.focus = focus;
    }

    public reset() {
        const browser = this.browser;
        this.interpreter = new Interpreter("", (interpreter: any, globalObject: any) => {
            interpreter.setProperty(globalObject, "___log", interpreter.createNativeFunction(function log(log: string) {
                console.log(log);
            }));
            const pseudoBrowser = interpreter.nativeToPseudo(browser);
            for (let i = 0; i < 64; i++) {
                function defineRW2(pseudo: any, propName: string) {
                    interpreter.setProperty(pseudo, propName, Interpreter.VALUE_IN_DESCRIPTOR, {
                        get: interpreter.createNativeFunction(function getSubscribe(this: { data: any }) {
                            return (browser.Greg as any)[propName];
                        }),
                        set: interpreter.createNativeFunction(function getSubscribe(this: { data: any }, value: any) {
                            (browser.Greg as any)[propName] = value;
                        }),
                    });
                }

                function defineRW3(pseudo: any, propName: string) {
                    interpreter.setProperty(pseudo, propName, Interpreter.VALUE_IN_DESCRIPTOR, {
                        get: interpreter.createNativeFunction(function getSubscribe(this: { data: any }) {
                            return (browser.Ureg as any)[propName];
                        }),
                        set: interpreter.createNativeFunction(function getSubscribe(this: { data: any }, value: any) {
                            (browser.Ureg as any)[propName] = value;
                        }),
                    });
                }
                defineRW2(interpreter.getProperty(pseudoBrowser, "Greg"), i.toString());
                defineRW3(interpreter.getProperty(pseudoBrowser, "Ureg"), i.toString());
            }

            interpreter.setProperty(globalObject, "browser", pseudoBrowser);
            interpreter.setProperty(pseudoBrowser, "sleep", interpreter.createAsyncFunction(sleep));
            interpreter.setProperty(pseudoBrowser, "launchDocument", interpreter.createAsyncFunction(launchDocument));
            interpreter.setProperty(pseudoBrowser, "readPersistentArray", interpreter.createNativeFunction(function readPersistentArray(filename: string, structure: string): any[] | null {
                return interpreter.arrayNativeToPseudo(browser.readPersistentArray(filename, structure));
            }));
            interpreter.setProperty(pseudoBrowser, "writePersistentArray", interpreter.createNativeFunction(function writePersistentArray(filename: string, structure: string, data: any[], period?: Date): number {
                return browser.writePersistentArray(filename, structure, interpreter.arrayPseudoToNative(data), period);
            }));

            this.registerDOMClasses(interpreter, globalObject);
            interpreter.setProperty(globalObject, "document", this.domObjectToPseudo(interpreter, BML.document));

            const pseudoBinaryTable = interpreter.createNativeFunction(function BinaryTable(this: any, table_ref: string, structure: string) {
                try {
                    this.instance = new BT.BinaryTable(table_ref, structure);
                } catch (e) {
                    console.error("BT", e);
                    return null;
                }
                return this;
            }, true);
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
        });
        this.resetStack();
    }

    _isExecuting: boolean;
    browser: Browser;
    public constructor(browser: any) {
        this.browser = browser;
        this._isExecuting = false;
        this.reset();
    }

    public addScript(script: string, src?: string): Promise<boolean> {
        const elem = document.createElement("arib-script");
        elem.textContent = script;//transpile(script);
        document.body.appendChild(elem);
        this.interpreter.appendCode(script);
        return this.runScript();
    }

    async runScript(): Promise<boolean> {
        if (this.isExecuting) {
            throw new Error("this.isExecuting");
        }
        const prevContext = context.currentContext;
        let exit = false;
        try {
            this._isExecuting = true;
            while (true) {
                const r = await this.interpreter.runAsync();
                if (r === true) {
                    continue;
                }
                if (r === LAUNCH_DOCUMENT_CALLED) {
                    console.info("browser.launchDocument called.");
                    exit = true;
                } else if (context.currentContext !== prevContext) {
                    console.info("context switched");
                    exit = true;
                }
                break;
            }
            if (context.currentContext !== prevContext) {
                console.info("context switched");
                exit = true;
            }
        } finally {
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
        this.interpreter.appendCode(`___log(${funcName});${funcName}();`);
        return await this.runScript();
    }

    public destroyStack(): void {
        this.resetStack();
    }

    public resetStack(): void {
        const state = new Interpreter.State(this.interpreter.ast, this.interpreter.globalScope);
        state.done = false;
        this.interpreter.stateStack.length = 0;
        this.interpreter.stateStack[0] = state;
        this._isExecuting = false;
    }
}
