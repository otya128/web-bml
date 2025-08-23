import css from 'css';

// STD-B24 第二分冊(2/2) 4.4.13 length の運用
// STD-B24 第二分冊(2/2) 4.5.12 length の運用
// TR-B14 第三分冊 7.8.11 lengthの運用
// > lengthはピクセル単位の整数値の指定のみとし、"100px"などのように指定する。但し0px の場合"0"と書いても良いが、DOM の返り値は、"0px"と返す。
// 実際にはQuirksな挙動をする必要があるらしい
const quirksProperties: Set<string> = new Set([
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "border-width",
    "left",
    "top",
    "width",
    "height",
    "line-height",
    "font-size",
    "letter-spacing",
]);

const colorIndexRules: Map<string, string> = new Map(Object.entries({
    "color-index": "color",
    "background-color-index": "background-color",
    "border-bottom-color-index": "border-bottom-color",
    "border-top-color-index": "border-top-color",
    "border-left-color-index": "border-left-color",
    "border-right-color-index": "border-right-color",
    "border-color-index": "border-color",
    "outline-color-index": "outline-color",
}));

const bmlCssProperties: Set<string> = new Set([
    "nav-index",
    "nav-up",
    "nav-right",
    "nav-down",
    "nav-left",
    "used-key-list",
    "resolution",
    "display-aspect-ratio",
    "grayscale-color-index",
    // WAP(Cプロファイル)
    "-wap-marquee-style",
    "-wap-marquee-loop",
    "-wap-marquee-dir",
    "-wap-marquee-speed",
    "-wap-input-format",
]);

export function parseCSSValue(value: string): string | null {
    const uriMatch = /url\(\s*["']?(?<uri>.+?)['"]?\s*\)/.exec(value);
    if (uriMatch?.groups == null) {
        return null;
    }
    const uri = uriMatch.groups["uri"].replace(/\\/g, "");
    return uri;
}

export type CSSTranspileOptions = {
    inline: boolean,
    clutReader: (cssValue: string) => Promise<css.Declaration[]>,
    convertUrl?: (url: string) => Promise<{ blobUrl: string, width?: number, height?: number } | undefined>,
};

export function colorIndexToVar(colorIndex: string | null | undefined): string | null | undefined {
    if (colorIndex == null) {
        return colorIndex;
    }
    const idx = parseInt(colorIndex);
    if (Number.isFinite(idx)) {
        return `var(--clut-color-${colorIndex})`;
    } else {
        return colorIndex;
    }
}

export function varToColorIndex(colorIndexVar: string | null | undefined): string | null | undefined {
    if (colorIndexVar == null) {
        return colorIndexVar;
    }
    const match = /var\(--clut-color-(?<index>\d+)\)/.exec(colorIndexVar);
    return match?.groups?.index ?? colorIndexVar;
}

export function setFontSize(value: string): string {
    const v = value.trim().toLowerCase();
    // Cプロファイル
    if (v === "small" || v === "medium" || v === "large") {
        return `var(--${v})`
    }
    return value;
}

export function setLineHeight(value: string): string {
    const v = value.trim().toLowerCase();
    // ブラウザではnormalは大体1.2
    if (v === "normal") {
        return "1";
    }
    return value;
}

