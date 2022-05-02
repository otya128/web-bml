import { InputApplication, InputApplicationLaunchOptions, InputCancelReason, InputCharacterType } from "./bml_browser";

// Y=110未満には表示してはいけない (TR-B14 第二分冊 1.6)
export class OverlayInputApplication implements InputApplication {
    private readonly container: HTMLElement;
    private readonly input: HTMLInputElement;
    private readonly submitButton: HTMLButtonElement;
    private readonly cancelButton: HTMLButtonElement;
    private callback?: (value: string) => void;

    public constructor(container: HTMLElement) {
        this.container = container;
        this.input = container.querySelector("input")!;
        this.submitButton = container.querySelector("button.submit")!;
        this.cancelButton = container.querySelector("button.cancel")!;
        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.submit();
            }
        });
        this.submitButton.addEventListener("click", () => {
            this.submit();
        });
        this.cancelButton.addEventListener("click", () => {
            this.cancel("other");
        });
    }

    private submit(): void {
        if (this.callback != null) {
            if (this.input.reportValidity()) {
                this.callback(this.input.value);
                this.callback = undefined;
            } else {
                return;
            }
        }
        this.container.style.display = "none";
    }

    public launch({ characterType, allowedCharacters, maxLength, value, inputMode, callback }: InputApplicationLaunchOptions): void {
        this.input.maxLength = maxLength;
        this.input.value = value;
        this.input.inputMode = inputMode;
        if (allowedCharacters != null) {
            this.input.pattern = "[" + allowedCharacters.replace(/([\\\[\]])/g, "\\$1") + "]*";
        } else {
            this.input.pattern = ".*";
        }
        switch (characterType) {
            case "number":
                this.input.title = "半角数字を入力";
                break;
            case "alphabet":
                this.input.title = "半角英字または半角記号を入力";
                break;
            case "hankaku":
                this.input.title = "半角英数または半角記号を入力";
                break;
            case "zenkaku":
                this.input.title = "全角ひらがな、かたかな、英数、記号を入力";
                break;
            case "katakana":
                this.input.title = "全角かたかな、記号を入力";
                break;
            case "hiragana":
                this.input.title = "全角ひらがな、記号を入力";
                break;
            default:
                this.input.title = "";
        }
        this.container.style.display = "";
        this.callback = callback;
        this.input.focus();
    }

    public cancel(_reason: InputCancelReason): void {
        this.container.style.display = "none";
        this.callback = undefined;
    }

    public get isLaunching(): boolean {
        return !!this.callback;
    }
}
