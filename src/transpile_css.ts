import css from 'css';

const colorIndexProperties: Map<string, string> = new Map(Object.entries({
    colorIndex: "color",
    backgroundColorIndex: "backgroundColor",
    borderBottomColorIndex: "borderBottomColor",
    borderTopColorIndex: "borderTopColor",
    borderLeftColorIndex: "borderLeftColor",
    borderRightColorIndex: "borderRightColor",
    borderColorIndex: "borderColor",
    outlineColorIndex: "outlineColor",
}));

const colorIndexPropertiesToRule: Map<string, string> = new Map(Object.entries({
    colorIndex: "color-index",
    backgroundColorIndex: "background-color-index",
    borderBottomColorIndex: "border-bottom-color-index",
    borderTopColorIndex: "border-top-color-index",
    borderLeftColorIndex: "border-left-color-index",
    borderRightColorIndex: "border-right-color-index",
    borderColorIndex: "border-color-index",
    outlineColorIndex: "outline-color-index",
}));

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

const bmlCssPropertyToBmlJsProperty: Map<string, string> = new Map(Object.entries({
    "nav-index": "navIndex",
    "nav-up": "navUp",
    "nav-right": "navRight",
    "nav-down": "navDown",
    "nav-left": "navLeft",
}));

const bmlJsPropertyToBmlCssProperty: Map<string, string> = new Map(Array.from(bmlCssPropertyToBmlJsProperty).map(([k, v]) => [v, k]));

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

function varToColorIndex(colorIndexVar: string | null | undefined): string | null | undefined {
    if (colorIndexVar == null) {
        return colorIndexVar;
    }
    const match = /var\(--clut-color-(?<index>\d+)\)/.exec(colorIndexVar);
    return match?.groups?.index ?? colorIndexVar;
}

export function convertCSSPropertyToGet(propName: string, style: CSSStyleDeclaration): any {
    const subPropName = colorIndexProperties.get(propName);
    if (subPropName) {
        const propValue = parseInt(style.getPropertyValue("--" + colorIndexPropertiesToRule.get(propName)));
        if (Number.isFinite(propValue)) {
            return propValue.toString();
        }
        return varToColorIndex(style[subPropName as any]);
    }
    if (bmlJsPropertyToBmlCssProperty.has(propName)) {
        const propValue = parseInt(style.getPropertyValue("--" + bmlJsPropertyToBmlCssProperty.get(propName)));
        if (Number.isFinite(propValue)) {
            return propValue.toString();
        }
        return propValue;
    }
    return style[propName as any];
}

export function convertCSSPropertyToSet(propName: string, value: any, style: CSSStyleDeclaration): boolean {
    const subPropName = colorIndexProperties.get(propName);
    if (subPropName) {
        style.setProperty("--" + colorIndexPropertiesToRule.get(propName), value);
        style[subPropName as any] = colorIndexToVar(value) ?? "";
        return true;
    }
    if (bmlJsPropertyToBmlCssProperty.has(propName)) {
        style.setProperty("--" + bmlJsPropertyToBmlCssProperty.get(propName), value);
        return true;
    }
    return false;
}

function processRule(node: css.Node, opts: CSSTranspileOptions): undefined | string | (css.Comment | css.Declaration)[] {
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
            for (let i = 0; i < rule.declarations.length; i++) {
                const decl = rule.declarations[i];
                if (!decl)
                    break;
                let c = processRule(decl, opts);
                if (typeof c === "string") {
                    clut = c;
                } else if (c != null) {
                    rule.declarations.splice(i, 1, ...c);
                    i += c.length - 1;
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
        } else if (decl.property && bmlCssPropertyToBmlJsProperty.has(decl.property)) {
            decl.property = "--" + decl.property;
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
                }];
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
