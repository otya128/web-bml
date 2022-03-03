import Koa from 'koa';
import Router from 'koa-router';
import fs, { rename } from "fs"
import 'dotenv/config'
import { TextDecoder } from 'util';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const app = new Koa();
const router = new Router();

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


function readFileAsync2(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        fs.readFile(path, null, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    })
}

function readFileAsync(path: string): Promise<String> {
    return new Promise<String>((resolve, reject) => {
        fs.readFile(path, null, (err, data) => {
            if (err) {
                reject(err);
            } else {
                const opts = {
                    ignoreAttributes: false,
                    attributeNamePrefix: "@_",
                    preserveOrder: true,
                };
                const parser = new XMLParser(opts);
                let parsed = parser.parse(data);
                console.log(parsed)
                parsed = parser.parse(new TextDecoder(parsed[0][":@"]["@_encoding"]).decode(data));
                parsed[0][":@"]["@_encoding"] = "UTF-8";
                const builder = new XMLBuilder(opts);
                const bmlRoot = findXmlNode(parsed, "bml")[0];
                renameXmlNode(bmlRoot, "html");
                if (!bmlRoot[":@"]) {
                    bmlRoot[":@"] = {};
                }
                bmlRoot[":@"]["@_xmlns"] = "http://www.w3.org/1999/xhtml";
                const htmlChildren = bmlRoot["html"];
                const headChildren = findXmlNode(htmlChildren, "head")[0]["head"];
                visitXmlNodes(bmlRoot, (node) => {
                    if (getXmlNodeName(node) == "script") {
                        renameXmlNode(node, "arib-script");
                    }
                    if (getXmlNodeName(node) == "style") {
                        renameXmlNode(node, "arib-style");
                    }
                });
                const pMincho = "MS PMincho";
                const mincho = "MS Mincho";
                const gothic = "MS Gothic";
                headChildren.push({
                    "style": [{
                        "#text": `p, div, input, object {
                    position: absolute;
                }
                br, span, a {
                    position: static;
                }
                arib-style {
                    display: none;
                }
                arib-script {
                    display: none;
                }

                @page { size: 210mm 297mm;
                    margin : 3mm 3mm 3mm 3mm;
                    @top { text-align: center; }
                    @bottom { text-align: center; }
                    }
                    /* Structure Module(xhtml-struct-1.mod) */
                    html { }
                    head { display: none; }
                    body { color : black;
                    display: block;
                    font-size: 10.5pt;
                    font-family: ${pMincho},serif;
                    list-style-type: disc;
                    text-align: left;
                    line-height: 1.2;
                    padding: 6pt;
                    }
                    /* Text Module(xhtml-text-1.mod) */
                    /* Text: Inline Structural Module(xhtml-inlstruct-1.mod) */
                    br { }
                    span { }
                    /* Text: Inline Phrasal Module(xhtml-inlphras-1.mod) */
                    abbr { font-variant : small-caps;
                    letter-spacing : 0.1em;
                    }
                    acronym { font-variant : small-caps;
                    letter-spacing : 0.1em;
                    }
                    cite { font-style : italic; }
                    code { font-family : ${gothic}, monospace; }
                    em { font-style : italic; }
                    kbd { font-family : ${gothic}, monospace;}
                    q { }
                    samp { font-family : ${gothic}, monospace;}
                    strong { font-weight : bolder; }
                    var { font-style : italic; }
                   
                    /* Text: Block Structural Module(xhtml-blkstruct-1.mod) */
                    div, p, address, blockquote, pre, h1, h2, h3, h4, h5, h6 {
                    display: block;
                    }
                    div { }
                    p { margin : 1.33em 0; }
                   
                    /* Text: Block Phrasal Module(xhtml-blkphras-1.mod) */
                    address { font-style : italic; }
                    blockquote{ page-break-inside: avoid;
                    margin : 1.33em 40pt;
                    }
                    pre { page-break-inside : avoid;
                    font-family : ${gothic}, monospace;
                    white-space : pre;
                    }
                    h1 { page-break-inside : avoid;
                    font-size : 2.00em;
                    margin : 0.67em 0;
                    line-height : 1.00em;
                    font-weight : bolder;
                    }
                    h2 { page-break-inside : avoid;
                    font-size : 1.50em;
                    margin : 0.83em 0;
                    line-height : 1.00em;
                    font-weight : bolder;
                    }
                    h3 { page-break-inside : avoid;
                    font-size : 1.17em;
                    margin : 1.00em 0;
                    line-height : 1.00em;
                    font-weight : bolder;
                    }
                    h4 { page-break-inside : avoid;
                    font-size : 1.00em;
                    margin : 1.33em 0;
                    line-height : 1.00em;
                    font-weight : bolder;
                    }
                    h5 { page-break-inside : avoid;
                    font-size : 0.83em;
                    margin : 1.67em 0;
                    line-height : 1.17em;
                    font-weight : bolder;
                    }
                    h6 { page-break-inside : avoid;
                    font-size : 0.67em;
                    margin : 2.33em 0;
                    line-height : 1.33em;
                    font-weight : bolder;
                    }
                    /* Hypertext Module(xhtml-hypertext-1.mod) */
                    a { text-decoration : underline; }
                    /* Lists Module(xhtml-list-1.mod) */
                    dl, dt, dd, ul, ol { display: block; }
                    dl { margin : 1.33em 0;
                    }
                    dt { }
                    dd { margin-left: 40pt; }
                    ul { margin : 1.33em 0 1.33em 40pt;
                    }
                    ol { margin : 1.33em 0 1.33em 40pt;
                    list-style-type: decimal;
                    }
                    li { display : list-item; }
                    /* Image Module(xhtml-image-1.mod) */
                    img { }
                    /* Basic Table Module(xhtml-basic-table-1.mod) */
                    table { display: table; }
                    caption { color : black;
                    text-align: center;
                    display: table-caption;
                    }
                    tr { display: table-row;
                    page-break-inside: avoid;
                    }
                    th { display: table-cell;
                    font-weight: bolder;
                    text-align: center;
                    page-break-inside: avoid;
                    }
                    td { display: table-cell;
                    page-break-inside: avoid;
                    }
                    /* Simplified Forms Module(xhtml-basic-form-1.mod) */
                    form { display: block; }
                    form { margin : 1.33em 0; }
                    label { }
                    input { }
                    select { }
                    option { }
                    textarea { font-family: ${mincho}, monospace;
                    white-space: pre;
                    }
                    /* Presentation Module(xhtml-pres-1.mod) */
                    /* Presentational: Inline Presentation Module(xhtml-inlpres-1.mod) */
                    b { font-weight : bolder; }
                    big { font-size : 1.7em; }
                    i { font-style : italic; }
                    small { font-size : 0.83em; }
                    sub { font-size : 0.83em;
                    vertical-align : sub;
                    }
                    sup { font-size : 0.83em;
                    vertical-align : super;
                    }
                    tt { font-family : ${gothic}, monospace; }
                    /* Presentation: Block Presentation Module(xhtml-blkpres-1.mod) */
                    hr { border : 1pt black solid;
                    border-color : black silver black silver;
                    padding-top : 1pt;
                    display: block;
                    }
                    /* Link Element Module(xhtml-link-1.mod) */
                    link { display: none; }
                    /* Document Metainformation Module(xhtml-meta-1.mod) */
                    meta { display: none; }
                    /* Base Element Module(xhtml-base-1.mod) */
                    base { display: none; }
                    /* Style Sheets Module(xhtml-style-1.mod) */
                    style { display: none; }
                    /* Param Element Module(xhtml-param-1.mod) */
                    param { display : none; }
                    /* Embedded Object Module(xhtml-object-1.mod) */
                    object { display: block; }

                    /* reset UA CSS */
                    p {
                    margin-block-start: 0;
                    margin-block-end: 0;
                    margin-inline-start: 0;
                    margin-inline-end: 0;
                    }
                `}]
                });
                headChildren.push({ "script": [], ":@": { "@_src": "/arib.js" } });
                //console.log(JSON.stringify(parsed, null, 4));
                resolve(builder.build(parsed));
            }
        });
    });
}

