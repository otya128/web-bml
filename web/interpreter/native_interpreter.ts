import { transpile } from "../../src/transpile_ecm";
import { LongJump } from "../resource";
import { IInterpreter } from "./interpreter";

export class NativeInterpreter implements IInterpreter {
    _isExecuting: boolean;
    public constructor() {
        this._isExecuting = false;
    }
    
    public reset() {

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
    }

    executionFinishedHandlers: (() => void)[] = [];

    public onceExecutionFinished(eventHandler: () => void): void {
        this.executionFinishedHandlers.push(eventHandler);
    }
}
