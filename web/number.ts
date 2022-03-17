export const MIN_VALUE = 1;
export const MAX_VALUE = 2147483647;

const originalNumber = Number;

export function overrideNumber() {
    Number = new Proxy(function Number(...args: any[]) {
        return originalNumber(...args);
    }, {
        get(_obj, prop) {
            if (prop === "MIN_VALUE") {
                return MIN_VALUE;
            } else if (prop === "MAX_VALUE") {
                return MAX_VALUE;
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
