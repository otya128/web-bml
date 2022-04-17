import { EPG } from "../bml_browser";
import { AsyncBrowser, Browser } from "../browser";
import { Content } from "../content";
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
    setupEnvironment(browser: Browser, asyncBrowser: AsyncBrowser, resources: Resources, content: Content, epg: EPG, nvram: NVRAM): void;
}
