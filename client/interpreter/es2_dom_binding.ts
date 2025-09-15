// THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.
import { Caller, Context, InterpreterObject, InterpreterTypeError, isPrimitive, newNativeFunction, newObject, toBoolean, toNumber, toString, Value } from "../../es2";
import { BML } from "../interface/DOM";

export function define(context: Context, prototypes: Map<any, InterpreterObject>, map: WeakMap<any, InterpreterObject>) {
    const $Node$prototype = newObject(context.realm.intrinsics.ObjectPrototype);
    prototypes.set(BML.Node.prototype, $Node$prototype);
    $Node$prototype.internalProperties.class = "Node";
    $Node$prototype.internalProperties.get = function* $Node$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.Node)) {
            throw new InterpreterTypeError(`Node.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "parentNode":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.parentNode);
            case "firstChild":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.firstChild);
            case "lastChild":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.lastChild);
            case "previousSibling":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.previousSibling);
            case "nextSibling":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.nextSibling);
        }
        return $Node$prototype.properties.get(propertyName)?.value;
    };
    function* $Node$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.Node)) {
            throw new InterpreterTypeError(`Node.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "parentNode":
                return; // readonly
            case "firstChild":
                return; // readonly
            case "lastChild":
                return; // readonly
            case "previousSibling":
                return; // readonly
            case "nextSibling":
                return; // readonly
        }
        throw new InterpreterTypeError(`Node.prototype.${propertyName}: Unknown property`, ctx, caller);
    };
    $Node$prototype.internalProperties.put = $Node$put;
    $Node$prototype.properties.set("parentNode", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $Node$prototype.properties.set("firstChild", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $Node$prototype.properties.set("lastChild", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $Node$prototype.properties.set("previousSibling", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $Node$prototype.properties.set("nextSibling", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $Document$prototype = newObject($Node$prototype);
    prototypes.set(BML.Document.prototype, $Document$prototype);
    $Document$prototype.internalProperties.class = "Document";
    $Document$prototype.internalProperties.get = function* $Document$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.Document)) {
            throw new InterpreterTypeError(`Document.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "implementation":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.implementation);
            case "documentElement":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.documentElement);
        }
        return $Document$prototype.properties.get(propertyName)?.value;
    };
    function* $Document$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.Document)) {
            throw new InterpreterTypeError(`Document.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "implementation":
                return; // readonly
            case "documentElement":
                return; // readonly
        }
        yield* $Node$put(ctx, self, propertyName, value, caller);
        return;
    };
    $Document$prototype.internalProperties.put = $Document$put;
    $Document$prototype.properties.set("implementation", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $Document$prototype.properties.set("documentElement", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLDocument$prototype = newObject($Document$prototype);
    prototypes.set(BML.HTMLDocument.prototype, $HTMLDocument$prototype);
    $HTMLDocument$prototype.internalProperties.class = "HTMLDocument";
    $HTMLDocument$prototype.internalProperties.get = function* $HTMLDocument$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLDocument)) {
            throw new InterpreterTypeError(`HTMLDocument.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLDocument$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLDocument$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLDocument)) {
            throw new InterpreterTypeError(`HTMLDocument.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $Document$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLDocument$prototype.internalProperties.put = $HTMLDocument$put;
    $HTMLDocument$prototype.properties.set("getElementById", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $HTMLDocument$prototype$getElementById(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLDocument)) {
                throw new InterpreterTypeError("HTMLDocument.prototype.getElementById: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.getElementById(yield* toString(ctx, args[0], caller)));
        }, 1, "getElementById"),
    });
    const $BMLDocument$prototype = newObject($HTMLDocument$prototype);
    prototypes.set(BML.BMLDocument.prototype, $BMLDocument$prototype);
    $BMLDocument$prototype.internalProperties.class = "BMLDocument";
    $BMLDocument$prototype.internalProperties.get = function* $BMLDocument$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLDocument)) {
            throw new InterpreterTypeError(`BMLDocument.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "currentEvent":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.currentEvent);
            case "currentFocus":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.currentFocus);
        }
        return $BMLDocument$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLDocument$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLDocument)) {
            throw new InterpreterTypeError(`BMLDocument.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "currentEvent":
                return; // readonly
            case "currentFocus":
                return; // readonly
        }
        yield* $HTMLDocument$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLDocument$prototype.internalProperties.put = $BMLDocument$put;
    $BMLDocument$prototype.properties.set("currentEvent", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLDocument$prototype.properties.set("currentFocus", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $Element$prototype = newObject($Node$prototype);
    prototypes.set(BML.Element.prototype, $Element$prototype);
    $Element$prototype.internalProperties.class = "Element";
    $Element$prototype.internalProperties.get = function* $Element$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.Element)) {
            throw new InterpreterTypeError(`Element.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "tagName":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.tagName);
        }
        return $Element$prototype.properties.get(propertyName)?.value;
    };
    function* $Element$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.Element)) {
            throw new InterpreterTypeError(`Element.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "tagName":
                return; // readonly
        }
        yield* $Node$put(ctx, self, propertyName, value, caller);
        return;
    };
    $Element$prototype.internalProperties.put = $Element$put;
    $Element$prototype.properties.set("tagName", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLElement$prototype = newObject($Element$prototype);
    prototypes.set(BML.HTMLElement.prototype, $HTMLElement$prototype);
    $HTMLElement$prototype.internalProperties.class = "HTMLElement";
    $HTMLElement$prototype.internalProperties.get = function* $HTMLElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLElement)) {
            throw new InterpreterTypeError(`HTMLElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "id":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.id);
            case "className":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.className);
        }
        return $HTMLElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLElement)) {
            throw new InterpreterTypeError(`HTMLElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "id":
                return; // readonly
            case "className":
                return; // readonly
        }
        yield* $Element$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLElement$prototype.internalProperties.put = $HTMLElement$put;
    $HTMLElement$prototype.properties.set("id", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLElement$prototype.properties.set("className", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLDivElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLDivElement.prototype, $HTMLDivElement$prototype);
    $HTMLDivElement$prototype.internalProperties.class = "HTMLDivElement";
    $HTMLDivElement$prototype.internalProperties.get = function* $HTMLDivElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLDivElement)) {
            throw new InterpreterTypeError(`HTMLDivElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLDivElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLDivElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLDivElement)) {
            throw new InterpreterTypeError(`HTMLDivElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLDivElement$prototype.internalProperties.put = $HTMLDivElement$put;
    const $BMLDivElement$prototype = newObject($HTMLDivElement$prototype);
    prototypes.set(BML.BMLDivElement.prototype, $BMLDivElement$prototype);
    $BMLDivElement$prototype.internalProperties.class = "BMLDivElement";
    $BMLDivElement$prototype.internalProperties.get = function* $BMLDivElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLDivElement)) {
            throw new InterpreterTypeError(`BMLDivElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "accessKey":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.accessKey);
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
            case "focusStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.focusStyle);
            case "activeStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.activeStyle);
        }
        return $BMLDivElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLDivElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLDivElement)) {
            throw new InterpreterTypeError(`BMLDivElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "accessKey":
                return; // readonly
            case "normalStyle":
                return; // readonly
            case "focusStyle":
                return; // readonly
            case "activeStyle":
                return; // readonly
        }
        yield* $HTMLDivElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLDivElement$prototype.internalProperties.put = $BMLDivElement$put;
    $BMLDivElement$prototype.properties.set("accessKey", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLDivElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLDivElement$prototype.properties.set("focusStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLDivElement$prototype.properties.set("activeStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLDivElement$prototype.properties.set("focus", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLDivElement$prototype$focus(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLDivElement)) {
                throw new InterpreterTypeError("BMLDivElement.prototype.focus: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.focus() as undefined);
        }, 0, "focus"),
    });
    $BMLDivElement$prototype.properties.set("blur", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLDivElement$prototype$blur(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLDivElement)) {
                throw new InterpreterTypeError("BMLDivElement.prototype.blur: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.blur() as undefined);
        }, 0, "blur"),
    });
    const $BMLSpanElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.BMLSpanElement.prototype, $BMLSpanElement$prototype);
    $BMLSpanElement$prototype.internalProperties.class = "BMLSpanElement";
    $BMLSpanElement$prototype.internalProperties.get = function* $BMLSpanElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLSpanElement)) {
            throw new InterpreterTypeError(`BMLSpanElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "accessKey":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.accessKey);
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
            case "focusStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.focusStyle);
            case "activeStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.activeStyle);
        }
        return $BMLSpanElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLSpanElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLSpanElement)) {
            throw new InterpreterTypeError(`BMLSpanElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "accessKey":
                return; // readonly
            case "normalStyle":
                return; // readonly
            case "focusStyle":
                return; // readonly
            case "activeStyle":
                return; // readonly
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLSpanElement$prototype.internalProperties.put = $BMLSpanElement$put;
    $BMLSpanElement$prototype.properties.set("accessKey", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLSpanElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLSpanElement$prototype.properties.set("focusStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLSpanElement$prototype.properties.set("activeStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLSpanElement$prototype.properties.set("focus", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLSpanElement$prototype$focus(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLSpanElement)) {
                throw new InterpreterTypeError("BMLSpanElement.prototype.focus: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.focus() as undefined);
        }, 0, "focus"),
    });
    $BMLSpanElement$prototype.properties.set("blur", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLSpanElement$prototype$blur(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLSpanElement)) {
                throw new InterpreterTypeError("BMLSpanElement.prototype.blur: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.blur() as undefined);
        }, 0, "blur"),
    });
    const $HTMLParagraphElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLParagraphElement.prototype, $HTMLParagraphElement$prototype);
    $HTMLParagraphElement$prototype.internalProperties.class = "HTMLParagraphElement";
    $HTMLParagraphElement$prototype.internalProperties.get = function* $HTMLParagraphElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLParagraphElement)) {
            throw new InterpreterTypeError(`HTMLParagraphElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLParagraphElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLParagraphElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLParagraphElement)) {
            throw new InterpreterTypeError(`HTMLParagraphElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLParagraphElement$prototype.internalProperties.put = $HTMLParagraphElement$put;
    const $BMLParagraphElement$prototype = newObject($HTMLParagraphElement$prototype);
    prototypes.set(BML.BMLParagraphElement.prototype, $BMLParagraphElement$prototype);
    $BMLParagraphElement$prototype.internalProperties.class = "BMLParagraphElement";
    $BMLParagraphElement$prototype.internalProperties.get = function* $BMLParagraphElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLParagraphElement)) {
            throw new InterpreterTypeError(`BMLParagraphElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "accessKey":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.accessKey);
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
            case "focusStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.focusStyle);
            case "activeStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.activeStyle);
        }
        return $BMLParagraphElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLParagraphElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLParagraphElement)) {
            throw new InterpreterTypeError(`BMLParagraphElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "accessKey":
                return; // readonly
            case "normalStyle":
                return; // readonly
            case "focusStyle":
                return; // readonly
            case "activeStyle":
                return; // readonly
        }
        yield* $HTMLParagraphElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLParagraphElement$prototype.internalProperties.put = $BMLParagraphElement$put;
    $BMLParagraphElement$prototype.properties.set("accessKey", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLParagraphElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLParagraphElement$prototype.properties.set("focusStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLParagraphElement$prototype.properties.set("activeStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLParagraphElement$prototype.properties.set("focus", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLParagraphElement$prototype$focus(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLParagraphElement)) {
                throw new InterpreterTypeError("BMLParagraphElement.prototype.focus: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.focus() as undefined);
        }, 0, "focus"),
    });
    $BMLParagraphElement$prototype.properties.set("blur", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLParagraphElement$prototype$blur(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLParagraphElement)) {
                throw new InterpreterTypeError("BMLParagraphElement.prototype.blur: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.blur() as undefined);
        }, 0, "blur"),
    });
    const $HTMLBRElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLBRElement.prototype, $HTMLBRElement$prototype);
    $HTMLBRElement$prototype.internalProperties.class = "HTMLBRElement";
    $HTMLBRElement$prototype.internalProperties.get = function* $HTMLBRElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLBRElement)) {
            throw new InterpreterTypeError(`HTMLBRElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLBRElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLBRElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLBRElement)) {
            throw new InterpreterTypeError(`HTMLBRElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLBRElement$prototype.internalProperties.put = $HTMLBRElement$put;
    const $BMLBRElement$prototype = newObject($HTMLBRElement$prototype);
    prototypes.set(BML.BMLBRElement.prototype, $BMLBRElement$prototype);
    $BMLBRElement$prototype.internalProperties.class = "BMLBRElement";
    $BMLBRElement$prototype.internalProperties.get = function* $BMLBRElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBRElement)) {
            throw new InterpreterTypeError(`BMLBRElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
        }
        return $BMLBRElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLBRElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBRElement)) {
            throw new InterpreterTypeError(`BMLBRElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
        }
        yield* $HTMLBRElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLBRElement$prototype.internalProperties.put = $BMLBRElement$put;
    $BMLBRElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLAnchorElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLAnchorElement.prototype, $HTMLAnchorElement$prototype);
    $HTMLAnchorElement$prototype.internalProperties.class = "HTMLAnchorElement";
    $HTMLAnchorElement$prototype.internalProperties.get = function* $HTMLAnchorElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLAnchorElement)) {
            throw new InterpreterTypeError(`HTMLAnchorElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "accessKey":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.accessKey);
            case "href":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.href);
        }
        return $HTMLAnchorElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLAnchorElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLAnchorElement)) {
            throw new InterpreterTypeError(`HTMLAnchorElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "accessKey":
                return; // readonly
            case "href":
                self.internalProperties.hostObjectValue.href = yield* toString(ctx, value, caller);
                return;
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLAnchorElement$prototype.internalProperties.put = $HTMLAnchorElement$put;
    $HTMLAnchorElement$prototype.properties.set("accessKey", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLAnchorElement$prototype.properties.set("href", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLAnchorElement$prototype.properties.set("blur", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $HTMLAnchorElement$prototype$blur(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLAnchorElement)) {
                throw new InterpreterTypeError("HTMLAnchorElement.prototype.blur: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.blur() as undefined);
        }, 0, "blur"),
    });
    $HTMLAnchorElement$prototype.properties.set("focus", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $HTMLAnchorElement$prototype$focus(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLAnchorElement)) {
                throw new InterpreterTypeError("HTMLAnchorElement.prototype.focus: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.focus() as undefined);
        }, 0, "focus"),
    });
    const $BMLAnchorElement$prototype = newObject($HTMLAnchorElement$prototype);
    prototypes.set(BML.BMLAnchorElement.prototype, $BMLAnchorElement$prototype);
    $BMLAnchorElement$prototype.internalProperties.class = "BMLAnchorElement";
    $BMLAnchorElement$prototype.internalProperties.get = function* $BMLAnchorElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLAnchorElement)) {
            throw new InterpreterTypeError(`BMLAnchorElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
            case "focusStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.focusStyle);
            case "activeStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.activeStyle);
        }
        return $BMLAnchorElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLAnchorElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLAnchorElement)) {
            throw new InterpreterTypeError(`BMLAnchorElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
            case "focusStyle":
                return; // readonly
            case "activeStyle":
                return; // readonly
        }
        yield* $HTMLAnchorElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLAnchorElement$prototype.internalProperties.put = $BMLAnchorElement$put;
    $BMLAnchorElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLAnchorElement$prototype.properties.set("focusStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLAnchorElement$prototype.properties.set("activeStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLInputElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLInputElement.prototype, $HTMLInputElement$prototype);
    $HTMLInputElement$prototype.internalProperties.class = "HTMLInputElement";
    $HTMLInputElement$prototype.internalProperties.get = function* $HTMLInputElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLInputElement)) {
            throw new InterpreterTypeError(`HTMLInputElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "defaultValue":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.defaultValue);
            case "accessKey":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.accessKey);
            case "disabled":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.disabled);
            case "maxLength":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.maxLength);
            case "readOnly":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.readOnly);
            case "type":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.type);
            case "value":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.value);
        }
        return $HTMLInputElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLInputElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLInputElement)) {
            throw new InterpreterTypeError(`HTMLInputElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "defaultValue":
                return; // readonly
            case "accessKey":
                return; // readonly
            case "disabled":
                self.internalProperties.hostObjectValue.disabled = toBoolean(value);
                return;
            case "maxLength":
                return; // readonly
            case "readOnly":
                self.internalProperties.hostObjectValue.readOnly = toBoolean(value);
                return;
            case "type":
                return; // readonly
            case "value":
                self.internalProperties.hostObjectValue.value = yield* toString(ctx, value, caller);
                return;
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLInputElement$prototype.internalProperties.put = $HTMLInputElement$put;
    $HTMLInputElement$prototype.properties.set("defaultValue", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLInputElement$prototype.properties.set("accessKey", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLInputElement$prototype.properties.set("disabled", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLInputElement$prototype.properties.set("maxLength", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLInputElement$prototype.properties.set("readOnly", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLInputElement$prototype.properties.set("type", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLInputElement$prototype.properties.set("value", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLInputElement$prototype.properties.set("blur", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $HTMLInputElement$prototype$blur(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLInputElement)) {
                throw new InterpreterTypeError("HTMLInputElement.prototype.blur: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.blur() as undefined);
        }, 0, "blur"),
    });
    $HTMLInputElement$prototype.properties.set("focus", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $HTMLInputElement$prototype$focus(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLInputElement)) {
                throw new InterpreterTypeError("HTMLInputElement.prototype.focus: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.focus() as undefined);
        }, 0, "focus"),
    });
    const $BMLInputElement$prototype = newObject($HTMLInputElement$prototype);
    prototypes.set(BML.BMLInputElement.prototype, $BMLInputElement$prototype);
    $BMLInputElement$prototype.internalProperties.class = "BMLInputElement";
    $BMLInputElement$prototype.internalProperties.get = function* $BMLInputElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLInputElement)) {
            throw new InterpreterTypeError(`BMLInputElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
            case "focusStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.focusStyle);
            case "activeStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.activeStyle);
        }
        return $BMLInputElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLInputElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLInputElement)) {
            throw new InterpreterTypeError(`BMLInputElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
            case "focusStyle":
                return; // readonly
            case "activeStyle":
                return; // readonly
        }
        yield* $HTMLInputElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLInputElement$prototype.internalProperties.put = $BMLInputElement$put;
    $BMLInputElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLInputElement$prototype.properties.set("focusStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLInputElement$prototype.properties.set("activeStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLObjectElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLObjectElement.prototype, $HTMLObjectElement$prototype);
    $HTMLObjectElement$prototype.internalProperties.class = "HTMLObjectElement";
    $HTMLObjectElement$prototype.internalProperties.get = function* $HTMLObjectElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLObjectElement)) {
            throw new InterpreterTypeError(`HTMLObjectElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "data":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.data);
            case "type":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.type);
        }
        return $HTMLObjectElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLObjectElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLObjectElement)) {
            throw new InterpreterTypeError(`HTMLObjectElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "data":
                self.internalProperties.hostObjectValue.data = yield* toString(ctx, value, caller);
                return;
            case "type":
                return; // readonly
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLObjectElement$prototype.internalProperties.put = $HTMLObjectElement$put;
    $HTMLObjectElement$prototype.properties.set("data", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLObjectElement$prototype.properties.set("type", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $BMLObjectElement$prototype = newObject($HTMLObjectElement$prototype);
    prototypes.set(BML.BMLObjectElement.prototype, $BMLObjectElement$prototype);
    $BMLObjectElement$prototype.internalProperties.class = "BMLObjectElement";
    $BMLObjectElement$prototype.internalProperties.get = function* $BMLObjectElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLObjectElement)) {
            throw new InterpreterTypeError(`BMLObjectElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
            case "focusStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.focusStyle);
            case "activeStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.activeStyle);
            case "remain":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.remain);
            case "streamPosition":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.streamPosition);
            case "streamStatus":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.streamStatus);
            case "accessKey":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.accessKey);
        }
        return $BMLObjectElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLObjectElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLObjectElement)) {
            throw new InterpreterTypeError(`BMLObjectElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
            case "focusStyle":
                return; // readonly
            case "activeStyle":
                return; // readonly
            case "remain":
                self.internalProperties.hostObjectValue.remain = toBoolean(value);
                return;
            case "streamPosition":
                self.internalProperties.hostObjectValue.streamPosition = yield* toNumber(ctx, value, caller);
                return;
            case "streamStatus":
                self.internalProperties.hostObjectValue.streamStatus = yield* toString(ctx, value, caller);
                return;
            case "accessKey":
                return; // readonly
        }
        yield* $HTMLObjectElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLObjectElement$prototype.internalProperties.put = $BMLObjectElement$put;
    $BMLObjectElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLObjectElement$prototype.properties.set("focusStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLObjectElement$prototype.properties.set("activeStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLObjectElement$prototype.properties.set("remain", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLObjectElement$prototype.properties.set("streamPosition", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLObjectElement$prototype.properties.set("streamStatus", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLObjectElement$prototype.properties.set("setMainAudioStream", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLObjectElement$prototype$setMainAudioStream(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLObjectElement)) {
                throw new InterpreterTypeError("BMLObjectElement.prototype.setMainAudioStream: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.setMainAudioStream(yield* toString(ctx, args[0], caller)));
        }, 1, "setMainAudioStream"),
    });
    $BMLObjectElement$prototype.properties.set("getMainAudioStream", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLObjectElement$prototype$getMainAudioStream(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLObjectElement)) {
                throw new InterpreterTypeError("BMLObjectElement.prototype.getMainAudioStream: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.getMainAudioStream());
        }, 0, "getMainAudioStream"),
    });
    $BMLObjectElement$prototype.properties.set("accessKey", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLObjectElement$prototype.properties.set("focus", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLObjectElement$prototype$focus(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLObjectElement)) {
                throw new InterpreterTypeError("BMLObjectElement.prototype.focus: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.focus() as undefined);
        }, 0, "focus"),
    });
    $BMLObjectElement$prototype.properties.set("blur", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $BMLObjectElement$prototype$blur(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLObjectElement)) {
                throw new InterpreterTypeError("BMLObjectElement.prototype.blur: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.blur() as undefined);
        }, 0, "blur"),
    });
    const $HTMLBodyElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLBodyElement.prototype, $HTMLBodyElement$prototype);
    $HTMLBodyElement$prototype.internalProperties.class = "HTMLBodyElement";
    $HTMLBodyElement$prototype.internalProperties.get = function* $HTMLBodyElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLBodyElement)) {
            throw new InterpreterTypeError(`HTMLBodyElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLBodyElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLBodyElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLBodyElement)) {
            throw new InterpreterTypeError(`HTMLBodyElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLBodyElement$prototype.internalProperties.put = $HTMLBodyElement$put;
    const $BMLBodyElement$prototype = newObject($HTMLBodyElement$prototype);
    prototypes.set(BML.BMLBodyElement.prototype, $BMLBodyElement$prototype);
    $BMLBodyElement$prototype.internalProperties.class = "BMLBodyElement";
    $BMLBodyElement$prototype.internalProperties.get = function* $BMLBodyElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBodyElement)) {
            throw new InterpreterTypeError(`BMLBodyElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
            case "invisible":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.invisible);
        }
        return $BMLBodyElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLBodyElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBodyElement)) {
            throw new InterpreterTypeError(`BMLBodyElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
            case "invisible":
                self.internalProperties.hostObjectValue.invisible = toBoolean(value);
                return;
        }
        yield* $HTMLBodyElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLBodyElement$prototype.internalProperties.put = $BMLBodyElement$put;
    $BMLBodyElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBodyElement$prototype.properties.set("invisible", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLHtmlElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLHtmlElement.prototype, $HTMLHtmlElement$prototype);
    $HTMLHtmlElement$prototype.internalProperties.class = "HTMLHtmlElement";
    $HTMLHtmlElement$prototype.internalProperties.get = function* $HTMLHtmlElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLHtmlElement)) {
            throw new InterpreterTypeError(`HTMLHtmlElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLHtmlElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLHtmlElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLHtmlElement)) {
            throw new InterpreterTypeError(`HTMLHtmlElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLHtmlElement$prototype.internalProperties.put = $HTMLHtmlElement$put;
    const $BMLBmlElement$prototype = newObject($HTMLHtmlElement$prototype);
    prototypes.set(BML.BMLBmlElement.prototype, $BMLBmlElement$prototype);
    $BMLBmlElement$prototype.internalProperties.class = "BMLBmlElement";
    $BMLBmlElement$prototype.internalProperties.get = function* $BMLBmlElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBmlElement)) {
            throw new InterpreterTypeError(`BMLBmlElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $BMLBmlElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLBmlElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBmlElement)) {
            throw new InterpreterTypeError(`BMLBmlElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLHtmlElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLBmlElement$prototype.internalProperties.put = $BMLBmlElement$put;
    const $BMLBeventElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.BMLBeventElement.prototype, $BMLBeventElement$prototype);
    $BMLBeventElement$prototype.internalProperties.class = "BMLBeventElement";
    $BMLBeventElement$prototype.internalProperties.get = function* $BMLBeventElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBeventElement)) {
            throw new InterpreterTypeError(`BMLBeventElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $BMLBeventElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLBeventElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBeventElement)) {
            throw new InterpreterTypeError(`BMLBeventElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLBeventElement$prototype.internalProperties.put = $BMLBeventElement$put;
    const $BMLBeitemElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.BMLBeitemElement.prototype, $BMLBeitemElement$prototype);
    $BMLBeitemElement$prototype.internalProperties.class = "BMLBeitemElement";
    $BMLBeitemElement$prototype.internalProperties.get = function* $BMLBeitemElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBeitemElement)) {
            throw new InterpreterTypeError(`BMLBeitemElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "type":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.type);
            case "esRef":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.esRef);
            case "messageId":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.messageId);
            case "messageVersion":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.messageVersion);
            case "messageGroupId":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.messageGroupId);
            case "moduleRef":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.moduleRef);
            case "languageTag":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.languageTag);
            case "timeMode":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.timeMode);
            case "timeValue":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.timeValue);
            case "objectId":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.objectId);
            case "segmentId":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.segmentId);
            case "subscribe":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.subscribe);
        }
        return $BMLBeitemElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLBeitemElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBeitemElement)) {
            throw new InterpreterTypeError(`BMLBeitemElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "type":
                return; // readonly
            case "esRef":
                self.internalProperties.hostObjectValue.esRef = yield* toString(ctx, value, caller);
                return;
            case "messageId":
                self.internalProperties.hostObjectValue.messageId = yield* toNumber(ctx, value, caller);
                return;
            case "messageVersion":
                self.internalProperties.hostObjectValue.messageVersion = yield* toNumber(ctx, value, caller);
                return;
            case "messageGroupId":
                return; // readonly
            case "moduleRef":
                self.internalProperties.hostObjectValue.moduleRef = yield* toString(ctx, value, caller);
                return;
            case "languageTag":
                self.internalProperties.hostObjectValue.languageTag = yield* toNumber(ctx, value, caller);
                return;
            case "timeMode":
                return; // readonly
            case "timeValue":
                self.internalProperties.hostObjectValue.timeValue = yield* toString(ctx, value, caller);
                return;
            case "objectId":
                self.internalProperties.hostObjectValue.objectId = yield* toString(ctx, value, caller);
                return;
            case "segmentId":
                self.internalProperties.hostObjectValue.segmentId = yield* toString(ctx, value, caller);
                return;
            case "subscribe":
                self.internalProperties.hostObjectValue.subscribe = toBoolean(value);
                return;
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLBeitemElement$prototype.internalProperties.put = $BMLBeitemElement$put;
    $BMLBeitemElement$prototype.properties.set("type", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("esRef", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("messageId", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("messageVersion", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("messageGroupId", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("moduleRef", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("languageTag", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("timeMode", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("timeValue", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("objectId", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("segmentId", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeitemElement$prototype.properties.set("subscribe", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $BMLEvent$prototype = newObject(context.realm.intrinsics.ObjectPrototype);
    prototypes.set(BML.BMLEvent.prototype, $BMLEvent$prototype);
    $BMLEvent$prototype.internalProperties.class = "BMLEvent";
    $BMLEvent$prototype.internalProperties.get = function* $BMLEvent$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLEvent)) {
            throw new InterpreterTypeError(`BMLEvent.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "type":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.type);
            case "target":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.target);
        }
        return $BMLEvent$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLEvent$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLEvent)) {
            throw new InterpreterTypeError(`BMLEvent.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "type":
                return; // readonly
            case "target":
                return; // readonly
        }
        throw new InterpreterTypeError(`BMLEvent.prototype.${propertyName}: Unknown property`, ctx, caller);
    };
    $BMLEvent$prototype.internalProperties.put = $BMLEvent$put;
    $BMLEvent$prototype.properties.set("type", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLEvent$prototype.properties.set("target", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $BMLIntrinsicEvent$prototype = newObject($BMLEvent$prototype);
    prototypes.set(BML.BMLIntrinsicEvent.prototype, $BMLIntrinsicEvent$prototype);
    $BMLIntrinsicEvent$prototype.internalProperties.class = "BMLIntrinsicEvent";
    $BMLIntrinsicEvent$prototype.internalProperties.get = function* $BMLIntrinsicEvent$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLIntrinsicEvent)) {
            throw new InterpreterTypeError(`BMLIntrinsicEvent.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "keyCode":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.keyCode);
        }
        return $BMLIntrinsicEvent$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLIntrinsicEvent$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLIntrinsicEvent)) {
            throw new InterpreterTypeError(`BMLIntrinsicEvent.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "keyCode":
                return; // readonly
        }
        yield* $BMLEvent$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLIntrinsicEvent$prototype.internalProperties.put = $BMLIntrinsicEvent$put;
    $BMLIntrinsicEvent$prototype.properties.set("keyCode", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $BMLBeventEvent$prototype = newObject($BMLEvent$prototype);
    prototypes.set(BML.BMLBeventEvent.prototype, $BMLBeventEvent$prototype);
    $BMLBeventEvent$prototype.internalProperties.class = "BMLBeventEvent";
    $BMLBeventEvent$prototype.internalProperties.get = function* $BMLBeventEvent$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBeventEvent)) {
            throw new InterpreterTypeError(`BMLBeventEvent.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "status":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.status);
            case "privateData":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.privateData);
            case "esRef":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.esRef);
            case "messageId":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.messageId);
            case "messageVersion":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.messageVersion);
            case "messageGroupId":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.messageGroupId);
            case "moduleRef":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.moduleRef);
            case "languageTag":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.languageTag);
            case "object":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.object);
        }
        return $BMLBeventEvent$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLBeventEvent$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLBeventEvent)) {
            throw new InterpreterTypeError(`BMLBeventEvent.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "status":
                return; // readonly
            case "privateData":
                return; // readonly
            case "esRef":
                return; // readonly
            case "messageId":
                return; // readonly
            case "messageVersion":
                return; // readonly
            case "messageGroupId":
                return; // readonly
            case "moduleRef":
                return; // readonly
            case "languageTag":
                return; // readonly
            case "object":
                return; // readonly
        }
        yield* $BMLEvent$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLBeventEvent$prototype.internalProperties.put = $BMLBeventEvent$put;
    $BMLBeventEvent$prototype.properties.set("status", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeventEvent$prototype.properties.set("privateData", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeventEvent$prototype.properties.set("esRef", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeventEvent$prototype.properties.set("messageId", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeventEvent$prototype.properties.set("messageVersion", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeventEvent$prototype.properties.set("messageGroupId", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeventEvent$prototype.properties.set("moduleRef", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeventEvent$prototype.properties.set("languageTag", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLBeventEvent$prototype.properties.set("object", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $BMLCSS2Properties$prototype = newObject(context.realm.intrinsics.ObjectPrototype);
    prototypes.set(BML.BMLCSS2Properties.prototype, $BMLCSS2Properties$prototype);
    $BMLCSS2Properties$prototype.internalProperties.class = "BMLCSS2Properties";
    $BMLCSS2Properties$prototype.internalProperties.get = function* $BMLCSS2Properties$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLCSS2Properties)) {
            throw new InterpreterTypeError(`BMLCSS2Properties.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "paddingTop":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.paddingTop);
            case "paddingRight":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.paddingRight);
            case "paddingBottom":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.paddingBottom);
            case "paddingLeft":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.paddingLeft);
            case "borderWidth":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderWidth);
            case "borderStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderStyle);
            case "left":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.left);
            case "top":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.top);
            case "width":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.width);
            case "height":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.height);
            case "lineHeight":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.lineHeight);
            case "visibility":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.visibility);
            case "fontFamily":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.fontFamily);
            case "fontSize":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.fontSize);
            case "fontWeight":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.fontWeight);
            case "textAlign":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.textAlign);
            case "letterSpacing":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.letterSpacing);
            case "clut":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.clut);
            case "colorIndex":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.colorIndex);
            case "backgroundColorIndex":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.backgroundColorIndex);
            case "borderTopColorIndex":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderTopColorIndex);
            case "borderRightColorIndex":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderRightColorIndex);
            case "borderBottomColorIndex":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderBottomColorIndex);
            case "borderLeftColorIndex":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderLeftColorIndex);
            case "resolution":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.resolution);
            case "displayAspectRatio":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.displayAspectRatio);
            case "grayscaleColorIndex":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.grayscaleColorIndex);
            case "navIndex":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.navIndex);
            case "navUp":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.navUp);
            case "navDown":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.navDown);
            case "navLeft":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.navLeft);
            case "navRight":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.navRight);
            case "usedKeyList":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.usedKeyList);
            case "borderTopColor":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderTopColor);
            case "borderRightColor":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderRightColor);
            case "borderBottomColor":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderBottomColor);
            case "borderLeftColor":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.borderLeftColor);
            case "backgroundColor":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.backgroundColor);
            case "color":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.color);
            case "WapMarqueeStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.WapMarqueeStyle);
            case "WapMarqueeLoop":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.WapMarqueeLoop);
            case "WapMarqueeSpeed":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.WapMarqueeSpeed);
            case "WapInputFormat":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.WapInputFormat);
        }
        return $BMLCSS2Properties$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLCSS2Properties$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLCSS2Properties)) {
            throw new InterpreterTypeError(`BMLCSS2Properties.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "paddingTop":
                return; // readonly
            case "paddingRight":
                return; // readonly
            case "paddingBottom":
                return; // readonly
            case "paddingLeft":
                return; // readonly
            case "borderWidth":
                return; // readonly
            case "borderStyle":
                return; // readonly
            case "left":
                self.internalProperties.hostObjectValue.left = yield* toString(ctx, value, caller);
                return;
            case "top":
                self.internalProperties.hostObjectValue.top = yield* toString(ctx, value, caller);
                return;
            case "width":
                self.internalProperties.hostObjectValue.width = yield* toString(ctx, value, caller);
                return;
            case "height":
                self.internalProperties.hostObjectValue.height = yield* toString(ctx, value, caller);
                return;
            case "lineHeight":
                return; // readonly
            case "visibility":
                self.internalProperties.hostObjectValue.visibility = yield* toString(ctx, value, caller);
                return;
            case "fontFamily":
                self.internalProperties.hostObjectValue.fontFamily = yield* toString(ctx, value, caller);
                return;
            case "fontSize":
                self.internalProperties.hostObjectValue.fontSize = yield* toString(ctx, value, caller);
                return;
            case "fontWeight":
                self.internalProperties.hostObjectValue.fontWeight = yield* toString(ctx, value, caller);
                return;
            case "textAlign":
                return; // readonly
            case "letterSpacing":
                return; // readonly
            case "clut":
                return; // readonly
            case "colorIndex":
                self.internalProperties.hostObjectValue.colorIndex = yield* toString(ctx, value, caller);
                return;
            case "backgroundColorIndex":
                self.internalProperties.hostObjectValue.backgroundColorIndex = yield* toString(ctx, value, caller);
                return;
            case "borderTopColorIndex":
                self.internalProperties.hostObjectValue.borderTopColorIndex = yield* toString(ctx, value, caller);
                return;
            case "borderRightColorIndex":
                self.internalProperties.hostObjectValue.borderRightColorIndex = yield* toString(ctx, value, caller);
                return;
            case "borderBottomColorIndex":
                self.internalProperties.hostObjectValue.borderBottomColorIndex = yield* toString(ctx, value, caller);
                return;
            case "borderLeftColorIndex":
                self.internalProperties.hostObjectValue.borderLeftColorIndex = yield* toString(ctx, value, caller);
                return;
            case "resolution":
                return; // readonly
            case "displayAspectRatio":
                return; // readonly
            case "grayscaleColorIndex":
                self.internalProperties.hostObjectValue.grayscaleColorIndex = yield* toString(ctx, value, caller);
                return;
            case "navIndex":
                return; // readonly
            case "navUp":
                return; // readonly
            case "navDown":
                return; // readonly
            case "navLeft":
                return; // readonly
            case "navRight":
                return; // readonly
            case "usedKeyList":
                self.internalProperties.hostObjectValue.usedKeyList = yield* toString(ctx, value, caller);
                return;
            case "borderTopColor":
                self.internalProperties.hostObjectValue.borderTopColor = yield* toString(ctx, value, caller);
                return;
            case "borderRightColor":
                self.internalProperties.hostObjectValue.borderRightColor = yield* toString(ctx, value, caller);
                return;
            case "borderBottomColor":
                self.internalProperties.hostObjectValue.borderBottomColor = yield* toString(ctx, value, caller);
                return;
            case "borderLeftColor":
                self.internalProperties.hostObjectValue.borderLeftColor = yield* toString(ctx, value, caller);
                return;
            case "backgroundColor":
                self.internalProperties.hostObjectValue.backgroundColor = yield* toString(ctx, value, caller);
                return;
            case "color":
                self.internalProperties.hostObjectValue.color = yield* toString(ctx, value, caller);
                return;
            case "WapMarqueeStyle":
                return; // readonly
            case "WapMarqueeLoop":
                return; // readonly
            case "WapMarqueeSpeed":
                return; // readonly
            case "WapInputFormat":
                return; // readonly
        }
        throw new InterpreterTypeError(`BMLCSS2Properties.prototype.${propertyName}: Unknown property`, ctx, caller);
    };
    $BMLCSS2Properties$prototype.internalProperties.put = $BMLCSS2Properties$put;
    $BMLCSS2Properties$prototype.properties.set("paddingTop", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("paddingRight", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("paddingBottom", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("paddingLeft", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderWidth", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("left", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("top", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("width", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("height", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("lineHeight", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("visibility", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("fontFamily", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("fontSize", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("fontWeight", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("textAlign", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("letterSpacing", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("clut", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("colorIndex", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("backgroundColorIndex", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderTopColorIndex", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderRightColorIndex", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderBottomColorIndex", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderLeftColorIndex", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("resolution", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("displayAspectRatio", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("grayscaleColorIndex", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("navIndex", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("navUp", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("navDown", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("navLeft", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("navRight", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("usedKeyList", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderTopColor", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderRightColor", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderBottomColor", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("borderLeftColor", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("backgroundColor", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("color", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("WapMarqueeStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("WapMarqueeLoop", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("WapMarqueeSpeed", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $BMLCSS2Properties$prototype.properties.set("WapInputFormat", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLPreElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLPreElement.prototype, $HTMLPreElement$prototype);
    $HTMLPreElement$prototype.internalProperties.class = "HTMLPreElement";
    $HTMLPreElement$prototype.internalProperties.get = function* $HTMLPreElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLPreElement)) {
            throw new InterpreterTypeError(`HTMLPreElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLPreElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLPreElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLPreElement)) {
            throw new InterpreterTypeError(`HTMLPreElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLPreElement$prototype.internalProperties.put = $HTMLPreElement$put;
    const $BMLPreElement$prototype = newObject($HTMLPreElement$prototype);
    prototypes.set(BML.BMLPreElement.prototype, $BMLPreElement$prototype);
    $BMLPreElement$prototype.internalProperties.class = "BMLPreElement";
    $BMLPreElement$prototype.internalProperties.get = function* $BMLPreElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLPreElement)) {
            throw new InterpreterTypeError(`BMLPreElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
        }
        return $BMLPreElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLPreElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLPreElement)) {
            throw new InterpreterTypeError(`BMLPreElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
        }
        yield* $HTMLPreElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLPreElement$prototype.internalProperties.put = $BMLPreElement$put;
    $BMLPreElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLFormElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLFormElement.prototype, $HTMLFormElement$prototype);
    $HTMLFormElement$prototype.internalProperties.class = "HTMLFormElement";
    $HTMLFormElement$prototype.internalProperties.get = function* $HTMLFormElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLFormElement)) {
            throw new InterpreterTypeError(`HTMLFormElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "action":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.action);
            case "method":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.method);
        }
        return $HTMLFormElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLFormElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLFormElement)) {
            throw new InterpreterTypeError(`HTMLFormElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "action":
                self.internalProperties.hostObjectValue.action = yield* toString(ctx, value, caller);
                return;
            case "method":
                return; // readonly
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLFormElement$prototype.internalProperties.put = $HTMLFormElement$put;
    $HTMLFormElement$prototype.properties.set("action", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLFormElement$prototype.properties.set("method", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLFormElement$prototype.properties.set("submit", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $HTMLFormElement$prototype$submit(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLFormElement)) {
                throw new InterpreterTypeError("HTMLFormElement.prototype.submit: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.submit() as undefined);
        }, 0, "submit"),
    });
    const $BMLFormElement$prototype = newObject($HTMLFormElement$prototype);
    prototypes.set(BML.BMLFormElement.prototype, $BMLFormElement$prototype);
    $BMLFormElement$prototype.internalProperties.class = "BMLFormElement";
    $BMLFormElement$prototype.internalProperties.get = function* $BMLFormElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLFormElement)) {
            throw new InterpreterTypeError(`BMLFormElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
        }
        return $BMLFormElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLFormElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLFormElement)) {
            throw new InterpreterTypeError(`BMLFormElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
        }
        yield* $HTMLFormElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLFormElement$prototype.internalProperties.put = $BMLFormElement$put;
    $BMLFormElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLTextAreaElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLTextAreaElement.prototype, $HTMLTextAreaElement$prototype);
    $HTMLTextAreaElement$prototype.internalProperties.class = "HTMLTextAreaElement";
    $HTMLTextAreaElement$prototype.internalProperties.get = function* $HTMLTextAreaElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLTextAreaElement)) {
            throw new InterpreterTypeError(`HTMLTextAreaElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "defaultValue":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.defaultValue);
            case "form":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.form);
            case "accessKey":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.accessKey);
            case "name":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.name);
            case "readOnly":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.readOnly);
            case "value":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.value);
        }
        return $HTMLTextAreaElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLTextAreaElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLTextAreaElement)) {
            throw new InterpreterTypeError(`HTMLTextAreaElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "defaultValue":
                return; // readonly
            case "form":
                return; // readonly
            case "accessKey":
                return; // readonly
            case "name":
                return; // readonly
            case "readOnly":
                self.internalProperties.hostObjectValue.readOnly = toBoolean(value);
                return;
            case "value":
                self.internalProperties.hostObjectValue.value = yield* toString(ctx, value, caller);
                return;
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLTextAreaElement$prototype.internalProperties.put = $HTMLTextAreaElement$put;
    $HTMLTextAreaElement$prototype.properties.set("defaultValue", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLTextAreaElement$prototype.properties.set("form", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLTextAreaElement$prototype.properties.set("accessKey", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLTextAreaElement$prototype.properties.set("name", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLTextAreaElement$prototype.properties.set("readOnly", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLTextAreaElement$prototype.properties.set("value", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $BMLTextAreaElement$prototype = newObject($HTMLTextAreaElement$prototype);
    prototypes.set(BML.BMLTextAreaElement.prototype, $BMLTextAreaElement$prototype);
    $BMLTextAreaElement$prototype.internalProperties.class = "BMLTextAreaElement";
    $BMLTextAreaElement$prototype.internalProperties.get = function* $BMLTextAreaElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLTextAreaElement)) {
            throw new InterpreterTypeError(`BMLTextAreaElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
        }
        return $BMLTextAreaElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLTextAreaElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLTextAreaElement)) {
            throw new InterpreterTypeError(`BMLTextAreaElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
        }
        yield* $HTMLTextAreaElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLTextAreaElement$prototype.internalProperties.put = $BMLTextAreaElement$put;
    $BMLTextAreaElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLImageElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLImageElement.prototype, $HTMLImageElement$prototype);
    $HTMLImageElement$prototype.internalProperties.class = "HTMLImageElement";
    $HTMLImageElement$prototype.internalProperties.get = function* $HTMLImageElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLImageElement)) {
            throw new InterpreterTypeError(`HTMLImageElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "alt":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.alt);
            case "src":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.src);
        }
        return $HTMLImageElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLImageElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLImageElement)) {
            throw new InterpreterTypeError(`HTMLImageElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "alt":
                return; // readonly
            case "src":
                self.internalProperties.hostObjectValue.src = yield* toString(ctx, value, caller);
                return;
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLImageElement$prototype.internalProperties.put = $HTMLImageElement$put;
    $HTMLImageElement$prototype.properties.set("alt", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLImageElement$prototype.properties.set("src", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $BMLImageElement$prototype = newObject($HTMLImageElement$prototype);
    prototypes.set(BML.BMLImageElement.prototype, $BMLImageElement$prototype);
    $BMLImageElement$prototype.internalProperties.class = "BMLImageElement";
    $BMLImageElement$prototype.internalProperties.get = function* $BMLImageElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLImageElement)) {
            throw new InterpreterTypeError(`BMLImageElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.normalStyle);
        }
        return $BMLImageElement$prototype.properties.get(propertyName)?.value;
    };
    function* $BMLImageElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.BMLImageElement)) {
            throw new InterpreterTypeError(`BMLImageElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "normalStyle":
                return; // readonly
        }
        yield* $HTMLImageElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $BMLImageElement$prototype.internalProperties.put = $BMLImageElement$put;
    $BMLImageElement$prototype.properties.set("normalStyle", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLHeadElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLHeadElement.prototype, $HTMLHeadElement$prototype);
    $HTMLHeadElement$prototype.internalProperties.class = "HTMLHeadElement";
    $HTMLHeadElement$prototype.internalProperties.get = function* $HTMLHeadElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLHeadElement)) {
            throw new InterpreterTypeError(`HTMLHeadElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLHeadElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLHeadElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLHeadElement)) {
            throw new InterpreterTypeError(`HTMLHeadElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLHeadElement$prototype.internalProperties.put = $HTMLHeadElement$put;
    const $HTMLTitleElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLTitleElement.prototype, $HTMLTitleElement$prototype);
    $HTMLTitleElement$prototype.internalProperties.class = "HTMLTitleElement";
    $HTMLTitleElement$prototype.internalProperties.get = function* $HTMLTitleElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLTitleElement)) {
            throw new InterpreterTypeError(`HTMLTitleElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "text":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.text);
        }
        return $HTMLTitleElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLTitleElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLTitleElement)) {
            throw new InterpreterTypeError(`HTMLTitleElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "text":
                return; // readonly
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLTitleElement$prototype.internalProperties.put = $HTMLTitleElement$put;
    $HTMLTitleElement$prototype.properties.set("text", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLMetaElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLMetaElement.prototype, $HTMLMetaElement$prototype);
    $HTMLMetaElement$prototype.internalProperties.class = "HTMLMetaElement";
    $HTMLMetaElement$prototype.internalProperties.get = function* $HTMLMetaElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLMetaElement)) {
            throw new InterpreterTypeError(`HTMLMetaElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "content":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.content);
            case "name":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.name);
        }
        return $HTMLMetaElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLMetaElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLMetaElement)) {
            throw new InterpreterTypeError(`HTMLMetaElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "content":
                return; // readonly
            case "name":
                return; // readonly
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLMetaElement$prototype.internalProperties.put = $HTMLMetaElement$put;
    $HTMLMetaElement$prototype.properties.set("content", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $HTMLMetaElement$prototype.properties.set("name", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $HTMLStyleElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLStyleElement.prototype, $HTMLStyleElement$prototype);
    $HTMLStyleElement$prototype.internalProperties.class = "HTMLStyleElement";
    $HTMLStyleElement$prototype.internalProperties.get = function* $HTMLStyleElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLStyleElement)) {
            throw new InterpreterTypeError(`HTMLStyleElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLStyleElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLStyleElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLStyleElement)) {
            throw new InterpreterTypeError(`HTMLStyleElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLStyleElement$prototype.internalProperties.put = $HTMLStyleElement$put;
    const $HTMLScriptElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLScriptElement.prototype, $HTMLScriptElement$prototype);
    $HTMLScriptElement$prototype.internalProperties.class = "HTMLScriptElement";
    $HTMLScriptElement$prototype.internalProperties.get = function* $HTMLScriptElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLScriptElement)) {
            throw new InterpreterTypeError(`HTMLScriptElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLScriptElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLScriptElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLScriptElement)) {
            throw new InterpreterTypeError(`HTMLScriptElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLScriptElement$prototype.internalProperties.put = $HTMLScriptElement$put;
    const $HTMLLinkElement$prototype = newObject($HTMLElement$prototype);
    prototypes.set(BML.HTMLLinkElement.prototype, $HTMLLinkElement$prototype);
    $HTMLLinkElement$prototype.internalProperties.class = "HTMLLinkElement";
    $HTMLLinkElement$prototype.internalProperties.get = function* $HTMLLinkElement$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLLinkElement)) {
            throw new InterpreterTypeError(`HTMLLinkElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $HTMLLinkElement$prototype.properties.get(propertyName)?.value;
    };
    function* $HTMLLinkElement$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.HTMLLinkElement)) {
            throw new InterpreterTypeError(`HTMLLinkElement.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $HTMLElement$put(ctx, self, propertyName, value, caller);
        return;
    };
    $HTMLLinkElement$prototype.internalProperties.put = $HTMLLinkElement$put;
    const $DOMImplementation$prototype = newObject(context.realm.intrinsics.ObjectPrototype);
    prototypes.set(BML.DOMImplementation.prototype, $DOMImplementation$prototype);
    $DOMImplementation$prototype.internalProperties.class = "DOMImplementation";
    $DOMImplementation$prototype.internalProperties.get = function* $DOMImplementation$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.DOMImplementation)) {
            throw new InterpreterTypeError(`DOMImplementation.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $DOMImplementation$prototype.properties.get(propertyName)?.value;
    };
    function* $DOMImplementation$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.DOMImplementation)) {
            throw new InterpreterTypeError(`DOMImplementation.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        throw new InterpreterTypeError(`DOMImplementation.prototype.${propertyName}: Unknown property`, ctx, caller);
    };
    $DOMImplementation$prototype.internalProperties.put = $DOMImplementation$put;
    $DOMImplementation$prototype.properties.set("hasFeature", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: newNativeFunction(context.realm.intrinsics.FunctionPrototype, function* $DOMImplementation$prototype$hasFeature(ctx, self, args, caller) {
            if (!(self?.internalProperties.hostObjectValue instanceof BML.DOMImplementation)) {
                throw new InterpreterTypeError("DOMImplementation.prototype.hasFeature: Invalid call", ctx, caller);
            }
            return wrap(prototypes, map, self.internalProperties.hostObjectValue.hasFeature(yield* toString(ctx, args[0], caller), yield* toString(ctx, args[1], caller)));
        }, 2, "hasFeature"),
    });
    const $CharacterData$prototype = newObject($Node$prototype);
    prototypes.set(BML.CharacterData.prototype, $CharacterData$prototype);
    $CharacterData$prototype.internalProperties.class = "CharacterData";
    $CharacterData$prototype.internalProperties.get = function* $CharacterData$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.CharacterData)) {
            throw new InterpreterTypeError(`CharacterData.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "data":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.data);
            case "length":
                return wrap(prototypes, map, self.internalProperties.hostObjectValue.length);
        }
        return $CharacterData$prototype.properties.get(propertyName)?.value;
    };
    function* $CharacterData$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.CharacterData)) {
            throw new InterpreterTypeError(`CharacterData.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
            case "data":
                self.internalProperties.hostObjectValue.data = yield* toString(ctx, value, caller);
                return;
            case "length":
                return; // readonly
        }
        yield* $Node$put(ctx, self, propertyName, value, caller);
        return;
    };
    $CharacterData$prototype.internalProperties.put = $CharacterData$put;
    $CharacterData$prototype.properties.set("data", {
        readOnly: false,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    $CharacterData$prototype.properties.set("length", {
        readOnly: true,
        dontEnum: true,
        dontDelete: true,
        value: undefined,
    });
    const $Text$prototype = newObject($CharacterData$prototype);
    prototypes.set(BML.Text.prototype, $Text$prototype);
    $Text$prototype.internalProperties.class = "Text";
    $Text$prototype.internalProperties.get = function* $Text$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.Text)) {
            throw new InterpreterTypeError(`Text.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $Text$prototype.properties.get(propertyName)?.value;
    };
    function* $Text$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.Text)) {
            throw new InterpreterTypeError(`Text.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $CharacterData$put(ctx, self, propertyName, value, caller);
        return;
    };
    $Text$prototype.internalProperties.put = $Text$put;
    const $CDATASection$prototype = newObject($Text$prototype);
    prototypes.set(BML.CDATASection.prototype, $CDATASection$prototype);
    $CDATASection$prototype.internalProperties.class = "CDATASection";
    $CDATASection$prototype.internalProperties.get = function* $CDATASection$get(ctx, self, propertyName, caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.CDATASection)) {
            throw new InterpreterTypeError(`CDATASection.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        return $CDATASection$prototype.properties.get(propertyName)?.value;
    };
    function* $CDATASection$put(ctx: Context, self: InterpreterObject, propertyName: string, value: Value, caller: Caller) {
        if (!(self?.internalProperties.hostObjectValue instanceof BML.CDATASection)) {
            throw new InterpreterTypeError(`CDATASection.prototype.${propertyName}: Invalid call`, ctx, caller);
        }
        switch (propertyName) {
        }
        yield* $Text$put(ctx, self, propertyName, value, caller);
        return;
    };
    $CDATASection$prototype.internalProperties.put = $CDATASection$put;
}

export function wrap(prototypes: Map<any, InterpreterObject>, map: WeakMap<any, InterpreterObject>, obj: any): Value {
    if (isPrimitive(obj)) {
        return obj;
    }
    if ("internalProperties" in obj && typeof obj.internalProperties.class === "string") {
        return obj as InterpreterObject;
    }
    const wrapperCache = map.get(obj);
    if (wrapperCache != null) {
        return wrapperCache;
    }
    const prototype = prototypes.get(Object.getPrototypeOf(obj));
    if (prototype == null) {
        throw new TypeError("unknown object: " + obj);
    }
    const wrapper = newObject(prototype);
    wrapper.internalProperties.hostObjectValue = obj;
    wrapper.internalProperties.class = prototype.internalProperties.class;
    if (prototype.internalProperties.put != null) {
        wrapper.internalProperties.put = prototype.internalProperties.put;
    }
    return wrapper;
}
