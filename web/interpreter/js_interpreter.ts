// @ts-ignore
import { Interpreter } from "../../JS-Interpreter/interpreter";
import { transpile } from "../../src/transpile_ecm";
import * as BT from "../binary_table";
import { IInterpreter } from "./interpreter";
function sleep(ms: number, callback: () => void) {
    setTimeout(callback, ms);
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
export class JSInterpreter implements IInterpreter {
    interpreter: any;
    public reset() {
        const browser = window.browser;
        this.interpreter = new Interpreter("", (interpreter: any, globalObject: any) => {
            const pseudoConsole = interpreter.nativeToPseudo(console);
            interpreter.setProperty(globalObject, "console", pseudoConsole);
            const pseudoBrowser = interpreter.nativeToPseudo(browser);
            const pseudoStyle = interpreter.createNativeFunction(function elementWrapper(this: any) {
                throw new TypeError("forbidden");
            }, true);

            defineReadOnlyProperty(pseudoStyle, "paddingTop");
            defineReadOnlyProperty(pseudoStyle, "paddingRight");
            defineReadOnlyProperty(pseudoStyle, "paddingBottom");
            defineReadOnlyProperty(pseudoStyle, "paddingLeft");
            defineReadOnlyProperty(pseudoStyle, "borderWidth");
            defineReadOnlyProperty(pseudoStyle, "borderStyle");
            defineRWProperty(pseudoStyle, "left");
            defineRWProperty(pseudoStyle, "top");
            defineRWProperty(pseudoStyle, "width");
            defineRWProperty(pseudoStyle, "height");
            defineReadOnlyProperty(pseudoStyle, "lineHeight");
            defineRWProperty(pseudoStyle, "visibility");
            defineRWProperty(pseudoStyle, "fontFamily");
            defineRWProperty(pseudoStyle, "fontSize");
            defineRWProperty(pseudoStyle, "fontWeight");
            defineReadOnlyProperty(pseudoStyle, "textAlign");
            defineReadOnlyProperty(pseudoStyle, "letterSpacing");
            defineRWProperty(pseudoStyle, "borderTopColorIndex");
            defineRWProperty(pseudoStyle, "borderRightColorIndex");
            defineRWProperty(pseudoStyle, "borderrLeftColorIndex");
            defineRWProperty(pseudoStyle, "borderBottomColorIndex");
            defineRWProperty(pseudoStyle, "backgroundColorIndex");
            defineRWProperty(pseudoStyle, "colorIndex");
            defineRWProperty(pseudoStyle, "grayscaleColorIndex");
            defineReadOnlyProperty(pseudoStyle, "clut");
            defineReadOnlyProperty(pseudoStyle, "resolution");
            defineReadOnlyProperty(pseudoStyle, "displayAspectRatio");
            defineReadOnlyProperty(pseudoStyle, "navIndex");
            defineReadOnlyProperty(pseudoStyle, "navUp");
            defineReadOnlyProperty(pseudoStyle, "navDown");
            defineReadOnlyProperty(pseudoStyle, "navLeft");
            defineReadOnlyProperty(pseudoStyle, "navRight");
            defineRWProperty(pseudoStyle, "usedKeyList");
            function defineReadOnlyProperty(pseudo: any, propName: string) {
                interpreter.setProperty(pseudo.properties["prototype"], propName, Interpreter.VALUE_IN_DESCRIPTOR, {
                    get: interpreter.createNativeFunction(function getSubscribe(this: { data: any }) {
                        return (this.data as any)[propName];
                    }),
                });
            }

            function defineRWProperty(pseudo: any, propName: string) {
                interpreter.setProperty(pseudo.properties["prototype"], propName, Interpreter.VALUE_IN_DESCRIPTOR, {
                    get: interpreter.createNativeFunction(function getSubscribe(this: { data: any }) {
                        return (this.data as any)[propName];
                    }),
                    set: interpreter.createNativeFunction(function getSubscribe(this: { data: any }, value: any) {
                        (this.data as any)[propName] = value;
                    }),
                });
            }

            const pseudoElement = interpreter.createNativeFunction(function elementWrapper(this: any) {
                throw new TypeError("forbidden");
            }, true);
            interpreter.setProperty(pseudoElement.properties["prototype"], "subscribe", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getSubscribe(this: { data: HTMLElement }) {
                    return (this.data as any).subscribe;
                }),
                set: interpreter.createNativeFunction(function getSubscribe(this: { data: HTMLElement }, value: any) {
                    (this.data as any).subscribe = value;
                }),
            });

            defineReadOnlyProperty(pseudoElement, "type");
            defineRWProperty(pseudoElement, "esRef");
            defineRWProperty(pseudoElement, "moduleRef");
            defineReadOnlyProperty(pseudoElement, "messageGroupId");
            defineRWProperty(pseudoElement, "messageId");
            defineRWProperty(pseudoElement, "languageTag");
            defineReadOnlyProperty(pseudoElement, "timeMode");
            defineRWProperty(pseudoElement, "timeValue");
            defineRWProperty(pseudoElement, "objectId");
            // Node
            interpreter.setProperty(pseudoElement.properties["prototype"], "firstChild", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getFirstChild(this: { data: HTMLElement }) {
                    return wrapElement((this.data as any).firstChild);
                }),
            });
            interpreter.setProperty(pseudoElement.properties["prototype"], "lastChild", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getLastChild(this: { data: HTMLElement }) {
                    return wrapElement((this.data as any).lastChild);
                }),
            });
            interpreter.setProperty(pseudoElement.properties["prototype"], "parentNode", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getParentNode(this: { data: HTMLElement }) {
                    return wrapElement((this.data as any).parentNode);
                }),
            });
            interpreter.setProperty(pseudoElement.properties["prototype"], "previousSibling", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getPreviousSibling(this: { data: HTMLElement }) {
                    return wrapElement((this.data as any).previousSibling);
                }),
            });
            interpreter.setProperty(pseudoElement.properties["prototype"], "nextSibling", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getNextSibling(this: { data: HTMLElement }) {
                    return wrapElement((this.data as any).nextSibling);
                }),
            });
            
            interpreter.setProperty(pseudoElement.properties["prototype"], "visibility", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getVisibility(this: { data: HTMLElement }) {
                    return (this.data as any).visibility;
                }),
                set: interpreter.createNativeFunction(function setVisibility(this: { data: HTMLElement }, value: any) {
                    (this.data as any).visibility = value;
                }),
            });
            
            interpreter.setProperty(pseudoElement.properties["prototype"], "data", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getData(this: { data: HTMLElement }) {
                    return (this.data as any).data;
                }),
                set: interpreter.createNativeFunction(function setData(this: { data: HTMLElement }, value: any) {
                    (this.data as any).data = value;
                }),
            });

            interpreter.setProperty(pseudoElement.properties["prototype"], "normalStyle", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getNormalStyle(this: { data: HTMLElement }) {
                    return wrapStyle((this.data as any).normalStyle);
                }),
            });

            interpreter.setNativeFunctionPrototype(pseudoElement, "focus", function focus(this: { data: HTMLElement }) {
                return this.data.focus();
            });

            interpreter.setNativeFunctionPrototype(pseudoElement, "blur", function blur(this: { data: HTMLElement }) {
                return this.data.blur();
            });

            // body
            defineRWProperty(pseudoElement, "invisible");
            // title
            defineReadOnlyProperty(pseudoElement, "text");
            // meta
            defineReadOnlyProperty(pseudoElement, "name");
            defineReadOnlyProperty(pseudoElement, "content");

            defineReadOnlyProperty(pseudoElement, "tagName");


            defineReadOnlyProperty(pseudoElement, "id");
            defineReadOnlyProperty(pseudoElement, "className");
            
            
            interpreter.setProperty(globalObject, "browser", pseudoBrowser);
            interpreter.setProperty(pseudoBrowser, "sleep", interpreter.createAsyncFunction(sleep));
            interpreter.setProperty(pseudoBrowser, "readPersistentArray", interpreter.createNativeFunction(function readPersistentArray(filename: string, structure: string): any[] | null {
                return interpreter.arrayNativeToPseudo(browser.readPersistentArray(filename, structure));
            }));
            interpreter.setProperty(pseudoBrowser, "writePersistentArray", interpreter.createNativeFunction(function writePersistentArray(filename: string, structure: string, data: any[], period?: Date): number {
                return browser.writePersistentArray(filename, structure, interpreter.arrayPseudoToNative(data), period);
            }));
            const pseudoDocument = interpreter.createObjectProto(interpreter.OBJECT_PROTO);
            function wrapElement(elem: HTMLElement | null | undefined) {
                if (elem == null) {
                    return null;
                }
                const elemWrapper = interpreter.createObjectProto(pseudoElement.properties["prototype"]);
                elemWrapper.data = elem;
                return elemWrapper;
            }
            function wrapStyle(style: CSSStyleDeclaration | null | undefined) {
                if (style == null) {
                    return null;
                }
                const wrapper = interpreter.createObjectProto(pseudoStyle.properties["prototype"]);
                wrapper.data = style;
                return wrapper;
            }
            interpreter.setProperty(pseudoDocument, "getElementById", interpreter.createNativeFunction(
                function getElementById(id: string) {
                    return wrapElement(document.getElementById(id));
                }
            ));
            interpreter.setProperty(pseudoDocument, "currentFocus", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getCurrentFocus() {
                    return wrapElement(document.currentFocus);
                })
            });
            interpreter.setProperty(pseudoDocument, "currentEvent", Interpreter.VALUE_IN_DESCRIPTOR, {
                get: interpreter.createNativeFunction(function getCurrentEvent() {
                    if (document.currentEvent == null) {
                        return null;
                    }
                    if (document.currentEvent?.target != null) {
                        const cloned = {...document.currentEvent};
                        (cloned as any).target = null;
                        const pseudo =  interpreter.nativeToPseudo(cloned);
                        interpreter.setProperty(pseudo, "target", wrapElement(document.currentEvent.target));
                        return pseudo;
                    }
                    return interpreter.nativeToPseudo(document.currentEvent);
                })
            });
            interpreter.setProperty(globalObject, "document", pseudoDocument);
            const pseudoBinaryTable = interpreter.createNativeFunction(function BinaryTable(this: any, table_ref: string, structure: string) {
                this.instance = new BT.BinaryTable(table_ref, structure);
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
        
    }
    public constructor(browser: any) {
        this.reset();
    }

    public addScript(script: string, src?: string) {
        const elem = document.createElement("dummy-script");
        elem.textContent = script;//transpile(script);
        document.body.appendChild(elem);
        this.interpreter.appendCode(script);
    }

    public async runScript(): Promise<void> {
        new Promise<void>((resolve, _reject) => {
            if (this.interpreter.run()) {
                setTimeout(() => {
                    this.runScript();
                }, 100);
            } else {
                resolve();
            }
        });
    }

    public async runEventHandler(funcName: string): Promise<void> {
        this.interpreter.appendCode(`console.log(${funcName});${funcName}();`);
        await this.runScript();
    }
}
