import {
    Caller,
    Context,
    getDateObjectValue,
    getProperty,
    InterpreterObject,
    InterpreterTypeError,
    isObject,
    newArray,
    newDate,
    newNativeFunction,
    newObject,
    PrimitiveValue,
    putProperty,
    toBoolean,
    toNumber,
    toPrimitive,
    toString,
    Value,
} from "../../es2";
import * as BT from "../binary_table";
import { Content } from "../content";
import { getLog } from "../util/trace";
import { Profile, Resources } from "../resource";
import { BrowserAPI } from "../browser";
import * as bmlDate from "../date";
import * as bmlNumber from "../number";
import * as bmlString from "../string";
import { EPG } from "../bml_browser";
import { getTextDecoder } from "../text";

// const domTrace = getTrace("js-interpreter.dom");
// const eventTrace = getTrace("js-interpreter.event");
const browserLog = getLog("js-interpreter.browser");

const LAUNCH_DOCUMENT_CALLED = { type: "launchDocumentCalled" } as const;

function wrapArray(ctx: Context, array: any[] | PrimitiveValue): Value {
    if (!Array.isArray(array)) {
        return array;
    }
    const a: Value[] = [];
    for (const i of array) {
        if (Array.isArray(i)) {
            a.push(wrapArray(ctx, i));
        } else {
            a.push(i);
        }
    }
    return newArray(ctx, a);
}

function wrapDate(ctx: Context, date: Date | PrimitiveValue): Value {
    if (date instanceof Date) {
        return newDate(ctx, date)
    } else {
        return date;
    }
}