import { defaultCLUT } from './default_clut';
async function readCLUT(path: string): Promise<number[][]> {
    let table = defaultCLUT.slice();
    const prevLength = table.length;
    table.length = 256;
    table = table.fill([0, 0, 0, 255], prevLength, 256);
    const clut = await readFileAsync2(path);
    const clutType = clut[0] & 0x80;
    const depth = (clut[0] & 0x60) >> 5;
    const regionFlag = clut[0] & 0x10;
    const startEndFlag = clut[0] & 0x8;
    let index = 1;
    if (regionFlag) {
        index += 2;
        index += 2;
        index += 2;
        index += 2;
    }
    let startIndex: number;
    let endIndex: number;
    if (startEndFlag) {
        if (depth == 0) {
            startIndex = clut[index] >> 4;
            endIndex = clut[index] & 15;
            index++;
        } else if (depth == 1) {
            startIndex = clut[index++];
            endIndex = clut[index++];
        } else if (depth == 2) {
            startIndex = clut[index++];
            startIndex = (startIndex << 8) | clut[index++];
            endIndex = clut[index++];
            endIndex = (endIndex << 8) | clut[index++];
        } else {
            throw new Error("unexpected");
        }
        for (let i = startIndex; i <= endIndex; i++) {
            let R: number;
            let G: number;
            let B: number;
            if (clutType == 0) {
                const Y = clut[index++];
                const Cb = clut[index++];
                const Cr = clut[index++];
                R = Math.max(0, Math.min(255, Math.floor(1.164 * (Y - 16) + 1.793 * (Cr - 128))));
                G = Math.max(0, Math.min(255, Math.floor(1.164 * (Y - 16) - 0.213 * (Cb - 128) - 0.533 * (Cr - 128))));
                B = Math.max(0, Math.min(255, Math.floor(1.164 * (Y - 16) + 2.112 * (Cb - 128))));
            } else {
                R = clut[index++];
                G = clut[index++];
                B = clut[index++];
            }
            const A = clut[index++];
            table[i] = [R, G, B, A];
        }
    } else {
        throw new Error("not implemented");
    }
    return table;
}

