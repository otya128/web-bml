import { EPG } from "../bml_browser";
import { Browser } from "../browser";
import { BMLDocument } from "../document";
import { NVRAM } from "../nvram";
import { Resources } from "../resource";

export interface Interpreter {
    reset(): void;
    // trueが返った場合launchDocumentなどで実行が終了した
    addScript(script: string, src?: string): Promise<boolean>;
    // trueが返った場合launchDocumentなどで実行が終了した
    runEventHandler(funcName: string): Promise<boolean>;
    destroyStack(): void;
    resetStack(): void;
    get isExecuting(): boolean;
    setupEnvironment(browser: Browser, resources: Resources, bmlDocument: BMLDocument, epg: EPG, nvram: NVRAM): void;
}
