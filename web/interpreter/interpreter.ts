export interface IInterpreter {
    reset(): void;
    addScript(script: string, src?: string): void;
    runScript(): Promise<void>;
    runEventHandler(funcName: string): Promise<void>;
}
