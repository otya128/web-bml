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
        dummy: any;
        BinaryTable: BinaryTableConstructor;
    }
    interface Document {
        currentEvent: BMLEvent | null;
        currentFocus: BMLElement | null;
    }
}


if (!window.browser) {
    window.dummy = undefined;
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
    window.browser.unlockModuleOnMemoryEx = function unlockModuleOnMemoryEx(module: string): number {
        console.log("unlockModuleOnMemoryEx", module);
        return 1; // NaN => fail
    };
    window.browser.unlockAllModulesOnMemory = function unlockAllModulesOnMemory(): number {
        console.log("unlockAllModulesOnMemory");
        return 1; // NaN => fail
    };
    window.browser.lockModuleOnMemory = function lockModuleOnMemory(module: string): number {
        console.log("lockModuleOnMemory", module);
        if (module.startsWith("/50/")) {
            return -1;
        }
        window.postMessage({ module }, "*");
        return 1;
    }
    window.addEventListener("message", (e) => {
        const module: string = e.data.module as string;
        console.log("ModuleLocked", module);
        const moduleLocked = document.querySelectorAll("beitem[type=\"ModuleLocked\"]");
        for (const beitem of Array.from(moduleLocked)) {
            if (beitem.getAttribute("subscribe") !== "subscribe") {
                continue;
            }
            const moduleRef = beitem.getAttribute("module_ref");
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
                        moduleRef: module,
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
    window.browser.lockModuleOnMemoryEx = function lockModuleOnMemoryEx(module: string): number {
        console.log("lockModuleOnMemoryEx", module);
        if (module.startsWith("/50/")) {
            return -1;
        }
        window.postMessage({ module }, "*");
        return 1;
    }
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
        return [];
        if (filename === "nvram://receiverinfo/zipcode") {
            if (structure === "S:7B") {
                return ["000000"];
            }
        }
        console.log("readPersistentArray", filename, structure);
        return null;
    };
    window.browser.getActiveDocument = function getActiveDocument(): string | null {
        return location.pathname;
    }
    window.browser.getProgramID = function getProgramID(type: number): string | null {
        if (type == 2) {
            return "0xDC00";
        }
        return null;
    }
    window.browser.sleep = function sleep(interval: number): number | null {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/api/sleep?ms=" + interval, false);
        xhr.send(null);
        return 1;
    }
    window.browser.detectComponent = function detectComponent(component_ref: string): number | null {
        console.log("detectComponent", component_ref);
        return 1;
    }
    window.browser.loadDRCS = function loadDRCS(loadDRCS: string): Number {
        console.log("loadDRCS", loadDRCS);
        return 1;
    };
    window.browser.playRomSound = function playRomSound(soundID: string): Number {
        console.log("playRomSound", soundID);
        return 1;
    };
    window.browser.Ureg = new Array(64);
    window.browser.Ureg.fill("");
    window.browser.Greg = new Array(64);
    window.browser.Greg.fill("");
    window.browser.setInterval = function setInterval(evalCode: string, msec: number, iteration: number): number {
        const handle = window.setInterval(() => {
            iteration--;
            eval(evalCode);
            if (iteration === 0) {
                window.clearInterval(handle);
            }
        }, msec);
        console.log("setInterval", evalCode, msec, iteration, handle);
        return handle;
    }
    window.browser.clearTimer = function setInterval(timerID: number): number {
        console.log("clearTimer", timerID);
        window.clearInterval(timerID);
        return 1;
    }
    Object.defineProperty(HTMLElement.prototype, "moduleRef", {
        get: function () {
            return (this as HTMLElement).getAttribute("module_ref");
        },
        set: function (v: string) {
            (this as HTMLElement).setAttribute("module_ref", v);
        },
    });
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
    function parseCSSValue(value: string): string | null {
        const uriMatch = /url\("?(?<uri>.+?)"?\)/.exec(value);
        if (uriMatch?.groups == null) {
            return null;
        }
        const uri = uriMatch.groups["uri"].replace(/\\/g, "");
        return new URL(uri, location.href).pathname;
    }
    Object.defineProperty(HTMLElement.prototype, "normalStyle", { get: function () { return this.style; } })
    function processRule(node: css.Node): undefined | string {
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
                let clut: string | undefined;
                for (const decl of rule.declarations) {
                    let c = processRule(decl);
                    if (c) {
                        clut = c;
                    }
                }
                if (clut) {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", window.encodeURIComponent(clut) + "?css", false);
                    xhr.onload = (e) => {
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200) {
                                const a = JSON.parse(xhr.response);
                                for (const i of a) {
                                    rule.declarations?.push(i);
                                }
                            }
                        }
                    };
                    xhr.send(null);
                }
            }
        } else if (node.type == "declaration") {
            const decl = node as css.Declaration;
            if (decl.property === "clut") {
                decl.property = "--" + decl.property;
                return decl.value;
            } else if (decl.property == "background-color-index") {
                decl.property = "background-color";
                decl.value = "var(--clut-color-" + decl.value + ")";
            } else if (decl.property == "color-index") {
                decl.property = "color";
                decl.value = "var(--clut-color-" + decl.value + ")";
            }
        }
    }

    window.addEventListener('load', (event) => {
        const config = { attributes: true, childList: true, subtree: true };

        Object.defineProperty(HTMLObjectElement.prototype, "data", {
            get: function getObjectData() {
                return this.getAttribute("data");
            },
            set: function setObjectData(v: string) {
                if (v.startsWith("~/")) {
                    v = ".." + v.substring(1);
                }
                if ((this.getAttribute("arib-type") ?? this.type).match(/image\/X-arib-png/i)) {
                    this.type = "image/png";
                    const clut = document.defaultView?.getComputedStyle(this)?.getPropertyValue("--clut");
                    if (clut && !v.includes("?clut=")) {
                        v = v + "?clut=" + window.encodeURIComponent(parseCSSValue(clut) ?? "");
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
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName === "object") {
                            const obj = node as HTMLObjectElement;
                            if (!obj.type.match(/image\/X-arib-png/i)) {
                                return;
                            }
                            const clut = document.defaultView?.getComputedStyle(obj)?.getPropertyValue("--clut");
                            if (!clut) {
                                return;
                            }
                            if (!obj.data) {
                                return;
                            }
                            obj.setAttribute("arib-type", obj.type);
                            obj.type = "image/png";
                            if (!obj.data.includes("?clut="))
                                obj.data = obj.data + "?clut=" + window.encodeURIComponent(parseCSSValue(clut) ?? "");
                            obj.outerHTML = obj.outerHTML;
                        }
                    });
                }
                if (mutation.type === "attributes"&&0) {
                    if (mutation.attributeName === "data" && mutation.target.nodeName === "object") {
                        const obj = mutation.target as HTMLObjectElement;
                        if (!(obj.getAttribute("arib-type") ?? obj.type).match(/image\/X-arib-png/i)) {
                            continue;
                        }
                        const clut = document.defaultView?.getComputedStyle(obj)?.getPropertyValue("--clut");
                        if (!clut) {
                            continue;
                        }
                        if (!obj.data.includes("?clut="))
                            obj.data = obj.data + "?clut=" + window.encodeURIComponent(parseCSSValue(clut) ?? "");
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
        document.querySelectorAll("[style]").forEach(style => {
            const styleAttribute = style.getAttribute("style");
            if (!styleAttribute) {
                return;
            }
            const parsed = css.parse("*{" + styleAttribute + "}");
            if (!parsed) {
                return;
            }
            processRule(parsed);
            let a = css.stringify(parsed, { compress: true });
            a = a.replace(/^\*\{|\}$/g, "");
            style.setAttribute("style", a);
        });
        document.querySelectorAll("object").forEach(obj => {
            if (!obj.type.match(/image\/X-arib-png/i)) {
                return;
            }
            const clut = document.defaultView?.getComputedStyle(obj)?.getPropertyValue("--clut");
            if (!clut) {
                return;
            }
            if (!obj.data) {
                return;
            }
            obj.setAttribute("arib-type", obj.type);
            obj.type = "image/png";
            if (!obj.data.includes("?clut="))
                obj.data = obj.data + "?clut=" + window.encodeURIComponent(parseCSSValue(clut) ?? "");
            obj.outerHTML = obj.outerHTML;
        });
    });
}