export function defineBuiltinBinding(context: Context, resources: Resources) {
    context.realm.intrinsics.Number.properties.set("MAX_VALUE", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: bmlNumber.MAX_VALUE,
    });
    context.realm.intrinsics.Number.properties.set("MIN_VALUE", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: bmlNumber.MIN_VALUE,
    });
    context.realm.intrinsics.String.properties.set("fromCharCode", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(
            context.realm.intrinsics.FunctionPrototype,
            function* stringFromCharCode(ctx, _self, args, caller: Caller) {
                const codes: number[] = [];
                for (const arg of args) {
                    codes.push(yield* toNumber(ctx, arg, caller));
                }
                if (resources.profile === Profile.TrProfileC) {
                    return bmlString.shiftJISFromCharCode(...codes);
                }
                return bmlString.eucJPFromCharCode(...codes);
            },
            1,
            "fromCharCode"
        ),
    });
    // 比較で使うcharCodeAtの定義
    if (resources.profile === Profile.TrProfileC) {
        context.realm.intrinsics.StringPrototypeCharCodeAt = function shiftJISCharCodeAt(str: string, pos: number) {
            return bmlString.shiftJISCharCodeAt.call(str, pos);
        }
    } else {
        context.realm.intrinsics.StringPrototypeCharCodeAt = function eucJPCharCodeAt(str: string, pos: number) {
            return bmlString.eucJPCharCodeAt.call(str, pos);
        }
    }
    context.realm.intrinsics.StringPrototype.properties.set("charCodeAt", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(
            context.realm.intrinsics.FunctionPrototype,
            function* stringCharCodeAt(ctx, self, args, caller) {
                const str = yield* toString(ctx, self, caller);
                const pos = yield* toNumber(ctx, args[0], caller);
                if (resources.profile === Profile.TrProfileC) {
                    return bmlString.shiftJISCharCodeAt.call(str, pos);
                }
                return bmlString.eucJPCharCodeAt.call(str, pos);
            },
            1,
            "charCodeAt"
        ),
    });
    const date = newNativeFunction(
        context.realm.intrinsics.FunctionPrototype,
        function* date(_ctx, _self, _args) {
            if (resources.currentTimeUnixMillis != null) {
                return bmlDate.toString.call(new Date(resources.currentTimeUnixMillis));
            } else {
                return bmlDate.toString.call(new Date());
            }
        },
        7,
        "Date"
    );
    date.internalProperties.construct = function* dateConstructor(ctx: Context, args: Value[], caller: Caller): Generator<unknown, Value> {
        args.length = Math.min(7, args.length);
        let value: Date;
        if (args.length === 1) {
            const valuePrimitive = yield* toPrimitive(ctx, args[0], "default", caller);
            if (typeof valuePrimitive === "string") {
                value = new Date(valuePrimitive);
            } else {
                value = new Date(yield* toNumber(ctx, valuePrimitive, caller));
            }
        } else if (args.length === 0) {
            if (resources.currentTimeUnixMillis != null) {
                value = new Date(resources.currentTimeUnixMillis);
            } else {
                value = new Date();
            }
        } else {
            let numbers: number[] = [];
            for (const arg of args) {
                numbers.push(yield* toNumber(ctx, arg, caller));
            }
            value = new Date(...(numbers as []));
        }
        return newDate(ctx, value);
    };
    const datePrototype: InterpreterObject = newObject(context.realm.intrinsics.ObjectPrototype);
    datePrototype.properties.set("constructor", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: date,
    });
    for (const f of [
        "valueOf",
        "getTime",
        "getFullYear",
        "getUTCFullYear",
        "getMonth",
        "getUTCMonth",
        "getDate",
        "getUTCDate",
        "getDay",
        "getUTCDay",
        "getHours",
        "getUTCHours",
        "getMinutes",
        "getUTCMinutes",
        "getSeconds",
        "getUTCSeconds",
        "getMilliseconds",
        "getUTCMilliseconds",
        "getTimezoneOffset",
    ] as const) {
        datePrototype.properties.set(f, {
            readOnly: false,
            dontEnum: true,
            dontDelete: false,
            value: newNativeFunction(
                context.realm.intrinsics.FunctionPrototype,
                function* datePrototypeWrapper(ctx, self, _args, caller) {
                    const value = getDateObjectValue(self);
                    if (value == null) {
                        throw new InterpreterTypeError(`Date.prototype.${f}: this must be Date object`, ctx, caller);
                    }
                    return new Date(value)[f]();
                },
                0,
                f
            ),
        });
    }
    for (const [f, length] of [
        ["setTime", 1],
        ["setMilliseconds", 1],
        ["setUTCMilliseconds", 1],
        ["setSeconds", 2],
        ["setUTCSeconds", 2],
        ["setMinutes", 3],
        ["setUTCMinutes", 3],
        ["setHours", 4],
        ["setUTCHours", 4],
        ["setDate", 1],
        ["setUTCDate", 1],
        ["setMonth", 2],
        ["setUTCMonth", 2],
        ["setFullYear", 3],
        ["setUTCFullYear", 3],
    ] as const) {
        datePrototype.properties.set(f, {
            readOnly: false,
            dontEnum: true,
            dontDelete: false,
            value: newNativeFunction(
                context.realm.intrinsics.FunctionPrototype,
                function* datePrototypeWrapper(ctx, self, args, caller) {
                    const value = getDateObjectValue(self);
                    if (value == null || !isObject(self)) {
                        throw new InterpreterTypeError(`Date.prototype.${f}: this must be Date object`, ctx, caller);
                    }
                    args.length = Math.min(args.length, length);
                    let numbers: number[] = [];
                    for (const arg of args) {
                        numbers.push(yield* toNumber(ctx, arg, caller));
                    }
                    self.internalProperties.value = new Date(value)[f](...(numbers as [number]));
                    return self.internalProperties.value;
                },
                length,
                f
            ),
        });
    }
    datePrototype.properties.set("getYear", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(
            context.realm.intrinsics.FunctionPrototype,
            function* datePrototypeGetYear(ctx, self, _args, caller) {
                const value = getDateObjectValue(self);
                if (value == null) {
                    throw new InterpreterTypeError(`Date.prototype.getYear: this must be Date object`, ctx, caller);
                }
                return new Date(value).getFullYear() - 1900;
            },
            0,
            "getYear"
        ),
    });
    datePrototype.properties.set("setYear", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(
            context.realm.intrinsics.FunctionPrototype,
            function* datePrototypeSetSeconds(ctx, self, args, caller) {
                const value = getDateObjectValue(self);
                if (value == null) {
                    throw new InterpreterTypeError(`Date.prototype.setYear: this must be Date object`, ctx, caller);
                }
                const year = yield* toNumber(ctx, args[0], caller);
                return new Date(value).setFullYear(year);
            },
            2,
            "setYear"
        ),
    });
    date.properties.set("prototype", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: datePrototype,
    });
    datePrototype.properties.set("toString", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(
            context.realm.intrinsics.FunctionPrototype,
            function* dateToString(ctx, self, _args, caller) {
                const value = getDateObjectValue(self);
                if (value == null) {
                    throw new InterpreterTypeError("Date.prototype.toString: this must be Date object", ctx, caller);
                }
                return bmlDate.toString.call(new Date(value));
            },
            1,
            "toString"
        ),
    });
    datePrototype.properties.set("toLocaleString", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(
            context.realm.intrinsics.FunctionPrototype,
            function* dateToString(ctx, self, _args, caller) {
                const value = getDateObjectValue(self);
                if (value == null) {
                    throw new InterpreterTypeError("Date.prototype.toLocaleString: this must be Date object", ctx, caller);
                }
                return bmlDate.toString.call(new Date(value));
            },
            0,
            "toLocaleString"
        ),
    });
    datePrototype.properties.set("toUTCString", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(
            context.realm.intrinsics.FunctionPrototype,
            function* dateToString(ctx, self, _args, caller) {
                const value = getDateObjectValue(self);
                if (value == null) {
                    throw new InterpreterTypeError("Date.prototype.toUTCString: this must be Date object", ctx, caller);
                }
                return bmlDate.toUTCString.call(new Date(value));
            },
            0,
            "toUTCString"
        ),
    });
    context.realm.intrinsics.Date = date;
    context.realm.intrinsics.DatePrototype = datePrototype;
    context.realm.globalObject.properties.set("Date", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: date,
    });
    context.realm.globalObject.properties.delete("Infinity");
    context.realm.globalObject.properties.delete("eval");
    context.realm.globalObject.properties.delete("parseFloat");
    context.realm.globalObject.properties.delete("escape");
    context.realm.globalObject.properties.delete("unescape");
    context.realm.globalObject.properties.delete("isFinite");
    context.realm.intrinsics.Number.properties.delete("NEGATIVE_INFINITY");
    context.realm.intrinsics.Number.properties.delete("POSITIVE_INFINITY");
    context.realm.globalObject.properties.delete("Math");
    context.realm.globalObject.internalProperties.prototype = null;
}

