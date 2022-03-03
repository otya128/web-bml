export { };
import css from 'css';
import { BinaryTable, BinaryTableConstructor } from "./binary_table";

interface BMLEvent {
    type: string;
    target: HTMLElement;
}


type BMLObjectElement = HTMLObjectElement;

interface BMLBeventEvent extends BMLEvent {
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

type BMLElement = HTMLElement;
declare global {
    interface Window {
        browser: any;
        BinaryTable: BinaryTableConstructor;
    }
    interface Document {
        currentEvent: BMLEvent | null;
        currentFocus: BMLElement | null;
    }
}


if (!window.browser) {
    window.browser = {};

    window.BinaryTable = BinaryTable;
    window.browser.setCurrentDateMode = function setCurrentDateMode(mode: number) {
        console.log("setCurrentDateMode", mode);
    };
    window.browser.subDate = function subDate(target: Date, base: Date, unit: Number) {
        const sub = target.getDate() - base.getDate();
        if (unit == 1) {
            return (sub / 1000) | 0;
        } else if (unit == 2) {
            return (sub / (1000 * 60)) | 0;
        } else if (unit == 3) {
            return (sub / (1000 * 60 * 60)) | 0;
        } else if (unit == 4) {
            return (sub / (1000 * 60 * 60 * 24)) | 0;
        } else if (unit == 5) {
            return (sub / (1000 * 60 * 60 * 24 * 7)) | 0;
        }
        return sub | 0;
    }
    window.browser.unlockModuleOnMemory = function unlockModuleOnMemory(module: string): number {
        console.log("unlockModuleOnMemory", module);
        return 1; // NaN => fail
    };
    window.browser.lockModuleOnMemory = function lockModuleOnMemory(module: string): number {
        console.log("lockModuleOnMemory", module);
        setTimeout(() => {
            const moduleLocked = document.querySelectorAll("beitem[type=\"ModuleLocked\"]");
            for (const beitem of Array.from(moduleLocked)) {
                const moduleRef = beitem.getAttribute("module_ref");
                if (!moduleRef) {
                    continue;
                }
                if (moduleRef === module) {
                    const onoccur = beitem.getAttribute("onoccur");
                    if (onoccur) {
                        document.currentEvent = {
                            type: "ModuleLocked",
                            target: beitem as HTMLElement,
                            status: 0,
                            privateData: "",
                            esRef: "",
                            messageId: "0",
                            messageVersion: "0",
                            messageGroupId: "0",
                            moduleRef: moduleRef,
                            languageTag: 0,//?
                            registerId: 0,
                            serviceId: "0",
                            eventId: "0",
                            peripheralRef: "",
                            object: null,
                            segmentId: null,
                        } as BMLBeventEvent;
                        new Function(onoccur)();//eval.call(window, onoccur);
                        document.currentEvent = null;
                    }
                }
            }
        });
        return 1; // negative or NaN => fail
    };
    window.browser.lockScreen = function lockScreen() {
        console.log("lockScreen");
    };
    window.browser.unlockScreen = function unlockScreen() {
        console.log("unlockScreen");
    };
    window.browser.getBrowserSupport = function getBrowserSupport(sProvider: string, functionname: string, additionalinfo?: string): number {
        console.log("getBrowserSupport", sProvider, functionname, additionalinfo);
        return 0;
    };
    window.browser.launchDocument = function launchDocument(documentName: string, transitionStyle: string): number {
        location.href = documentName;
        return 0;
    };
    window.browser.readPersistentArray = function readPersistentArray(filename: string, structure: string): any[] | null {
        console.log("readPersistentArray", filename, structure);
        return null;
    };
    window.browser.Ureg = new Array(64);
    window.browser.Ureg.fill("");
    window.browser.Ureg = new Array(64);
    window.browser.Ureg.fill("");
    window.browser.setInterval = function setInterval(evalCode: string, msec: number, iteration: number) {
        console.log("setInterval", evalCode, msec, iteration);
        setTimeout(() => {
            eval(evalCode);
        }, msec);
    }
    Object.defineProperty(HTMLElement.prototype, "normalStyle", { get: function () { return this.style; } })
    function processRule(node: css.Node) {
        if (node.type === "stylesheet") {
            const stylesheet = node as css.Stylesheet;
            if (stylesheet.stylesheet) {
                for (const rule of stylesheet.stylesheet.rules) {
                    processRule(rule);
                }
            }
        } else if (node.type === "rule") {
            const rule = node as css.Rule;
            if (rule.declarations) {
                for (const decl of rule.declarations) {
                    processRule(decl);
                }
            }
        } else if (node.type == "declaration") {
            const decl = node as css.Declaration;
            if (decl.property === "clut") {
                decl.property = "--" + decl.property;
            }
        }
    } 3

    window.addEventListener('load', (event) => {
        const config = { attributes: true, childList: true, subtree: true };

        Object.defineProperty(HTMLObjectElement.prototype, "data", {
            get: function getObjectData() {
                return this.getAttribute("data");
            },
            set: function setObjectData(v) {
                if (v.startsWith("~/")) {
                    v = ".." + v.substring(1);
                }
                if ((this.getAttribute("arib-type") ?? this.type).match(/image\/X-arib-png/i)) {
                    const clut = document.defaultView?.getComputedStyle(this)?.getPropertyValue("--clut");
                    if (clut) {
                        v = v + "?clut=" + window.encodeURIComponent(clut);
                    }
                }
                if (this.getAttribute("data") === v) {
                    return;
                }
                this.setAttribute("data", v);
            }
        });
        const observer = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === "attributes") {
                    if (mutation.attributeName === "data" && mutation.target.nodeName === "object") {
                        const obj = mutation.target as HTMLObjectElement;
                        if (!(obj.getAttribute("arib-type") ?? obj.type).match(/image\/X-arib-png/i)) {
                            continue;
                        }
                        const clut = document.defaultView?.getComputedStyle(obj)?.getPropertyValue("--clut");
                        if (!clut) {
                            continue;
                        }
                        obj.data = obj.data + "?clut=" + window.encodeURIComponent(clut);
                        obj.outerHTML = obj.outerHTML;
                    }
                }
            }
        });

        //observer.observe(document.body, config);
        document.querySelectorAll("arib-style").forEach(style => {
            if (style.textContent) {
                const parsed = css.parse(style.textContent);
                processRule(parsed);
                const newStyle = document.createElement("style");
                newStyle.textContent = css.stringify(parsed);
                style.parentElement?.appendChild(newStyle);
            }
        });
        document.querySelectorAll("object").forEach(obj => {
            if (!obj.type.match(/image\/X-arib-png/i)) {
                return;
            }
            const clut = document.defaultView?.getComputedStyle(obj)?.getPropertyValue("--clut");
            if (!clut) {
                return;
            }
            obj.setAttribute("arib-type", obj.type);
            obj.type = "image/png";
            obj.data = obj.data + "?clut=" + window.encodeURIComponent(clut);
            obj.outerHTML = obj.outerHTML;
        });
    });
}