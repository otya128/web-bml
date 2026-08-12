const logLevel = {
    error: 3,
    warn: 2,
    info: 1,
    log: 0,
    debug: -1,
} as const;
export type LogLevel = keyof typeof logLevel;

export class Logger
{
    public prefix: string;
    public error = console.error.bind(console);
    public warn = console.warn.bind(console);
    public info = console.info.bind(console);
    public log = console.log.bind(console);
    public debug = console.debug.bind(console);
    constructor(prefix: string, level?: LogLevel) {
        const l = logLevel[level ?? "log"] ?? logLevel.log;
        this.prefix = `${prefix}`;
        if (l > logLevel.debug) {
            this.debug = () => {};
        }
        if (l > logLevel.log) {
            this.log = () => {};
        }
        if (l > logLevel.info) {
            this.info = () => {};
        }
        if (l > logLevel.warn) {
            this.warn = () => {};
        }
        if (l > logLevel.error) {
            this.error = () => {};
        }
    }
}
