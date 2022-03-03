export { };
import css from 'css';

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
    interface Window { browser: any; }
    interface Document {
        currentEvent: BMLEvent | null;
        currentFocus: BMLElement | null;
    }
}

if (!window.browser) {
    window.browser = {};
    window.browser.setCurrentDateMode = function setCurrentDateMode(mode: number) {
        console.log("setCurrentDateMode", mode);
    };
    window.browser.unlockModuleOnMemory = function unlockModuleOnMemory(module: string): number {
        console.log("unlockModuleOnMemory", module);
        return 1; // NaN => fail
    };
    window.browser.lockModuleOnMemory = function lockModuleOnMemory(module: string): number {
        console.log("lockModuleOnMemory", module);
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
                    eval(onoccur);
                    document.currentEvent = null;
                }
            }
        }
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
    }
    window.browser.Greg = new Array(256);
    window.browser.Greg.fill("");
    window.browser.setInterval = function setInterval(evalCode: string, a: number, b: number) {
        console.log("setInterval", evalCode, a, b);
        setTimeout(() => {
            eval(evalCode);
        }, a);
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
    }
    window.addEventListener('load', (event) => {
        const config = { attributes: true, childList: true, subtree: true };

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

        observer.observe(document.body, config);
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
        document.querySelectorAll("arib-script").forEach(script => {
            const newScript = document.createElement("script");
            newScript.textContent = script.textContent;
            script.parentElement?.appendChild(newScript);
        });
    });
}