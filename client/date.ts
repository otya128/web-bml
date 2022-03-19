export function toString(this: Date): string {
    return (
        Math.abs(this.getFullYear()).toString().padStart(4, "0") + "-" + (this.getMonth() + 1).toString().padStart(2, "0") + "-" + this.getDate().toString().padStart(2, "0")
        + "T" +
        this.getHours().toString().padStart(2, "0") + ":" + this.getMinutes().toString().padStart(2, "0") + ":" + this.getSeconds().toString().padStart(2, "0")
    );
};

export function toUTCString(this: Date): string {
    return (
        Math.abs(this.getUTCFullYear()).toString().padStart(4, "0") + "-" + (this.getUTCMonth() + 1).toString().padStart(2, "0") + "-" + this.getUTCDate().toString().padStart(2, "0")
        + "T" +
        this.getUTCHours().toString().padStart(2, "0") + ":" + this.getUTCMinutes().toString().padStart(2, "0") + ":" + this.getUTCSeconds().toString().padStart(2, "0")
    );
};
