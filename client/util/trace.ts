
export function getTrace(_channel: string): (message?: any, ...optionalParams: any[]) => void {
    if (!localStorage.getItem("trace")) {
        return () => {};
    }
    return console.debug;
}

export function getLog(_channel: string): (message?: any, ...optionalParams: any[]) => void {
    return console.log;
}
