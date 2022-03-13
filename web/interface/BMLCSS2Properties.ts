import { colorIndexToVar, varToColorIndex } from "../../src/transpile_css";

type DOMString = string;

export class BMLCSS2Properties {
    private declaration: CSSStyleDeclaration;
    private declarationToSet: CSSStyleDeclaration;
    public constructor(declaration: CSSStyleDeclaration, declarationToSet: CSSStyleDeclaration) {
        this.declaration = declaration;
        this.declarationToSet = declarationToSet;
    }

    private getColorIndexVariable(bmlPropName: string, propName: keyof typeof this.declaration): DOMString {
        const v = this.declaration.getPropertyValue("--" + bmlPropName).trim();
        if (v != "") {
            return v;
        }
        return varToColorIndex(this.declaration[propName] as string) ?? "";
    }

    private setColorIndexVariable(bmlPropName: string, propName: keyof typeof this.declaration, value: DOMString | null) {
        this.declarationToSet.setProperty("--" + bmlPropName, value);
        this.declarationToSet[propName as any] = colorIndexToVar(value) ?? "";
    }

    public get paddingTop() { return this.declaration.paddingTop; }
    public get paddingRight() { return this.declaration.paddingRight; }
    public get paddingBottom() { return this.declaration.paddingBottom; }
    public get paddingLeft() { return this.declaration.paddingLeft; }
    public get borderWidth() { return this.declaration.borderWidth; }
    public get borderStyle() { return this.declaration.borderStyle; }
    public get left() { return this.declaration.left; }
    public set left(value: DOMString) { this.declarationToSet.left = value; }
    public get top() { return this.declaration.top; }
    public set top(value: DOMString) { this.declarationToSet.top = value; }
    public get width() { return this.declaration.width; }
    public set width(value: DOMString) { this.declarationToSet.width = value; }
    public get height() { return this.declaration.height; }
    public set height(value: DOMString) { this.declarationToSet.height = value; }
    public get lineHeight() { return this.declaration.lineHeight; }
    public get visibility() { return this.declaration.visibility; }
    public set visibility(value: DOMString) { this.declarationToSet.visibility = value; }
    public get fontFamily() { return this.declaration.fontFamily; }
    public set fontFamily(value: DOMString) { this.declarationToSet.fontFamily = value; }
    public get fontSize() { return this.declaration.fontSize; }
    public set fontSize(value: DOMString) { this.declarationToSet.fontSize = value; }
    public get fontWeight() { return this.declaration.fontWeight; }
    public set fontWeight(value: DOMString) { this.declarationToSet.fontWeight = value; }
    public get textAlign() { return this.declaration.textAlign; }
    public get letterSpacing() { return this.declaration.letterSpacing; }
    public get borderTopColorIndex() {
        return this.getColorIndexVariable("border-top-color-index", "borderTopColor");
    }
    public set borderTopColorIndex(value: DOMString) {
        this.setColorIndexVariable("border-top-color-index", "borderTopColor", value);
    }
    public get borderRightColorIndex() {
        return this.getColorIndexVariable("border-right-color-index", "borderRightColor");
    }
    public set borderRightColorIndex(value: DOMString) {
        this.setColorIndexVariable("border-right-color-index", "borderRightColor", value);
    }
    public get borderrLeftColorIndex() {
        return this.getColorIndexVariable("border-left-color-index", "borderLeftColor");
    }
    public set borderrLeftColorIndex(value: DOMString) {
        this.setColorIndexVariable("border-left-color-index", "borderLeftColor", value);
    }
    public get borderBottomColorIndex() {
        return this.getColorIndexVariable("border-bottom-color-index", "borderBottomColor");
    }
    public set borderBottomColorIndex(value: DOMString) {
        this.setColorIndexVariable("border-bottom-color-index", "borderBottomColor", value);
    }
    public get backgroundColorIndex() {
        return this.getColorIndexVariable("background-color-index", "backgroundColor");
    }
    public set backgroundColorIndex(value: DOMString) {
        this.setColorIndexVariable("background-color-index", "backgroundColor", value ?? "");
    }
    public get colorIndex() {
        return this.getColorIndexVariable("color-index", "color");
    }
    public set colorIndex(value: DOMString) {
        this.setColorIndexVariable("color-index", "color", value);
    }
    public get grayscaleColorIndex() {
        return this.declaration.getPropertyValue("--grayscale-color-index").trim();
    }
    public set grayscaleColorIndex(value: DOMString) {
        this.declarationToSet.setProperty("--grayscale-color-index", value);
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
        this.declarationToSet.setProperty("--used-key-list", value);
    }
}
