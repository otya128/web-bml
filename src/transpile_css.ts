import css from 'css';

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

export function convertCSSProperty(propName: string, value: any): [propName: string, value: any] {
    if (propName === "colorIndex") {
        propName = "color";
        value = `var(--clut-color-${value})`;
    } else if (propName === "borderBottomColorIndex") {
        propName = "borderBottomColor";
        value = `var(--clut-color-${value})`;
    } else if (propName === "borderTopColorIndex") {
        propName = "borderTopColor";
        value = `var(--clut-color-${value})`;
    } else if (propName === "borderLeftColorIndex") {
        propName = "borderLeftColor";
        value = `var(--clut-color-${value})`;
    } else if (propName === "borderRightColorIndex") {
        propName = "borderRightColor";
        value = `var(--clut-color-${value})`;
    } else if (propName === "borderColorIndex") {
        propName = "borderColor";
        value = `var(--clut-color-${value})`;
    } else if (propName === "outlineColorIndex") {
        propName = "outlineColor";
        value = `var(--clut-color-${value})`;
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
        } else if (decl.property == "background-color-index") {
            decl.property = "background-color";
            decl.value = "var(--clut-color-" + decl.value + ")";
        } else if (decl.property == "color-index") {
            decl.property = "color";
            decl.value = "var(--clut-color-" + decl.value + ")";
        } else if (decl.property == "nav-index") {
            decl.property = "--" + decl.property;
        } else if (decl.property == "border-bottom-color-index") {
            decl.property = "border-bottom-color";
            decl.value = "var(--clut-color-" + decl.value + ")";
        } else if (decl.property == "border-top-color-index") {
            decl.property = "border-top-color";
            decl.value = "var(--clut-color-" + decl.value + ")";
        } else if (decl.property == "border-left-color-index") {
            decl.property = "border-left-color";
            decl.value = "var(--clut-color-" + decl.value + ")";
        } else if (decl.property == "border-right-color-index") {
            decl.property = "border-right-color";
            decl.value = "var(--clut-color-" + decl.value + ")";
        } else if (decl.property == "border-color-index") {
            decl.property = "border-color";
            decl.value = "var(--clut-color-" + decl.value + ")";
        } else if (decl.property == "outline-color-index") {
            decl.property = "outline-color";
            decl.value = "var(--clut-color-" + decl.value + ")";
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
