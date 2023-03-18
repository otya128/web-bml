import { BMLBrowserEventTarget, KeyGroup } from "../bml_browser";
import { colorIndexToVar, setFontSize, varToColorIndex } from "../transpile_css";

type DOMString = string;

export class BMLCSSStyleDeclaration {
    private readonly baseDeclarationMap: Map<string, string>;
    private readonly declarationMap: Map<string, string>;
    private readonly computedPropertyGetter: (property: string) => string;
    private readonly propertySetter: (property: string, value: string) => void;

    public constructor(baseDeclarationMap: Map<string, string>, declarationMap: Map<string, string>, computedPropertyGetter: (property: string) => string, propertySetter: (property: string, value: string) => void) {
        this.baseDeclarationMap = baseDeclarationMap;
        this.declarationMap = declarationMap;
        this.computedPropertyGetter = computedPropertyGetter;
        this.propertySetter = propertySetter;
    }

    public setProperty(property: string, value: string): void {
        // 一旦削除して列挙が設定順にされるようにしておく
        this.declarationMap.delete(property);
        this.declarationMap.set(property, value);
        this.propertySetter(property, value);
    }

    public getPropertyValue(property: string): string {
        const value = this.declarationMap.get(property) ?? this.baseDeclarationMap.get(property);
        return value == null || value.toLowerCase().trim() === "inherit" ? this.computedPropertyGetter(property) : value;
    }
}

export class BMLCSS2Properties {
    private readonly declaration: BMLCSSStyleDeclaration;
    private readonly node: HTMLElement;
    private readonly eventTarget: BMLBrowserEventTarget;
    public constructor(declaration: BMLCSSStyleDeclaration, node: HTMLElement, eventTarget: BMLBrowserEventTarget) {
        this.declaration = declaration;
        this.node = node;
        this.eventTarget = eventTarget;
    }

    private getColorIndexVariable(bmlPropName: string, cssPropName: string): DOMString {
        const v = this.declaration.getPropertyValue("--" + bmlPropName).trim();
        if (v !== "") {
            return v;
        }
        return varToColorIndex(this.declaration.getPropertyValue(cssPropName)) ?? "";
    }

    private setColorIndexVariable(bmlPropName: string, cssPropName: string, value: DOMString) {
        this.declaration.setProperty("--" + bmlPropName, value);
        if (cssPropName === "background-color") {
            this.declaration.setProperty("--background-color", colorIndexToVar(value) ?? "");
            // videoPlaneModeEnabledの場合bodyにはbackground-colorを設定しない
            if (this.declaration.getPropertyValue("background-color") === "transparent") {
                return;
            }
        }
        this.declaration.setProperty(cssPropName, colorIndexToVar(value) ?? "");
    }