async function processRule(node: css.Node, opts: CSSTranspileOptions): Promise<undefined | string | (css.Comment | css.Declaration)[]> {
    if (node.type === "stylesheet") {
        const stylesheet = node as css.Stylesheet;
        if (stylesheet.stylesheet) {
            for (const rule of stylesheet.stylesheet.rules) {
                await processRule(rule, opts);
            }
        }
    } else if (node.type === "rule") {
        const rule = node as css.Rule;
        if (rule.declarations) {
            if (rule.selectors != null) {
                // てきとうだけど使えるセレクタの制約が大きいので大体なんとかなる
                rule.selectors = rule.selectors.map(selector => {
                    return selector.replace(/(?<=\s*):(focus|active)(?=\s*)/i, (_substring: string, pseudoClass: string) => {
                        return "[web-bml-state=\"" + pseudoClass + "\"]";
                    });
                });
            }
            let clut: string | undefined;
            for (let i = 0; i < rule.declarations.length; i++) {
                const decl = rule.declarations[i];
                if (!decl)
                    break;
                let c = await processRule(decl, opts);
                if (typeof c === "string") {
                    clut = c;
                } else if (c != null) {
                    rule.declarations.splice(i, 1, ...c);
                    i += c.length - 1;
                }
            }
            if (clut) {
                const l = parseCSSValue(clut);
                if (l) {
                    for (const i of await opts.clutReader(l)) {
                        rule.declarations?.push(i);
                    }
                }
            }
        }
    } else if (node.type == "declaration") {
        const decl = node as css.Declaration;
        if (decl.property != null && decl.value != null && quirksProperties.has(decl.property.toLowerCase())) {
            const notPx = Number(decl.value);
            if (notPx !== 0 && !Number.isNaN(notPx)) {
                decl.value = notPx + "px";
            }
        }
        if (decl.property === "clut") {
            decl.property = "--" + decl.property;
            if (decl.value) {
                const parsed = parseCSSValue(decl.value);
                if (parsed) {
                    // Chrome, Safariだとurl()の中身だけがエスケープされて面倒なので回避
                    decl.value = "url(\"" + parsed + "\")";
                }
            }
            return decl.value;
        } else if (decl.property && bmlCssProperties.has(decl.property)) {
            if (decl.property === "resolution" && decl.value === "720x480") {
                // 720x480の解像度のときは静止画プレーンの幅と高さは文字図形プレーンと等しい
                // 960x540の解像度のときは静止画プレーンの幅と高さは文字図形プレーンの半分
                const decls: css.Declaration[] = [
                    {
                        type: "declaration",
                        property: "--" + decl.property,
                        value: decl.value,
                    },
                    {
                        type: "declaration",
                        property: "--still-picture-plane-scale",
                        value: "1",
                    },
                ];
                return decls;
            } else {
                decl.property = "--" + decl.property;
            }
        } else if (opts.convertUrl && decl.property === "background-image" && decl.value) {
            const origProperty = decl.property;
            const origValue = decl.value;
            const converted = await opts.convertUrl(parseCSSValue(origValue) ?? origValue);
            const decls: css.Declaration[] = [
                {
                    type: "declaration",
                    property: "--" + origProperty,
                    value: origValue,
                },
            ];
            if (converted?.width != null && converted?.height != null) {
                decls.push({
                    type: "declaration",
                    property: `--${origProperty}2`,
                    value: `url(${converted.blobUrl})`,
                });
                decls.push({
                    type: "declaration",
                    property: origProperty,
                    value: `url(${converted.blobUrl})`,
                });
                // TR-B15 第一分冊 スケーリング/TR-B14 第二分冊 スケーリング
                // 960x540の解像度のとき、文字図形プレーンは960x540なのに対し、静止画プレーンは1920x1080なのでbackground-sizeは画像解像度の半分にする必要がある
                // ただし、例外として960x540の解像度で960x540のJPEGを背景に指定する場合だけ静止画プレーンにも全面に表示されるのでbackground-sizeが画像解像度と同じで良い
                // スケール率が--still-picture-plane-scaleに設定されているのでそれを使う
                if (converted.width !== 960 || converted.height !== 540) {
                    decls.push({
                        type: "declaration",
                        property: "background-size",
                        value: `calc(${converted.width}px * var(--still-picture-plane-scale, 1)) calc(${converted.height}px * var(--still-picture-plane-scale, 1))`,
                    });
                    // videoPlaneModeEnabled用
                    decls.push({
                        type: "declaration",
                        property: "--background-size",
                        value: `calc(${converted.width}px * var(--still-picture-plane-scale, 1)) calc(${converted.height}px * var(--still-picture-plane-scale, 1))`,
                    });
                }
            }
            return decls;
        } else if (decl.property) {
            const sub = colorIndexRules.get(decl.property);
            if (sub) {
                const origProperty = decl.property;
                const origValue = decl.value;
                decl.property = sub;
                decl.value = colorIndexToVar(decl.value) ?? undefined;
                return [decl, {
                    type: "declaration",
                    property: "--" + origProperty,
                    value: origValue,
                }, {
                    type: "declaration",
                    property: "--" + sub,
                    value: decl.value,
                }];
            } else if (decl.property === "font-size") {
                // FIXME: inheritで上書きできない
                // <style>p { font-size: 16px; } span { font-size: 24px; }</style> <p><span style="font-size: inherit;"> <= font-sizeは16pxであるべき
                if (decl.value?.trim()?.toLowerCase() === "inherit") {
                    return [];
                }
                return [{
                    type: "declaration",
                    property: "--" + decl.property,
                    value: decl.value != null ? setFontSize(decl.value) : decl.value,
                }, {
                    type: "declaration",
                    property: "--" + decl.property + "-raw",
                    value: decl.value,
                }];
            } else if (decl.property === "line-height") {
                if (decl.value?.trim()?.toLowerCase() === "inherit") {
                    return [];
                }
                return [{
                    type: "declaration",
                    property: "--" + decl.property,
                    value: decl.value != null ? setLineHeight(decl.value) : decl.value,
                }, {
                    type: "declaration",
                    property: "--" + decl.property + "-inherit",
                    value: decl.value != null ? setLineHeight(decl.value) : decl.value,
                }, {
                    type: "declaration",
                    property: "--" + decl.property + "-raw",
                    value: decl.value,
                }];
            } else if (decl.property === "color" || decl.property === "background-color") {
                if (decl.value?.trim()?.toLowerCase() === "inherit") {
                    return;
                }
                // Cプロファイルで<a>でフォーカスが当たった時背景色を文字色を入れ替えるため(-inherit)と#xxxxxxがrgb(x, x, x)になって微妙なので変数としても追加する
                if (decl.value?.trim() !== "transparent") {
                    return [decl, {
                        type: "declaration",
                        property: "--" + decl.property,
                        value: decl.value,
                    }, {
                        type: "declaration",
                        property: "--" + decl.property + "-inherit",
                        value: decl.value,
                    }];
                }
                return [decl, {
                    type: "declaration",
                    property: "--" + decl.property,
                    value: decl.value,
                }];
            } else if (decl.property === "display") {
                if (decl.value === "-wap-marquee") {
                    decl.value = "block";
                    return [decl, {
                        type: "declaration",
                        property: "--display",
                        value: "-wap-marquee",
                    }];
                }
            }
        }
    }
}

export async function transpileCSS(style: string, opts: CSSTranspileOptions): Promise<string> {
    if (opts.inline) {
        style = "*{" + style + "}";
    }
    const parsed = css.parse(style);
    if (!parsed) {
        return style;
    }
    await processRule(parsed, opts);
    const transpiled = css.stringify(parsed, { compress: opts.inline });
    if (opts.inline) {
        return transpiled.replace(/^\*\{|\}$/g, "");
    } else {
        return transpiled;
    }
}
