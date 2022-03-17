export { };
import { BinaryTableConstructor } from "./binary_table";
import * as resource from "./resource";
// @ts-ignore
import { JSInterpreter } from "./interpreter/js_interpreter";
import { browser, browserStatus } from "./browser";
import { launchDocument } from "./document";
import { BML } from "./interface/DOM";

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


if (!window.browser) {
    window.dummy = undefined;
    window.browser = {};
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

    // const interpreter = new NativeInterpreter(browser);
    const interpreter = new JSInterpreter(browser);
    browserStatus.interpreter = interpreter;
    resource.fetchResourceAsync("/40/0000/startup.bml").then(() => {
        launchDocument("/40/0000/startup.bml");
    });
}
