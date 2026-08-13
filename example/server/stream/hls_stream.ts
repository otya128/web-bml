import { Transform } from "stream";
import { LiveStream } from "./live_stream";
import ID3MetadataTransform from 'arib-subtitle-timedmetadater';

export class HLSLiveStream extends LiveStream {
    id3MetadataTransoform: Transform;
    public constructor(ffmpeg: string, args: string[], tsStream: Transform) {
        const id3MetadataTransoform = new ID3MetadataTransform();
        tsStream.pipe(id3MetadataTransoform);
        super(ffmpeg, args, id3MetadataTransoform);
        this.id3MetadataTransoform = id3MetadataTransoform;
    }

    public destroy(): void {
        super.destroy();
        this.id3MetadataTransoform.unpipe();
    }
}