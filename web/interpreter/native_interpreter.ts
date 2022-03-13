import { transpile } from "../../src/transpile_ecm";
import { Browser } from "../browser";
import { LongJump } from "../resource";
import { IInterpreter } from "./interpreter";

export class NativeInterpreter implements IInterpreter {
    _isExecuting: boolean;
    windowKeys: Set<string>;
    public constructor(browser: Browser) {
        window.browser = browser;
        this._isExecuting = false;
        this.windowKeys = new Set<string>(Object.keys(window));
    }
    
    public reset() {
        for (const k of Object.keys(window)) {
            if (Number.parseInt(k).toString() === k) {
                continue;
            }
            if (!this.windowKeys.has(k)) {
                (window as any)[k] = undefined;
                // delete (window as any)[k];
            }
        }
    }

    public addScript(script: string, src?: string): Promise<boolean> {
        const elem = document.createElement("script");
        elem.textContent = transpile(script);
        document.body.appendChild(elem);
        return Promise.resolve(false);
    }

    public get isExecuting() {
        return this._isExecuting;
    }

    public runEventHandler(funcName: string): Promise<boolean> {
        if (this.isExecuting) {
            throw new Error("this.isExecuting");
        }
        try {
            this._isExecuting = true;
            new Function(funcName + "();")();
            return Promise.resolve(false);
        } finally {
            this._isExecuting = false;
        }
    }

    public destroyStack(): void {
        throw new LongJump("long jump");
    }

    public resetStack(): void {
        this._isExecuting = false;
    }
}
