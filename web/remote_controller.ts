export type RemoteControllerMessage = {
    type: "keydown" | "keyup",
    key: string,
} | {
    type: "button",
    keyCode: number,
} | {
    type: "mute" | "unmute" | "load",
};
