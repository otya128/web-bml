import {
    Completion,
    Context,
    createGlobalContext,
    InterpreterObject,
    Interruption,
    parse,
    Program,
    run,
} from "../../es2";
import { Interpreter } from "./interpreter";
import { Content } from "../content";
import { getTrace } from "../util/trace";
import { Resources } from "../resource";
import { BrowserAPI } from "../browser";
import { EPG } from "../bml_browser";
import { define, wrap } from "./es2_dom_binding";
import { defineBuiltinBinding, defineBrowserBinding, defineBinaryTableBinding } from "./es2_binding";

// const domTrace = getTrace("js-interpreter.dom");
// const eventTrace = getTrace("js-interpreter.event");
const interpreterTrace = getTrace("js-interpreter");

const LAUNCH_DOCUMENT_CALLED = { type: "launchDocumentCalled" } as const;

export class ES2Interpreter implements Interpreter {
    context: Context = null!; // lazyinit
    prototypes: Map<any, InterpreterObject> = new Map();
    map: WeakMap<any, InterpreterObject> = new WeakMap();

    public reset() {
        const context = createGlobalContext();
        this.context = context;
        this.prototypes = new Map();
        this.map = new WeakMap();
        const prototypes = this.prototypes;
        const map = this.map;
        // DOMのバインディングを定義
        define(this.context, prototypes, map);
        for (const p of prototypes.values()) {
            p.internalProperties.class = "hostobject";
        }
        context.realm.globalObject.properties.set("document", {
            readOnly: false,
            dontEnum: false,
            dontDelete: true,
            value: wrap(prototypes, map, this.content.bmlDocument),
        });
        defineBuiltinBinding(context, this.resources);
        defineBrowserBinding(context, this.resources, this.browserAPI, this.content, this.epg);
        defineBinaryTableBinding(context, this.resources);
        this.resetStack();
    }

    private _isExecuting: boolean;
    // lazyinit
    private browserAPI: BrowserAPI = null!;
    private resources: Resources = null!;
    private content: Content = null!;
    private epg: EPG = null!;
    public constructor() {
        this._isExecuting = false;
    }

    public setupEnvironment(browserAPI: BrowserAPI, resources: Resources, content: Content, epg: EPG): void {
        this.browserAPI = browserAPI;
        this._isExecuting = false;
        this.resources = resources;
        this.content = content;
        this.epg = epg;
        this.reset();
    }

    public addScript(script: string, src?: string): Promise<boolean> {
        let program: Program;
        try {
            program = parse(script, { name: src ?? "anonymous", source: script });
        } catch (e) {
            console.error("failed to parse script", src, e);
            return Promise.resolve(false);
        }
        return this.runScript(program);
    }

    private exeNum: number = 0;

    async runScript(program: Program): Promise<boolean> {
        if (this.isExecuting) {
            throw new Error("this.isExecuting");
        }
        const prevContext = this.content.context;
        const context = this.context;
        let exit = false;
        const exeNum = this.exeNum++;
        interpreterTrace("runScript()", exeNum, prevContext, this.content.context);
        try {
            this._isExecuting = true;
            while (true) {
                interpreterTrace("RUN SCRIPT", exeNum, prevContext, this.content.context);
                try {
                    let executionStartTime = performance.now();
                    // 50ms実行し続けると一旦中断
                    const shouldInterrupt = () => {
                        return performance.now() - executionStartTime > 50;
                    };
                    const iter = run(program, { ...context, shouldInterrupt }) as Generator<Promise<any> | Interruption | typeof LAUNCH_DOCUMENT_CALLED, Completion>;
                    let lastResult: any = undefined;
                    while (true) {
                        executionStartTime = performance.now();
                        const { value, done } = iter.next(lastResult);
                        lastResult = undefined;
                        if (typeof value === "object" && value != null && "type" in value && value.type === "launchDocumentCalled") {
                            interpreterTrace("browser.launchDocument called.");
                            exit = true;
                            break;
                        } else if (typeof value === "object" && value != null && "type" in value && value.type === "interruption") {
                            // 中断したら50ms待って再開
                            console.warn("script execution timeout");
                            await new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve(true);
                                }, 50);
                            });
                        } else if (value instanceof Promise) {
                            lastResult = await value;
                        }
                        if (done) {
                            break;
                        }
                    }
                    interpreterTrace("RETURN RUN SCRIPT", exeNum, prevContext, this.content.context);
                } catch (e) {
                    console.error("unhandled error", exeNum, prevContext, this.content.context, e);
                }
                if (this.content.context !== prevContext) {
                    console.error("context switched", this.content.context, prevContext);
                    exit = true;
                }
                break;
            }
            if (!exit && this.content.context !== prevContext) {
                console.error("context switched", this.content.context, prevContext);
                exit = true;
            }
        } finally {
            interpreterTrace("leave runScript()", exeNum, exit, prevContext, this.content.context);
            if (exit) {
                return true;
            } else {
                this._isExecuting = false;
            }
        }
        return false;
    }

    public get isExecuting() {
        return this._isExecuting;
    }

    public async runEventHandler(funcName: string): Promise<boolean> {
        return await this.addScript(`${funcName}();`, `eventHandler:${funcName}`);
    }

    public destroyStack(): void {
    }

    public resetStack(): void {
        this._isExecuting = false;
    }
}
