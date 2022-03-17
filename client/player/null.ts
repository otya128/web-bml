export function play(videoStreamUrl: string, videoElement: HTMLVideoElement) {
    videoElement.innerHTML = "";
    const sourceElement = document.createElement("source");
    sourceElement.type = "video/mp4";
    sourceElement.src = videoStreamUrl + ".null";
    videoElement.appendChild(sourceElement);
}