export function defineBrowserBinding(context: Context, resources: Resources, browserAPI: BrowserAPI, content: Content, epg: EPG) {
    const browser = newObject(context.realm.intrinsics.ObjectPrototype);
    browser.internalProperties.class = "hostobject";
    context.realm.globalObject.properties.set("browser", {
        readOnly: false,
        dontEnum: false,
        dontDelete: false,
        value: browser,
    });
    browser.internalProperties.hostObjectValue = browserAPI;
    const ureg = newObject(context.realm.intrinsics.ObjectPrototype);
    ureg.internalProperties.hostObjectValue = browserAPI;
    ureg.internalProperties.class = "hostobject";
    for (let i = 0; i < browserAPI.browser.Ureg.length; i++) {
        ureg.properties.set(String(i), {
            readOnly: false,
            dontEnum: false,
            dontDelete: true,
            value: undefined,
        });
    }
    ureg.internalProperties.get = function* browser$Ureg$get(_ctx, _self, propertyName, _caller) {
        return browserAPI.getUreg(Number(propertyName));
    };
    ureg.internalProperties.put = function* browser$Ureg$get(ctx, _self, propertyName, value, caller) {
        browserAPI.setUreg(Number(propertyName), yield* toString(ctx, value, caller));
    };
    const greg = newObject(context.realm.intrinsics.ObjectPrototype);
    greg.internalProperties.hostObjectValue = browserAPI;
    greg.internalProperties.class = "hostobject";
    for (let i = 0; i < browserAPI.browser.Greg.length; i++) {
        greg.properties.set(String(i), {
            readOnly: false,
            dontEnum: false,
            dontDelete: true,
            value: undefined,
        });
    }
    greg.internalProperties.get = function* browser$Greg$get(_ctx, _self, propertyName, _caller) {
        return browserAPI.getGreg(Number(propertyName));
    };
    greg.internalProperties.put = function* browser$Greg$get(ctx, _self, propertyName, value, caller) {
        browserAPI.setGreg(Number(propertyName), yield* toString(ctx, value, caller));
    };
    const desc = {
        readOnly: true,
        dontEnum: true,
        dontDelete: true
    } as const;
    browser.properties.set("Ureg", {
        ...desc,
        value: ureg,
    });
    browser.properties.set("Greg", {
        ...desc,
        value: greg,
    });
    function* launchDocument(documentName: string, transitionStyle: string | undefined) {
        browserLog("launchDocument", documentName, transitionStyle);
        if (documentName.startsWith("#")) {
            // Cプロファイル TR-B14 第三分冊
            // 8.2.3.4 #fragment運用における受信機動作およびコンテンツガイドライン
            // "#top"の場合リロードされないことが望ましい
            // "startup.bml#top"の場合リロードが行われることが望ましい
            content.focusFragment(documentName);
            return 0;
        }
        const r = content.launchDocument(String(documentName));
        yield LAUNCH_DOCUMENT_CALLED;
        return r;
    }

    function* reloadActiveDocument() {
        browserLog("reloadActiveDocument");
        const r = content.launchDocument(browserAPI.browser.getActiveDocument()!);
        yield LAUNCH_DOCUMENT_CALLED;
        return r;
    }

    function* X_DPA_launchDocWithLink(documentName: string, transitionStyle: string | undefined) {
        console.log("%X_DPA_launchDocWithLink", "font-size: 4em", documentName);
        if (resources.profile !== Profile.TrProfileC) {
            yield LAUNCH_DOCUMENT_CALLED;
            return NaN;
        }
        // 絶対URIを使用すること
        // TR-B14 第三分冊 8.3.10.2
        if (!documentName.startsWith("http://") && documentName.startsWith("https://")) {
            yield LAUNCH_DOCUMENT_CALLED;
            return NaN;
        }
        if (!resources.isInternetContent) {
            // 放送受信状態で使われた場合失敗動作となる
            // エラーメッセージを表示すべき (8.3.11.4)
            content.quitDocument();
            yield LAUNCH_DOCUMENT_CALLED;
            return NaN;
        }
        const r = content.launchDocument(documentName, { withLink: true });
        yield LAUNCH_DOCUMENT_CALLED;
        return r;
    }

    function* epgTune(service_ref: string) {
        browserLog("%cepgTune", "font-size: 4em", service_ref);
        const { originalNetworkId, transportStreamId, serviceId } = resources.parseServiceReference(service_ref);
        if (originalNetworkId == null || transportStreamId == null || serviceId == null) {
            yield LAUNCH_DOCUMENT_CALLED;
            return NaN;
        } else {
            const r = epg.tune?.(originalNetworkId, transportStreamId, serviceId);
            yield LAUNCH_DOCUMENT_CALLED;
            return r;
        }
    }
    browser.properties.set("epgGetEventStartTime", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$epgGetEventStartTime(ctx, _self, args, caller) {
            return wrapDate(ctx, browserAPI.browser.epgGetEventStartTime(yield* toString(ctx, args[0], caller)));
        }, 1, "epgGetEventStartTime"),
    });
    browser.properties.set("epgGetEventDuration", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$epgGetEventDuration(ctx, _self, args, caller) {
            return browserAPI.browser.epgGetEventDuration(yield* toString(ctx, args[0], caller));
        }, 1, "epgGetEventDuration"),
    });
    browser.properties.set("setCurrentDateMode", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$setCurrentDateMode(ctx, _self, args, caller) {
            return browserAPI.browser.setCurrentDateMode(yield* toNumber(ctx, args[0], caller));
        }, 1, "setCurrentDateMode"),
    });
    browser.properties.set("getProgramRelativeTime", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getProgramRelativeTime(ctx, _self, args, caller) {
            return browserAPI.browser.getProgramRelativeTime();
        }, 0, "getProgramRelativeTime"),
    });
    browser.properties.set("subDate", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$subDate(ctx, _self, args, caller) {
            const target = getDateObjectValue(args[0]);
            if (target == null) {
                return NaN;
            }
            const base = getDateObjectValue(args[1]);
            if (base == null) {
                return NaN;
            }
            return browserAPI.browser.subDate(new Date(target), new Date(base), yield* toNumber(ctx, args[2], caller));
        }, 3, "subDate"),
    });
    browser.properties.set("addDate", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$addDate(ctx, _self, args, caller) {
            const target = getDateObjectValue(args[0]);
            if (target == null) {
                return NaN;
            }
            return wrapDate(ctx, browserAPI.browser.addDate(new Date(target), yield* toNumber(ctx, args[1], caller), yield* toNumber(ctx, args[2], caller)));
        }, 3, "addDate"),
    });
    browser.properties.set("formatNumber", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$formatNumber(ctx, _self, args, caller) {
            return browserAPI.browser.formatNumber(yield* toNumber(ctx, args[0], caller));
        }, 1, "formatNumber"),
    });
    browser.properties.set("unlockModuleOnMemory", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$unlockModuleOnMemory(ctx, _self, args, caller) {
            return browserAPI.browser.unlockModuleOnMemory(yield* toString(ctx, args[0], caller));
        }, 1, "unlockModuleOnMemory"),
    });
    browser.properties.set("unlockModuleOnMemoryEx", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$unlockModuleOnMemoryEx(ctx, _self, args, caller) {
            return browserAPI.browser.unlockModuleOnMemoryEx(yield* toString(ctx, args[0], caller));
        }, 1, "unlockModuleOnMemoryEx"),
    });
    browser.properties.set("unlockAllModulesOnMemory", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$unlockAllModulesOnMemory(ctx, _self, args, caller) {
            return browserAPI.browser.unlockAllModulesOnMemory();
        }, 0, "unlockAllModulesOnMemory"),
    });
    browser.properties.set("lockModuleOnMemory", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$lockModuleOnMemory(ctx, _self, args, caller) {
            return browserAPI.browser.lockModuleOnMemory(yield* toString(ctx, args[0], caller));
        }, 1, "lockModuleOnMemory"),
    });
    browser.properties.set("lockModuleOnMemoryEx", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$lockModuleOnMemoryEx(ctx, _self, args, caller) {
            return browserAPI.browser.lockModuleOnMemoryEx(yield* toString(ctx, args[0], caller));
        }, 1, "lockModuleOnMemoryEx"),
    });
    browser.properties.set("lockScreen", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$lockScreen(ctx, _self, args, caller) {
            return browserAPI.browser.lockScreen();
        }, 0, "lockScreen"),
    });
    browser.properties.set("unlockScreen", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$unlockScreen(ctx, _self, args, caller) {
            return browserAPI.browser.unlockScreen();
        }, 0, "unlockScreen"),
    });
    browser.properties.set("getBrowserSupport", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getBrowserSupport(ctx, _self, args, caller) {
            const sProvider = yield* toString(ctx, args[0], caller);
            const functionname = yield* toString(ctx, args[1], caller);
            const additionalinfoList = args.slice(2);
            const additionalinfoListString: string[] = [];
            for (const a of additionalinfoList) {
                additionalinfoListString.push(yield* toString(ctx, a, caller));
            }
            return browserAPI.browser.getBrowserSupport(sProvider, functionname, ...additionalinfoListString);
        }, 2, "getBrowserSupport"),
    });
    browser.properties.set("getBrowserStatus", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getBrowserStatus(ctx, _self, args, caller) {
            return browserAPI.browser.getBrowserStatus(yield* toString(ctx, args[0], caller), yield* toString(ctx, args[1], caller), yield* toString(ctx, args[2], caller));
        }, 3, "getBrowserStatus"),
    });
    browser.properties.set("launchDocument", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$launchDocument(ctx, _self, args, caller) {
            const documentName = yield* toString(ctx, args[0], caller);
            const transitionStyle = args[1] === undefined ? args[1] : yield* toString(ctx, args[1], caller);
            return yield* launchDocument(documentName, transitionStyle);
        }, 1, "launchDocument"),
    });
    browser.properties.set("reloadActiveDocument", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$reloadActiveDocument(ctx, _self, args, caller) {
            return yield* reloadActiveDocument();
        }, 0, "reloadActiveDocument"),
    });
    browser.properties.set("readPersistentArray", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$readPersistentArray(ctx, _self, args, caller) {
            const r = browserAPI.browser.readPersistentArray(yield* toString(ctx, args[0], caller), yield* toString(ctx, args[1], caller));
            return wrapArray(ctx, r);
        }, 2, "readPersistentArray"),
    });
    browser.properties.set("writePersistentArray", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$writePersistentArray(ctx, _self, args, caller) {
            const filename = yield* toString(ctx, args[0], caller);
            const structure = yield* toString(ctx, args[1], caller);
            const fields = BT.parseBinaryStructure(structure);
            if (fields == null) {
                return NaN;
            }
            if (!isObject(args[2])) {
                return NaN;
            }
            const a: any[] = [];
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                switch (field.type) {
                    case BT.BinaryTableType.Boolean:
                        a[i] = toBoolean(yield* getProperty(ctx, args[2], String(i), caller));
                        break;
                    case BT.BinaryTableType.UnsignedInteger:
                    case BT.BinaryTableType.Integer:
                        a[i] = yield* toNumber(ctx, yield* getProperty(ctx, args[2], String(i), caller), caller);
                        break;
                    case BT.BinaryTableType.String:
                        a[i] = yield* toString(ctx, yield* getProperty(ctx, args[2], String(i), caller), caller);
                        break;
                }
            }
            return browserAPI.browser.writePersistentArray(filename, structure, a);
        }, 3, "writePersistentArray"),
    });
    browser.properties.set("checkAccessInfoOfPersistentArray", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$checkAccessInfoOfPersistentArray(ctx, _self, args, caller) {
            return browserAPI.browser.checkAccessInfoOfPersistentArray(yield* toString(ctx, args[0], caller));
        }, 1, "checkAccessInfoOfPersistentArray"),
    });
    browser.properties.set("writePersistentArrayWithAccessCheck", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$writePersistentArrayWithAccessCheck(ctx, _self, args, caller) {
            const filename = yield* toString(ctx, args[0], caller);
            const structure = yield* toString(ctx, args[1], caller);
            const fields = BT.parseBinaryStructure(structure);
            if (fields == null) {
                return NaN;
            }
            if (!isObject(args[2])) {
                return NaN;
            }
            const a: any[] = [];
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                switch (field.type) {
                    case BT.BinaryTableType.Boolean:
                        a[i] = toBoolean(yield* getProperty(ctx, args[2], String(i), caller));
                        break;
                    case BT.BinaryTableType.UnsignedInteger:
                    case BT.BinaryTableType.Integer:
                        a[i] = yield* toNumber(ctx, yield* getProperty(ctx, args[2], String(i), caller), caller);
                        break;
                    case BT.BinaryTableType.String:
                        a[i] = yield* toString(ctx, yield* getProperty(ctx, args[2], String(i), caller), caller);
                        break;
                }
            }
            return browserAPI.browser.writePersistentArrayWithAccessCheck(filename, structure, a);
        }, 3, "writePersistentArrayWithAccessCheck"),
    });
    browser.properties.set("readPersistentArrayWithAccessCheck", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$readPersistentArrayWithAccessCheck(ctx, _self, args, caller) {
            const r = browserAPI.browser.readPersistentArrayWithAccessCheck(yield* toString(ctx, args[0], caller), yield* toString(ctx, args[1], caller));
            return wrapArray(ctx, r);
        }, 2, "readPersistentArrayWithAccessCheck"),
    });
    browser.properties.set("random", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$random(ctx, _self, args, caller) {
            return browserAPI.browser.random(yield* toNumber(ctx, args[0], caller));
        }, 1, "random"),
    });
    browser.properties.set("getActiveDocument", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getActiveDocument(ctx, _self, args, caller) {
            return browserAPI.browser.getActiveDocument();
        }, 0, "getActiveDocument"),
    });
    browser.properties.set("getResidentAppVersion", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getResidentAppVersion(ctx, _self, args, caller) {
            const r = browserAPI.browser.getResidentAppVersion(yield* toString(ctx, args[0], caller));
            return wrapArray(ctx, r);
        }, 1, "getResidentAppVersion"),
    });
    browser.properties.set("getLockedModuleInfo", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getLockedModuleInfo(ctx, _self, args, caller) {
            const r = browserAPI.browser.getLockedModuleInfo();
            return wrapArray(ctx, r);
        }, 0, "getLockedModuleInfo"),
    });
    browser.properties.set("detectComponent", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$detectComponent(ctx, _self, args, caller) {
            return browserAPI.browser.detectComponent(yield* toString(ctx, args[0], caller));
        }, 1, "detectComponent"),
    });
    browser.properties.set("getProgramID", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getProgramID(ctx, _self, args, caller) {
            return browserAPI.browser.getProgramID(yield* toNumber(ctx, args[0], caller));
        }, 1, "getProgramID"),
    });
    browser.properties.set("playRomSound", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$playRomSound(ctx, _self, args, caller) {
            return browserAPI.browser.playRomSound(yield* toString(ctx, args[0], caller));
        }, 1, "playRomSound"),
    });
    browser.properties.set("getBrowserVersion", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getBrowserVersion(ctx, _self, args, caller) {
            const r = browserAPI.browser.getBrowserVersion();
            return wrapArray(ctx, r);
        }, 0, "getBrowserVersion"),
    });
    browser.properties.set("getTuningLinkageSource", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getTuningLinkageSource(ctx, _self, args, caller) {
            return browserAPI.browser.getTuningLinkageSource();
        }, 0, "getTuningLinkageSource"),
    });
    browser.properties.set("getTuningLinkageType", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getTuningLinkageType(ctx, _self, args, caller) {
            return browserAPI.browser.getTuningLinkageType();
        }, 0, "getTuningLinkageType"),
    });
    browser.properties.set("getIRDID", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getIRDID(ctx, _self, args, caller) {
            return browserAPI.browser.getIRDID(yield* toNumber(ctx, args[0], caller));
        }, 1, "getIRDID"),
    });
    browser.properties.set("isIPConnected", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$isIPConnected(ctx, _self, args, caller) {
            return browserAPI.browser.isIPConnected();
        }, 0, "isIPConnected"),
    });
    browser.properties.set("getConnectionType", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getConnectionType(ctx, _self, args, caller) {
            return browserAPI.browser.getConnectionType();
        }, 0, "getConnectionType"),
    });
    browser.properties.set("setInterval", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$setInterval(ctx, _self, args, caller) {
            return browserAPI.browser.setInterval(yield* toString(ctx, args[0], caller), yield* toNumber(ctx, args[1], caller), yield* toNumber(ctx, args[2], caller));
        }, 3, "setInterval"),
    });
    browser.properties.set("clearTimer", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$clearTimer(ctx, _self, args, caller) {
            return browserAPI.browser.clearTimer(yield* toNumber(ctx, args[0], caller));
        }, 1, "clearTimer"),
    });
    browser.properties.set("pauseTimer", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$pauseTimer(ctx, _self, args, caller) {
            return browserAPI.browser.pauseTimer(yield* toNumber(ctx, args[0], caller));
        }, 1, "pauseTimer"),
    });
    browser.properties.set("resumeTimer", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$resumeTimer(ctx, _self, args, caller) {
            return browserAPI.browser.resumeTimer(yield* toNumber(ctx, args[0], caller));
        }, 1, "resumeTimer"),
    });
    browser.properties.set("getNPT", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$getNPT(ctx, _self, args, caller) {
            return browserAPI.browser.getNPT();
        }, 0, "getNPT"),
    });
    browser.properties.set("X_DPA_getComBrowserUA", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$X_DPA_getComBrowserUA(ctx, _self, args, caller) {
            const r = browserAPI.browser.X_DPA_getComBrowserUA();
            return wrapArray(ctx, r);
        }, 0, "X_DPA_getComBrowserUA"),
    });
    browser.properties.set("X_DPA_startResidentApp", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$X_DPA_startResidentApp(ctx, _self, args, caller) {
            const appName = yield* toString(ctx, args[0], caller);
            const showAV = yield* toNumber(ctx, args[1], caller);
            const returnURI = yield* toString(ctx, args[2], caller);
            const Ex_info = args.slice(3);
            const Ex_infoString: string[] = [];
            for (const e of Ex_info) {
                Ex_infoString.push(yield* toString(ctx, e, caller));
            }
            return browserAPI.browser.X_DPA_startResidentApp(appName, showAV, returnURI, ...Ex_infoString);
        }, 3, "X_DPA_startResidentApp"),
    });
    browser.properties.set("X_DPA_getIRDID", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$X_DPA_getIRDID(ctx, _self, args, caller) {
            return browserAPI.browser.X_DPA_getIRDID(yield* toNumber(ctx, args[0], caller));
        }, 1, "X_DPA_getIRDID"),
    });
    browser.properties.set("X_DPA_writeCproBM", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$X_DPA_writeCproBM(ctx, _self, args, caller) {
            return browserAPI.browser.X_DPA_writeCproBM(yield* toString(ctx, args[0], caller), yield* toString(ctx, args[1], caller), yield* toString(ctx, args[2], caller), yield* toNumber(ctx, args[3], caller));
        }, 1, "X_DPA_writeCproBM"),
    });
    browser.properties.set("X_DPA_launchDocWithLink", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$X_DPA_writeCproBM(ctx, _self, args, caller) {
            return yield* X_DPA_launchDocWithLink(yield* toString(ctx, args[0], caller), args[1] === undefined ? args[1] : yield* toString(ctx, args[1], caller));
        }, 1, "X_DPA_launchDocWithLink"),
    });
    browser.properties.set("epgTune", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$X_DPA_writeCproBM(ctx, _self, args, caller) {
            return yield* epgTune(yield* toString(ctx, args[0], caller));
        }, 1, "epgTune"),
    });

    browser.properties.set("loadDRCS", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$loadDRCS(ctx, _self, args, caller) {
            const r: Awaited<ReturnType<typeof browserAPI.asyncBrowser.loadDRCS>> = yield browserAPI.asyncBrowser.loadDRCS(yield* toString(ctx, args[0], caller));
            return r;
        }, 1, "loadDRCS"),
    });
    browser.properties.set("transmitTextDataOverIP", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$transmitTextDataOverIP(ctx, _self, args, caller) {
            const r: Awaited<ReturnType<typeof browserAPI.asyncBrowser.transmitTextDataOverIP>> = yield browserAPI.asyncBrowser.transmitTextDataOverIP(yield* toString(ctx, args[0], caller), yield* toString(ctx, args[1], caller), yield* toString(ctx, args[2], caller));
            return wrapArray(ctx, r);
        }, 3, "transmitTextDataOverIP"),
    });
    browser.properties.set("confirmIPNetwork", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$confirmIPNetwork(ctx, _self, args, caller) {
            const r: Awaited<ReturnType<typeof browserAPI.asyncBrowser.confirmIPNetwork>> = yield browserAPI.asyncBrowser.confirmIPNetwork(yield* toString(ctx, args[0], caller), yield* toNumber(ctx, args[1], caller), args[2] === undefined ? undefined : yield* toNumber(ctx, args[2], caller));
            return wrapArray(ctx, r);
        }, 2, "confirmIPNetwork"),
    });
    browser.properties.set("sleep", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$sleep(ctx, _self, args, caller) {
            const r: Awaited<ReturnType<typeof browserAPI.asyncBrowser.sleep>> = yield browserAPI.asyncBrowser.sleep(yield* toNumber(ctx, args[0], caller));
            return r;
        }, 1, "sleep"),
    });
    browser.properties.set("unlockScreen", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$unlockScreen(ctx, _self, args, caller) {
            const r: Awaited<ReturnType<typeof browserAPI.asyncBrowser.unlockScreen>> = yield browserAPI.asyncBrowser.unlockScreen();
            return r;
        }, 0, "unlockScreen"),
    });
    browser.properties.set("X_CSP_setAccessInfoToProviderArea", {
        ...desc,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* browser$X_CSP_setAccessInfoToProviderArea(ctx, _self, args, caller) {
            const r: Awaited<ReturnType<typeof browserAPI.asyncBrowser.X_CSP_setAccessInfoToProviderArea>> = yield browserAPI.asyncBrowser.X_CSP_setAccessInfoToProviderArea(yield* toString(ctx, args[0], caller), yield* toString(ctx, args[1], caller));
            return r;
        }, 2, "X_CSP_setAccessInfoToProviderArea"),
    });
}