import CRC32 from "crc-32";

function preparePLTE(clut: number[][]): Buffer {
    const plte = Buffer.alloc(4 /* PLTE */ + 4 /* size */ + clut.length * 3 + 4 /* CRC32 */);
    let off = 0;
    off = plte.writeUInt32BE(clut.length * 3, off);
    off += plte.write("PLTE", off);
    for (const entry of clut) {
        off = plte.writeUInt8(entry[0], off);
        off = plte.writeUInt8(entry[1], off);
        off = plte.writeUInt8(entry[2], off);
    }
    plte.writeInt32BE(CRC32.buf(plte.slice(4, off), 0), off);
    return plte;
}

function prepareTRNS(clut: number[][]): Buffer {
    const trns = Buffer.alloc(4 /* PLTE */ + 4 /* size */ + clut.length + 4 /* CRC32 */);
    let off = 0;
    off = trns.writeUInt32BE(clut.length, off);
    off += trns.write("tRNS", off);
    for (const entry of clut) {
        off = trns.writeUInt8(entry[3], off);
    }
    trns.writeInt32BE(CRC32.buf(trns.slice(4, off), 0), off);
    return trns;
}

router.get('/:component/:module/:filename', async ctx => {
    const component = ctx.params.component as string;
    const module = ctx.params.module as string;
    const filename = ctx.params.filename as string;
    if (filename.endsWith(".bml")) {
        const file = await readFileAsync(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
        ctx.body = file;
        ctx.set('Content-Type', 'application/xhtml+xml')
    } else {
        if (typeof ctx.query.clut === "string") {
            const clut = ctx.query.clut;
            const uriMatch = /url\("?(?<uri>.+?)"?\)/.exec(clut);
            if (uriMatch?.groups) {
                const uri = uriMatch.groups["uri"];
                const table = await readCLUT(`${process.env.BASE_DIR}/${component}/${module}/${uri}`);
                const png = await readFileAsync2(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
                const plte = preparePLTE(table);
                const trns = prepareTRNS(table);
                const output = Buffer.alloc(png.length + plte.length + trns.length);
                let off = 0;
                off += png.copy(output, off, 0, 33);
                off += plte.copy(output, off);
                off += trns.copy(output, off);
                off += png.copy(output, off, 33);
                ctx.body = output;
                ctx.set("Content-Type", "image/png");
                return;
            }
        }
        if (typeof ctx.query.base64 === "string") {
            ctx.body = (await readFileAsync2(`${process.env.BASE_DIR}/${component}/${module}/${filename}`)).toString('base64');
        } else {
            ctx.body = fs.createReadStream(`${process.env.BASE_DIR}/${component}/${module}/${filename}`);
        }
        if (filename.endsWith(".png")) {
            ctx.set("Content-Type", "image/png");
        }
    }
});

router.get('/arib.js', async ctx => {
    ctx.body = fs.createReadStream("dist/arib.js");
    ctx.set('Content-Type', 'text/javascript')
});
router.get('/arib.js.map', async ctx => {
    ctx.body = fs.createReadStream("dist/arib.js.map");
    ctx.set('Content-Type', 'application/json')
});

app
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(23234);
