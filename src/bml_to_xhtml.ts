import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { decodeEUCJP } from "./euc_jp";
import { transpile } from "./transpile_ecm";

function findXmlNode(xml: any[], nodeName: string): any {
    const result = [];
    for (const i of xml) {
        for (const k in i) {
            if (k === ":@") {
                continue;
            }
            if (k == nodeName) {
                result.push(i);
                break;
            }
        }
    }
    return result;
}

function renameXmlNode(node: any, name: string) {
    for (const k in node) {
        if (k === ":@") {
            continue;
        }
        node[name] = node[k];
        delete node[k];
    }
}

function getXmlNodeName(node: any): string | null {
    for (const k in node) {
        if (k === ":@") {
            continue;
        }
        return k;
    }
    return null;
}

function getXmlChildren(node: any): any[] {
    for (const k in node) {
        if (k == "#text") {
            return [];
        }
        if (k === ":@") {
            continue;
        }
        return node[k];
    }
    return [];
}

function visitXmlNodes(node: any, callback: (node: any) => void) {
    callback(node);
    for (const child of getXmlChildren(node)) {
        visitXmlNodes(child, callback);
    }
}

export function bmlToXHTML(data: Uint8Array): string {
    const opts = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        preserveOrder: true,
        cdataPropName: "__cdata",
        trimValues: false,
        parseTagValue: false,
    };
    const parser = new XMLParser(opts);
    const parsed = parser.parse(decodeEUCJP(data));
    parsed[0][":@"]["@_encoding"] = "UTF-8";
    const builder = new XMLBuilder(opts);
    const bmlRoot = findXmlNode(parsed, "bml")[0];
    renameXmlNode(bmlRoot, "html");
    if (!bmlRoot[":@"]) {
        bmlRoot[":@"] = {};
    }
    bmlRoot[":@"]["@_xmlns"] = "http://www.w3.org/1999/xhtml";
    const htmlChildren = bmlRoot["html"];
    const headChildren: any[] = findXmlNode(htmlChildren, "head")[0]["head"];
    const scripts: any[] = [];
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
        if (getXmlNodeName(node) == "script") {
            scripts.push({ ...node });
            renameXmlNode(node, "arib-script");
        }
        if (getXmlNodeName(node) == "style") {
            renameXmlNode(node, "arib-style");
        }
        if (getXmlNodeName(node) == "link") {
            if (!node[":@"]["@_rel"]) {
                node[":@"]["@_rel"] = "stylesheet";
            }
            renameXmlNode(node, "arib-link");
        }
        if (getXmlNodeName(node) == "object") {
            if (node[":@"] && node[":@"]["@_data"]) {
                const data = node[":@"]["@_data"];
                node[":@"]["@_arib-data"] = data;
                delete node[":@"]["@_data"];
            }
        }
        /*
        // keyイベントは独自なのでエミュレートした方がよさそう
        const attrs = node[":@"] as any;
        if (attrs && Object.keys(attrs).some(x => x.toLowerCase().startsWith("@_onkey"))) {
            attrs["@_tabindex"] = "-1";
        } */
    });
    const bodyChildren = findXmlNode(htmlChildren, "body")[0]["body"];
    bodyChildren.push({
        "script": [],
        ":@": {
            "@_src": "/arib.js"
        }
    });
    for (const s of scripts) {
        const __cdata = findXmlNode(s["script"], "__cdata");
        for (const c of __cdata) {
            const code = c["__cdata"][0]["#text"];
            c["__cdata"][0]["#text"] = transpile(code);
        }
        bodyChildren.push(s);
    }
    //console.log(JSON.stringify(parsed, null, 4));
    return builder.build(htmlChildren);
}
