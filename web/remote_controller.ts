export type RemoteControllerMessage = {
    type: "keydown" | "keyup",
    key: string,
} | {
    type: "button",
    keyCode: number,
} | {
    type: "mute" | "unmute" | "load" | "pause" | "play" | "cc" | "disable-cc" | "zoom-100" | "zoom-150" | "zoom-200",
};
