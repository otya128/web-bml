import { transpile } from "../../src/transpile_ecm";
import { IInterpreter } from "./interpreter";

export class NativeInterpreter implements IInterpreter {
    public constructor() {
    }
    
    public reset() {

    }

    public addScript(script: string, src?: string) {
        const elem = document.createElement("script");
        elem.textContent = transpile(script);
        document.body.appendChild(elem);
    }

    public runScript(): Promise<void> {
        return Promise.resolve();
    }

    public runEventHandler(funcName: string): Promise<void> {
        return Promise.resolve(new Function(funcName + "();")());
    }
}
