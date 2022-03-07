
const originalNumber = Number;
export function overrideNumber() {
    Number = new Proxy(function Number(...args: any[]) {
        return originalNumber(...args);
    }, {
        get(_obj, prop) {
            if (prop === "MIN_VALUE") {
                return 1;
            } else if (prop === "MAX_VALUE") {
                return 2147483647;
            }
            return Reflect.get(originalNumber, prop);
        },
        set(_obj, prop, value) {
            Reflect.set(originalNumber, prop, value);
            return true;
        }
    }) as any;
    // ToNumber
};
