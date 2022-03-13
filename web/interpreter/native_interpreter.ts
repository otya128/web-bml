import { transpile } from "../../src/transpile_ecm";
import { LongJump } from "../resource";
import { IInterpreter } from "./interpreter";

export class NativeInterpreter implements IInterpreter {
    _isExecuting: boolean;
    windowKeys: Set<string>;
    public constructor() {
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

    public addScript(script: string, src?: string): Promise<void> {
        const elem = document.createElement("script");
        elem.textContent = transpile(script);
        document.body.appendChild(elem);
        return Promise.resolve();
    }

    public get isExecuting() {
        return this._isExecuting;
    }

    public runEventHandler(funcName: string): Promise<void> {
        if (this.isExecuting) {
            throw new Error("this.isExecuting");
        }
        try {
            this._isExecuting = true;
            return Promise.resolve(new Function(funcName + "();")());
        } finally {
            this._isExecuting = false;
            const hs = this.executionFinishedHandlers.slice();
            this.executionFinishedHandlers = [];
            for (const h of hs) {
                h();
            }
        }
    }

    public destroyStack(): void {
        throw new LongJump("long jump");
    }

    public resetStack(): void {
        this._isExecuting = false;
    }

    executionFinishedHandlers: (() => void)[] = [];

    public onceExecutionFinished(eventHandler: () => void): void {
        this.executionFinishedHandlers.push(eventHandler);
    }
}
