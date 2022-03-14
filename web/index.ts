export { };
import { convertCSSPropertyToGet, convertCSSPropertyToSet, parseCSSValue } from "../src/transpile_css";
import { BinaryTable, BinaryTableConstructor } from "./binary_table";
import { overrideString } from "./string"
import { overrideNumber } from "./number"
import { overrideDate } from "./date";
import * as resource from "./resource";
import { fetchLockedResource } from "./resource";
import { aribPNGToPNG } from "../src/arib_png";
import { readCLUT } from "../src/clut";
import { defaultCLUT } from "../src/default_clut";
import { Buffer } from "buffer";
// @ts-ignore
import { JSInterpreter } from "./interpreter/js_interpreter";
import { queueSyncEvent } from "./event";
import { browser, browserStatus } from "./browser";
import { launchDocument } from "./document";

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
        newBinaryTable: any;
        __newBT: any;
    }
    interface Document {
        currentEvent: BMLEvent | null;
        currentFocus: BMLElement | null;
    }
}


if (!window.browser) {
    const videoContainer = document.getElementById("arib-video-container") as HTMLDivElement;
    window.dummy = undefined;
    window.browser = {};
    window.__newBT = function __newBT(klass: any, ...args: any[]) {
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
    }

    window.BinaryTable = BinaryTable;
    function defineAttributeProperty(propertyName: string, attrName: string, nodeName: string, readable: boolean, writable: boolean, defaultValue?: string) {
        Object.defineProperty(HTMLElement.prototype, propertyName, {
            get: readable ? function (this: HTMLElement): string | undefined | null {
                if (this.nodeName !== nodeName) {
                    return undefined;
                }
                const v = this.getAttribute(attrName);
                if (defaultValue != null) {
                    if (v == null || v == "") {
                        return defaultValue;
                    }
                }
                return v;
            } : undefined,
            set: writable ? function (this: HTMLElement, value: any): void {
                if (this.nodeName !== nodeName) {
                    (this as any)[propertyName] = value;
                    return;
                }
                this.setAttribute(attrName, value);
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
            return (this as HTMLElement).getAttribute("subscribe")?.match(/^subscribe$/i) != null;
        },
        set: function (v: boolean) {
            if (v) {
                (this as HTMLElement).setAttribute("subscribe", "subscribe");
            } else {
                (this as HTMLElement).removeAttribute("subscribe");
            }
        },
    });

    Object.defineProperty(HTMLBodyElement.prototype, "invisible", {
        get: function () {
            return (this as HTMLElement).getAttribute("invisible")?.match(/^invisible$/i) != null;
        },
        set: function (v: boolean) {
            if (v) {
                document.getElementById("arib-video-invisible-container")?.appendChild(videoContainer);
                (this as HTMLElement).setAttribute("invisible", "invisible");
            } else {
                const obj = document.body.querySelector("[arib-type=\"video/X-arib-mpeg2\"]");
                if (obj != null) {
                    obj.appendChild(videoContainer);
                }
                (this as HTMLElement).removeAttribute("invisible");
            }
        },
    });

    HTMLElement.prototype.focus = function focus(options?: FocusOptions) {
        const prevFocus = document.currentFocus;
        if (prevFocus === this as BMLElement) {
            return;
        }
        if (window.getComputedStyle(this).visibility === "hidden") {
            return;
        }
        document.currentFocus = this as BMLElement;
        queueSyncEvent({ type: "focus", target: this });
        if (prevFocus != null) {
            queueSyncEvent({ type: "blur", target: prevFocus });
        }
    };

    Object.defineProperty(Document.prototype, "currentFocus", {
        get: function () { return this._currentFocus; },
        set: function (elem: BMLElement) {
            this._currentFocus = elem;
        }
    });

    Object.defineProperty(HTMLElement.prototype, "normalStyle", {
        get: function () {
            return new Proxy({ element: this as HTMLElement }, {
                get(obj, propName) {
                    const style = (document.defaultView?.getComputedStyle(obj.element) ?? obj.element.style);
                    const value = convertCSSPropertyToGet(propName as string, style);
                    if (value == null && !(propName in style)) {
                        console.error("invalid css", obj.element.style, propName);
                    }
                    return value;
                },
                set(obj, propName, value) {
                    // inline styleを変更?
                    const converted = convertCSSPropertyToSet(propName as string, value, obj.element.style);
                    if (propName === "grayscaleColorIndex") {
                        return true;
                    }
                    if (propName === "visibility" && document.currentFocus === obj.element && value === "hidden") {
                        obj.element.blur();
                    }
                    if (converted) {
                        return true;
                    }
                    if (!(propName in obj.element.style)) {
                        console.error("invalid css", obj.element.style, propName, value);
                    }
                    obj.element.style[propName as any] = value;
                    return true;
                }
            });
        }
    });

    function reloadObjectElement(obj: HTMLObjectElement) {
        // chromeではこうでもしないとtypeの変更が反映されない
        // バグかも
        const dummy = document.createElement("dummy");
        obj.appendChild(dummy);
        dummy.remove();
    }
    Object.defineProperty(HTMLObjectElement.prototype, "data", {
        get: function getObjectData(this: HTMLObjectElement) {
            const aribData = this.getAttribute("arib-data");
            if (aribData == null || aribData == "") {
                return this.getAttribute("data");
            }
            return aribData;
        },
        set: async function setObjectData(this: HTMLObjectElement, v: string | null): Promise<void> {
            if (v == null) {
                this.removeAttribute("data");
                this.removeAttribute("arib-data");
                return;
            }
            const aribType = this.getAttribute("arib-type");
            this.setAttribute("arib-data", v);
            if (v == "") {
                this.setAttribute("data", v);
                return;
            }
            // 順序が逆転するのを防止
            (this as any).__version = ((this as any).__version ?? 0) + 1;
            const version: number = (this as any).__version;
            const fetched = await resource.fetchResourceAsync(v);
            if (!fetched) {
                return;
            }
            if ((this as any).__version !== version) {
                return;
            }

            if ((aribType ?? this.type).match(/image\/X-arib-png/i)) {
                if (!aribType) {
                    this.setAttribute("arib-type", this.type);
                }
                this.type = "image/png";
                const clutCss = document.defaultView?.getComputedStyle(this)?.getPropertyValue("--clut");
                const clutUrl = clutCss == null ? null : parseCSSValue("http://localhost" + (resource.activeDocument ?? ""), clutCss);
                const fetchedClut = clutUrl == null ? null : (await resource.fetchResourceAsync(clutUrl))?.data;
                if ((this as any).__version !== version) {
                    return;
                }
                const cachedBlob = fetched.blobUrl.get(fetchedClut);
                if (cachedBlob != null) {
                    this.setAttribute("data", cachedBlob);
                } else {
                    const clut = fetchedClut == null ? defaultCLUT : readCLUT(Buffer.from(fetchedClut?.buffer));
                    const png = aribPNGToPNG(Buffer.from(fetched.data), clut);
                    const blob = new Blob([png], { type: "image/png" });
                    const b = URL.createObjectURL(blob);
                    this.setAttribute("data", b);
                    fetched.blobUrl.set(fetchedClut, b);
                }
            } else {
                this.setAttribute("data", resource.getCachedFileBlobUrl(fetched));
            }
            if (!aribType) {
                reloadObjectElement(this);
            }
        }
    });

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

    // const interpreter = new NativeInterpreter(browser);
    const interpreter = new JSInterpreter(browser);
    browserStatus.interpreter = interpreter;
    resource.fetchResourceAsync("/40/0000/startup.bml").then(() => {
        launchDocument("/40/0000/startup.bml");
    });
}
