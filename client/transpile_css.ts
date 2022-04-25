import css from 'css';

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
    convertUrl?: (url: string) => Promise<string>,
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
                        return "[arib-" + pseudoClass + "]";
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
            decl.property = "--" + decl.property;
        } else if (opts.convertUrl && decl.property === "background-image" && decl.value) {
            const origProperty = decl.property;
            const origValue = decl.value;
            decl.value = "url(" + await opts.convertUrl(parseCSSValue(origValue) ?? origValue) + ")";
            return [decl, {
                type: "declaration",
                property: "--" + origProperty,
                value: origValue,
            }, {
                type: "declaration",
                property: "--" + origProperty + "2",
                value: decl.value,
            }];
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
