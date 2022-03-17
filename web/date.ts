export function toString(this: Date): string {
    return (
        Math.abs(this.getFullYear()).toString().padStart(4, "0") + "-" + (this.getMonth() + 1).toString().padStart(2, "0") + "-" + this.getDate().toString().padStart(2, "0")
        + "T" +
        this.getHours().toString().padStart(2, "0") + ":" + this.getMinutes().toString().padStart(2, "0") + ":" + this.getSeconds().toString().padStart(2, "0")
    );
};

export function overrideDate() {
    Date.prototype.toString = toString;
    Date.prototype.toLocaleString = Date.prototype.toString;
    Date.prototype.toUTCString = Date.prototype.toString;
}
