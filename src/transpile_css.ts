import css from 'css';

const colorIndexProperties: { [propName: string]: string } = {
    colorIndex: "color",
    backgroundColorIndex: "backgroundColor",
    borderBottomColorIndex: "borderBottomColor",
    borderTopColorIndex: "borderTopColor",
    borderLeftColorIndex: "borderLeftColor",
    borderRightColorIndex: "borderRightColor",
    borderColorIndex: "borderColor",
    outlineColorIndex: "outlineColor",
};

const colorIndexRules: { [propName: string]: string } = {
    "color-index": "color",
    "background-color-index": "background-color",
    "border-bottom-color-index": "border-bottom-color",
    "border-top-color-index": "border-top-color",
    "border-left-color-index": "border-left-color",
    "border-right-color-index": "border-right-color",
    "border-color-index": "border-color",
    "outline-color-index": "outline-color",
};

function parseCSSValue(href: string, value: string): string | null {
    const uriMatch = /url\(["']?(?<uri>.+?)['"]?\)/.exec(value);
    if (uriMatch?.groups == null) {
        return null;
    }
    const uri = uriMatch.groups["uri"].replace(/\\/g, "");
    return new URL(uri, href).pathname;
}

export type CSSTranspileOptions = {
    inline: boolean,
    href: string,
    clutReader: (cssValue: string) => css.Declaration[],
};

function colorIndexToVar(colorIndex: string | null | undefined): string | null | undefined {
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

export function convertCSSProperty(propName: string, value: any): [propName: string, value: any] {
    const subPropName = colorIndexProperties[propName];
    if (subPropName) {
        propName = subPropName;
        value = colorIndexToVar(value);
    }
    return [propName, value];
}

function processRule(node: css.Node, opts: CSSTranspileOptions): undefined | string {
    if (node.type === "stylesheet") {
        const stylesheet = node as css.Stylesheet;
        if (stylesheet.stylesheet) {
            for (const rule of stylesheet.stylesheet.rules) {
                processRule(rule, opts);
            }
        }
    } else if (node.type === "rule") {
        const rule = node as css.Rule;
        if (rule.declarations) {
            let clut: string | undefined;
            for (const decl of rule.declarations) {
                let c = processRule(decl, opts);
                if (c) {
                    clut = c;
                }
            }
            if (clut) {
                const l = parseCSSValue(opts.href, clut);
                if (l) {
                    for (const i of opts.clutReader(l)) {
                        rule.declarations?.push(i);
                    }
                }
            }
        }
    } else if (node.type == "declaration") {
        const decl = node as css.Declaration;
        if (decl.property === "clut") {
            decl.property = "--" + decl.property;
            return decl.value;
        } else if (decl.property == "nav-index") {
            decl.property = "--" + decl.property;
        } else if (decl.property) {
            const sub = colorIndexRules[decl.property];
            if (sub) {
                decl.property = sub;
                decl.value = colorIndexToVar(decl.value) ?? undefined;
            }
        }
    }
}

export function transpileCSS(style: string, opts: CSSTranspileOptions): string {
    if (opts.inline) {
        style = "*{" + style + "}";
    }
    const parsed = css.parse(style);
    if (!parsed) {
        return style;
    }
    processRule(parsed, opts);
    const transpiled = css.stringify(parsed, { compress: opts.inline });
    if (opts.inline) {
        return transpiled.replace(/^\*\{|\}$/g, "");
    } else {
        return transpiled;
    }
}