export function defineBinaryTableBinding(context: Context, resources: Resources) {
    const desc = {
        readOnly: true,
        dontEnum: true,
        dontDelete: true
    } as const;
    function* BinaryTable$construct(ctx: Context, args: Value[], caller: Caller) {
        const table_ref = yield* toString(ctx, args[0], caller);
        const structure = yield* toString(ctx, args[1], caller);
        const res: Awaited<ReturnType<typeof resources.fetchResourceAsync>> = yield resources.fetchResourceAsync(table_ref);
        if (!res) {
            browserLog("BinaryTable", table_ref, "not found");
            return null;
        }
        browserLog("new BinaryTable", table_ref);
        let buffer: Uint8Array = res.data;
        const host = newObject($BinaryTable$prototype);
        host.internalProperties.class = "BinaryTable";
        host.internalProperties.value = NaN;
        const bt = new BT.BinaryTable(buffer, structure, getTextDecoder(resources.profile));
        host.internalProperties.hostObjectValue = bt;
        host.properties.set("nrow", {
            ...desc,
            value: bt.nrow,
        });
        host.properties.set("ncolumn", {
            ...desc,
            value: bt.ncolumn,
        });
        return host;
    };
    const $BinaryTable = newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BinaryTable(ctx, _self, args, caller) {
        return yield* BinaryTable$construct(ctx, args, caller);
    }, 2, "BinaryTable");
    const $BinaryTable$prototype = newObject(context.realm.intrinsics.ObjectPrototype);
    $BinaryTable$prototype.internalProperties.class = "BinaryTable";
    $BinaryTable$prototype.internalProperties.value = NaN;
    const dummyTable = new BT.BinaryTable(new Uint8Array([0]), "0,I:1B", getTextDecoder(resources.profile));
    dummyTable.fields.length = 0;
    dummyTable.rows.length = 0;
    $BinaryTable$prototype.internalProperties.hostObjectValue = dummyTable;
    $BinaryTable.internalProperties.construct = BinaryTable$construct;
    $BinaryTable.properties.set("prototype", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: $BinaryTable$prototype,
    });
    $BinaryTable$prototype.properties.set("nrow", {
        ...desc,
        value: 0,
    });
    $BinaryTable$prototype.properties.set("ncolumn", {
        ...desc,
        value: 0,
    });
    $BinaryTable$prototype.properties.set("constructor", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: $BinaryTable,
    });
    $BinaryTable$prototype.properties.set("close", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BinaryTable$prototype$close(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BT.BinaryTable)) {
                throw new InterpreterTypeError(`BinaryTable.prototype.close: Invalid call`, ctx, caller);
            }
            return self.internalProperties.hostObjectValue.close();
        }, 0, "close"),
    });
    $BinaryTable$prototype.properties.set("toNumber", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BinaryTable$prototype$toNumber(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BT.BinaryTable)) {
                throw new InterpreterTypeError(`BinaryTable.prototype.toNumber: Invalid call`, ctx, caller);
            }
            return self.internalProperties.hostObjectValue.toNumber(yield* toNumber(ctx, args[0], caller), yield* toNumber(ctx, args[1], caller));
        }, 2, "toNumber"),
    });
    $BinaryTable$prototype.properties.set("toString", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BinaryTable$prototype$toString(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BT.BinaryTable)) {
                throw new InterpreterTypeError(`BinaryTable.prototype.toString: Invalid call`, ctx, caller);
            }
            if (args.length < 2) {
                // 普通のtoStringと被ってるので…
                return "[object hostobject]";
            }
            return self.internalProperties.hostObjectValue.toString(yield* toNumber(ctx, args[0], caller), yield* toNumber(ctx, args[1], caller)) ?? null;
        }, 2, "toString"),
    });
    $BinaryTable$prototype.properties.set("toArray", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BinaryTable$prototype$toArray(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BT.BinaryTable)) {
                throw new InterpreterTypeError(`BinaryTable.prototype.toArray: Invalid call`, ctx, caller);
            }
            return wrapArray(ctx, self.internalProperties.hostObjectValue.toArray(yield* toNumber(ctx, args[0], caller), yield* toNumber(ctx, args[1], caller)));
        }, 2, "toArray"),
    });
    $BinaryTable$prototype.properties.set("search", {
        readOnly: false,
        dontEnum: true,
        dontDelete: false,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BinaryTable$prototype$search(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BT.BinaryTable)) {
                throw new InterpreterTypeError(`BinaryTable.prototype.search: Invalid call`, ctx, caller);
            }
            if (args.length < 7) {
                return NaN;
            }
            const bt = self?.internalProperties.hostObjectValue;
            const startRow = yield* toNumber(ctx, args[0], caller);
            const list: [number, any, number][] = [];
            for (let i = 1; i < args.length - 3; i += 3) {
                const searchedColumn = yield* toNumber(ctx, args[i], caller);
                const columnType = bt.fields[searchedColumn]?.type;
                if (columnType == null) {
                    return NaN;
                }
                let compared: number | string | boolean;
                switch (columnType) {
                    case BT.BinaryTableType.Boolean:
                        compared = toBoolean(args[i + 1]);
                        break;
                    case BT.BinaryTableType.UnsignedInteger:
                    case BT.BinaryTableType.Integer:
                    case BT.BinaryTableType.ZipCode:
                        compared = yield* toNumber(ctx, args[i + 1], caller);
                        break;
                    case BT.BinaryTableType.String:
                        compared = yield* toString(ctx, args[i + 1], caller);
                        break;
                    case BT.BinaryTableType.Pad:
                    default:
                        return NaN;
                }
                const operator = yield* toNumber(ctx, args[i + 2], caller);
                list.push([searchedColumn, compared, operator]);
            }
            const logic = toBoolean(args[args.length - 3]);
            const limitCount = yield* toNumber(ctx, args[args.length - 2], caller);
            const resultArray = args[args.length - 1];
            if (!isObject(resultArray)) {
                return NaN;
            }
            const result: any[][] = [];
            const r = bt.search(startRow, ...list.flatMap(x => x), logic, limitCount, result);
            for (let i = 0; i < result.length; i++) {
                yield* putProperty(ctx, resultArray, String(i), wrapArray(ctx, result[i]), caller);
            }
            yield* putProperty(ctx, resultArray, "length", result.length, caller);
            return r;
        }, 2, "search"),
    });
    context.realm.globalObject.properties.set("BinaryTable", {
        readOnly: false,
        dontEnum: false,
        dontDelete: false,
        value: $BinaryTable,
    });
}
