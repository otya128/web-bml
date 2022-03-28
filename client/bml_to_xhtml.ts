import { XMLBuilder, XMLParser } from "fast-xml-parser";

// DOMParserは厳格すぎてゆるいBMLをパース出来ない
function cloneAndRenameNode(document: Document, node: Element, renameTo: string): Node {
    const cloned = document.createElement(renameTo);
    for (const attr of Array.from(node.attributes)) {
        cloned.setAttribute(attr.name, attr.value);
    }
    cloned.replaceChildren(...Array.from(node.childNodes));
    return cloned;
}

export function bmlToXHTML(data: string): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "application/xhtml+xml");
    doc.querySelectorAll("*").forEach(node => {
        const nodeName = node.nodeName;
        const children = node.childNodes;
        for (const cc of Array.from(children)) {
            const prev = cc.previousSibling?.nodeName;
            const next = cc.nextSibling?.nodeName;
            if (cc.nodeName === "#comment") {
                // Comment interfaceは運用されない
                cc.remove();
                continue;
            } else if (cc.nodeName === "#text") {
                const c = cc as Text;
                if ((prev === "span" || prev === "a") && nodeName === "p") {
                    c.data = c.data.replace(/^([ \t\n\r] +)/g, " ");
                    if ((next === "span" || next === "a" || next === "br") && nodeName === "p") {
                        c.data = c.data.replace(/([ \t\n\r] +)$/g, " ");
                        c.data = c.data.replace(/(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                    }
                } else if ((next === "span" || next === "a" || next === "br") && nodeName === "p") {
                    c.data = c.data.replace(/([ \t\n\r] +)$/g, " ");
                    c.data = c.data.replace(/^([ \t\n\r]+)|(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                } else {
                    // 制御符号は0x20, 0x0d, 0x0a, 0x09のみ
                    // 2バイト文字と2バイト文字との間の制御符号は削除する
                    c.data = c.data.replace(/^([ \t\n\r]+)|([ \t\n\r] +)$|(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                }
            }
        }
        if (nodeName == "script") {
            node.replaceWith(cloneAndRenameNode(doc, node, "arib-script"));
        }
        if (nodeName == "style") {
            node.replaceWith(cloneAndRenameNode(doc, node, "arib-style"));
        }
        if (nodeName == "link") {
            node.replaceWith(cloneAndRenameNode(doc, node, "arib-link"));
        }
        if (nodeName == "object") {
            if (node.getAttribute("type")?.toLowerCase() === "video/x-arib-mpeg2") {
                node.setAttribute("arib-type", node.getAttribute("type")!);
                node.setAttribute("type", "unknown/unknown");
            }
            if (node.getAttribute("type")?.toLowerCase() === "image/x-arib-png") {
                node.setAttribute("arib-type", node.getAttribute("type")!);
                node.setAttribute("type", "image/png");
            }
            if (node.getAttribute("data") != null) {
                node.setAttribute("arib-data", node.getAttribute("data")!);
                node.removeAttribute("data");
            }
        }
        if (node.getAttribute("onload") != null) {
            node.setAttribute("arib-onload", node.getAttribute("onload")!);
            node.removeAttribute("onload");
        }
        if (node.getAttribute("data") != null) {
            node.setAttribute("arib-onload", node.getAttribute("onload")!);
            node.removeAttribute("onload");
        }
    });
    return doc;
}

function findXmlNode(xml: any[], nodeName: string): any {
    const result = [];
    for (const i of xml) {
        if (getXmlNodeName(i) === nodeName) {
            result.push(i);
            break;
        }
    }
    return result;
}

function renameXmlNode(node: any, name: string) {
    const oldName = getXmlNodeName(node);
    if (!oldName) {
        return;
    }
    node[name] = node[oldName];
    delete node[oldName];
}

function getXmlNodeName(node: any): string | null {
    for (const k of Object.getOwnPropertyNames(node)) {
        if (k === ":@") {
            continue;
        }
        return k;
    }
    return null;
}

function getXmlChildren(node: any): any[] {
    const name = getXmlNodeName(node);
    if (!name || name?.startsWith("#")) {
        return []
    }
    return node[name];
}

function visitXmlNodes(node: any, callback: (node: any) => void) {
    callback(node);
    for (const child of getXmlChildren(node)) {
        visitXmlNodes(child, callback);
    }
}

export function bmlToXHTMLFXP(data: string): string {
    const opts = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        preserveOrder: true,
        cdataPropName: "#cdata",
        trimValues: false,
        parseTagValue: false,
    };
    const parser = new XMLParser(opts);
    const parsed = parser.parse(data);
    const bmlRoot = findXmlNode(parsed, "bml")[0];
    const htmlChildren = bmlRoot["bml"];
    visitXmlNodes(bmlRoot, (node) => {
        const children = getXmlChildren(node);
        const nodeName = getXmlNodeName(node);
        for (let i = 0; i < children.length; i++) {
            const c = children[i];
            const prev = i > 0 ? getXmlNodeName(children[i - 1]) : "";
            const next = i + 1 < children.length ? getXmlNodeName(children[i + 1]) : "";
            // STD-B24 第二分冊(2/2) 第二編 付属2 5.3.2参照
            if ("#text" in c) {
                if ((prev === "span" || prev === "a") && nodeName === "p") {
                    c["#text"] = c["#text"].replace(/^([ \t\n\r] +)/g, " ");
                    if ((next === "span" || next === "a" || next === "br") && nodeName === "p") {
                        c["#text"] = c["#text"].replace(/([ \t\n\r] +)$/g, " ");
                        c["#text"] = c["#text"].replace(/(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                    }
                } else if ((next === "span" || next === "a" || next === "br") && nodeName === "p") {
                    c["#text"] = c["#text"].replace(/([ \t\n\r] +)$/g, " ");
                    c["#text"] = c["#text"].replace(/^([ \t\n\r]+)|(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                } else {
                    // 制御符号は0x20, 0x0d, 0x0a, 0x09のみ
                    // 2バイト文字と2バイト文字との間の制御符号は削除する
                    c["#text"] = c["#text"].replace(/^([ \t\n\r]+)|([ \t\n\r] +)$|(?<=[\u0100-\uffff])[ \t\n\r] +(?=[\u0100-\uffff])/g, "");
                }
            }
        }
        if (nodeName == "script") {
            renameXmlNode(node, "arib-script");
        }
        if (nodeName == "style") {
            renameXmlNode(node, "arib-style");
        }
        if (nodeName == "link") {
            renameXmlNode(node, "arib-link");
        }
        if (nodeName == "object") {
            if (node[":@"] && node[":@"]["@_type"] && node[":@"]["@_type"].toLowerCase() === "video/x-arib-mpeg2") {
                node[":@"]["@_arib-type"] = node[":@"]["@_type"];
                node[":@"]["@_type"] = "unknown/unknwon";
            }
            if (node[":@"] && node[":@"]["@_type"] && node[":@"]["@_type"].toLowerCase() === "image/x-arib-png") {
                node[":@"]["@_arib-type"] = node[":@"]["@_type"];
                node[":@"]["@_type"] = "image/png";
            }
            if (node[":@"] && node[":@"]["@_type"] && node[":@"]["@_type"].toLowerCase() === "image/x-arib-mng") {
                node[":@"]["@_arib-type"] = node[":@"]["@_type"];
                delete node[":@"]["@_type"];
            }
            if (node[":@"] && node[":@"]["@_data"]) {
                const data = node[":@"]["@_data"];
                node[":@"]["@_arib-data"] = data;
                delete node[":@"]["@_data"];
            }
        }
        if (node[":@"] && node[":@"]["@_onload"]) {
            if (node[":@"] && node[":@"]["@_onload"]) {
                const data = node[":@"]["@_onload"];
                node[":@"]["@_arib-onload"] = data;
                delete node[":@"]["@_onload"];
            }
        }
        if (node[":@"] && node[":@"]["@_onunload"]) {
            if (node[":@"] && node[":@"]["@_onunload"]) {
                const data = node[":@"]["@_onunload"];
                node[":@"]["@_arib-onunload"] = data;
                delete node[":@"]["@_onunload"];
            }
        }
    });
    const builder = new XMLBuilder(opts);
    return builder.build(htmlChildren);
}
