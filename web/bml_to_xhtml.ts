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
