export interface IInterpreter {
    reset(): void;
    // trueが返った場合launchDocumentなどで実行が終了した
    addScript(script: string, src?: string): Promise<boolean>;
    // trueが返った場合launchDocumentなどで実行が終了した
    runEventHandler(funcName: string): Promise<boolean>;
    destroyStack(): void;
    resetStack(): void;
    get isExecuting(): boolean;
}
