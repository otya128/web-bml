import { XMLBuilder, XMLParser } from "fast-xml-parser";

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
    const bmlRoot = findXmlNode(parsed, "bml")[0] ?? findXmlNode(parsed, "html")[0];
    const htmlChildren = bmlRoot["bml"] ?? bmlRoot["html"];
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
        if (nodeName == "object" && node[":@"] != null) {
            node[":@"]["@_arib-type"] = node[":@"]["@_type"];
            delete node[":@"]["@_type"];
            if (node[":@"]["@_data"]) {
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
