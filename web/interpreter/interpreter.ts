export interface IInterpreter {
    reset(): void;
    addScript(script: string, src?: string): Promise<void>;
    runEventHandler(funcName: string): Promise<void>;
    destroyStack(): void;
    resetStack(): void;
    get isExecuting(): boolean;
    onceExecutionFinished(eventHandler: () => void): void;
}
