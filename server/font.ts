import https from "https";
import fs from "fs";
import crypto from "crypto";
import { Writable } from "stream";
import { IncomingMessage } from "http";

type DownloadEntry = {
    url: string,
    dest: string,
    sha256: string,
};

const files = [
    {
        url: "https://raw.githubusercontent.com/googlefonts/kosugi-maru/bd22c671a9ffc10cc4313e6f2fd75f2b86d6b14b/fonts/ttf/KosugiMaru-Regular.ttf",
        dest: "./dist/KosugiMaru-Regular.ttf",
        sha256: "4b8d0022c8dadd090ef67cd1f71f130714767af7806cba2eb4ebe4b0271c1d68",
    },
    {
        url: "https://raw.githubusercontent.com/googlefonts/kosugi/75171a2738135ab888549e76a9037e826094f0ce/fonts/ttf/Kosugi-Regular.ttf",
        dest: "./dist/Kosugi-Regular.ttf",
        sha256: "f5e81d6a6b865d9b88c54d2d3c16bcaa3b239dfcefaf2a62976ac9dc7574bab7",
    }
];

export async function downloadFonts(): Promise<void> {
    for (const file of files) {
        if (fs.existsSync(file.dest)) {
            continue;
        }
        console.log(`download ${file.url} to ${file.dest}`);
        await download(file);
        console.log(`downloaded ${file.url} to ${file.dest}`);
    }
}

function waitStream(s: Writable): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (s.writableFinished) {
            resolve();
            return;
        }
        s.on("error", reject);
        s.on("finish", resolve);
    })
}

function get(options: string | https.RequestOptions | URL): Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, _) => https.get(options, resolve));
}

async function download({ url, dest, sha256 }: DownloadEntry): Promise<void> {
    const res = await get(url);
    if (res.statusCode === 200) {
        const tmp = dest + ".tmp";
        const ws = fs.createWriteStream(tmp);
        const hasher = crypto.createHash("sha256")
        res.pipe(hasher);
        res.pipe(ws);
        res.on("error", (err) => {
            console.error("failed to download font", url, dest, err);
            hasher.unpipe();
            res.unpipe();
            ws.destroy();
            hasher.destroy();
        });
        await waitStream(hasher);
        await waitStream(ws);
        const digest = hasher.digest("hex");
        if (digest !== sha256) {
            console.error("sha256 mismatch", url, dest, sha256, digest);
        } else {
            fs.renameSync(tmp, dest);
        }
    }
}