    public get paddingTop() { return this.declaration.getPropertyValue("padding-top"); }
    public get paddingRight() { return this.declaration.getPropertyValue("padding-right"); }
    public get paddingBottom() { return this.declaration.getPropertyValue("padding-bottom"); }
    public get paddingLeft() { return this.declaration.getPropertyValue("padding-left"); }
    public get borderWidth() { return this.declaration.getPropertyValue("border-width"); }
    public get borderStyle() { return this.declaration.getPropertyValue("border-style"); }
    public get left() { return this.declaration.getPropertyValue("left"); }
    public set left(value: DOMString) { this.declaration.setProperty("left", String(value)); }
    public get top() { return this.declaration.getPropertyValue("top"); }
    public set top(value: DOMString) { this.declaration.setProperty("top", String(value)); }
    public get width() { return this.declaration.getPropertyValue("width"); }
    public set width(value: DOMString) { this.declaration.setProperty("width", String(value)); }
    public get height() { return this.declaration.getPropertyValue("height"); }
    public set height(value: DOMString) { this.declaration.setProperty("height", String(value)); }
    public get lineHeight() { return this.declaration.getPropertyValue("--line-height-raw").trim(); }
    public get visibility() { return this.declaration.getPropertyValue("visibility"); }
    public set visibility(value: DOMString) { this.declaration.setProperty("visibility", String(value)); }
    public get fontFamily() { return this.declaration.getPropertyValue("font-family"); }
    public set fontFamily(value: DOMString) { this.declaration.setProperty("font-family", String(value)); }
    public get fontSize(): DOMString {
        const fontSize = this.declaration.getPropertyValue("--font-size-raw");
        return fontSize.trim();
    }
    public set fontSize(value: DOMString) {
        this.declaration.setProperty("--font-size-raw", String(value));
        this.declaration.setProperty("--font-size", setFontSize(String(value)));
    }
    public get fontWeight() { return this.declaration.getPropertyValue("font-weight"); }
    public set fontWeight(value: DOMString) { this.declaration.setProperty("font-weight", String(value)); }
    public get textAlign() { return this.declaration.getPropertyValue("text-align"); }
    public get letterSpacing() { return this.declaration.getPropertyValue("letter-spacing"); }
    public get borderTopColorIndex() {
        return this.getColorIndexVariable("border-top-color-index", "border-top-color");
    }
    public set borderTopColorIndex(value: DOMString) {
        this.setColorIndexVariable("border-top-color-index", "border-top-color", String(value));
    }
    public get borderRightColorIndex() {
        return this.getColorIndexVariable("border-right-color-index", "border-right-color");
    }
    public set borderRightColorIndex(value: DOMString) {
        this.setColorIndexVariable("border-right-color-index", "border-right-color", String(value));
    }
    public get borderLeftColorIndex() {
        return this.getColorIndexVariable("border-left-color-index", "border-left-color");
    }
    public set borderLeftColorIndex(value: DOMString) {
        this.setColorIndexVariable("border-left-color-index", "border-left-color", String(value));
    }
    public get borderBottomColorIndex() {
        return this.getColorIndexVariable("border-bottom-color-index", "border-bottom-color");
    }
    public set borderBottomColorIndex(value: DOMString) {
        this.setColorIndexVariable("border-bottom-color-index", "border-bottom-color", String(value));
    }
    public get backgroundColorIndex() {
        return this.getColorIndexVariable("background-color-index", "background-color");
    }
    public set backgroundColorIndex(value: DOMString) {
        this.setColorIndexVariable("background-color-index", "background-color", String(value));
    }
    public get colorIndex() {
        return this.getColorIndexVariable("color-index", "color");
    }
    public set colorIndex(value: DOMString) {
        this.setColorIndexVariable("color-index", "color", String(value));
    }
    public get grayscaleColorIndex() {
        return this.declaration.getPropertyValue("--grayscale-color-index").trim();
    }
    public set grayscaleColorIndex(value: DOMString) {
        this.declaration.setProperty("--grayscale-color-index", String(value));
    }
    public get clut() {
        return this.declaration.getPropertyValue("--clut").trim();
    }
    public get resolution() {
        return this.declaration.getPropertyValue("--resolution").trim();
    }
    public get displayAspectRatio() {
        return this.declaration.getPropertyValue("--display-aspect-ratio").trim();
    }
    public get navIndex() {
        return this.declaration.getPropertyValue("--nav-index").trim();
    }
    public get navUp() {
        return this.declaration.getPropertyValue("--nav-up").trim();
    }
    public get navDown() {
        return this.declaration.getPropertyValue("--nav-down").trim();
    }
    public get navLeft() {
        return this.declaration.getPropertyValue("--nav-left").trim();
    }
    public get navRight() {
        return this.declaration.getPropertyValue("--nav-right").trim();
    }
    public get usedKeyList() {
        return this.declaration.getPropertyValue("--used-key-list").trim();
    }
    public set usedKeyList(value: DOMString) {
        value = String(value);
        this.declaration.setProperty("--used-key-list", value);
        if (this.node instanceof HTMLBodyElement) {
            // bodyにfocus/activeは運用されない
            this.eventTarget.dispatchEvent<"usedkeylistchanged">(new CustomEvent("usedkeylistchanged", {
                detail: {
                    usedKeyList: new Set(value.split(" ").filter((x): x is KeyGroup => {
                        return x === "basic" || x === "numeric-tuning" || x === "data-button" || x === "special-1" || x === "special-2";
                    }))
                }
            }));
        }
    }
    // Cプロファイル
    public get borderTopColor() { return this.declaration.getPropertyValue("border-top-color"); }
    public set borderTopColor(value: DOMString) { this.declaration.setProperty("border-top-color", String(value)); }
    public get borderRightColor() { return this.declaration.getPropertyValue("border-right-color"); }
    public set borderRightColor(value: DOMString) { this.declaration.setProperty("border-right-color", String(value)); }
    public get borderBottomColor() { return this.declaration.getPropertyValue("border-bottom-color"); }
    public set borderBottomColor(value: DOMString) { this.declaration.setProperty("border-bottom-color", String(value)); }
    public get borderLeftColor() { return this.declaration.getPropertyValue("border-left-color"); }
    public set borderLeftColor(value: DOMString) { this.declaration.setProperty("border-left-color", String(value)); }
    public get backgroundColor() { return this.declaration.getPropertyValue("--background-color").trim(); }
    // Cプロファイルで<a>でフォーカスが当たった時背景色を文字色を入れ替えるために変数としても追加する
    public set backgroundColor(value: DOMString) {
        value = String(value);
        this.declaration.setProperty("--background-color", value);
        this.declaration.setProperty("--background-color-inherit", value);
        this.declaration.setProperty("background-color", value);
    }
    public get color() { return this.declaration.getPropertyValue("--color").trim(); }
    public set color(value: DOMString) {
        value = String(value);
        this.declaration.setProperty("--color", value);
        this.declaration.setProperty("color", value);
    }
    public get WapMarqueeStyle() {
        return this.declaration.getPropertyValue("---wap-marquee-style").trim();
    }
    public get WapMarqueeLoop() {
        return this.declaration.getPropertyValue("---wap-marquee-loop").trim();
    }
    public get WapMarqueeSpeed() {
        return this.declaration.getPropertyValue("---wap-marquee-speed").trim();
    }
    public get WapInputFormat() {
        return this.declaration.getPropertyValue("---wap-input-format").trim();
    }
}
