export abstract class VideoPlayer {
    protected video: HTMLVideoElement;
    protected container: HTMLElement;
    constructor(video: HTMLVideoElement, container: HTMLElement) {
        this.video = video;
        this.container = container;
    }
    public abstract setSource(source: string): void;
    public play() {
        this.video.play();
    }
    public pause() {
        this.video.pause();
    }
    public mute() {
        this.video.muted = true;
    }
    public unmute() {
        this.video.muted = false;
    }
    public showCC() {
    }
    public hideCC() {
    }
    public scale(_factor: number) {
    }

    public setPRAAudioNode(_audioNode?: AudioNode): void {
    }
}
