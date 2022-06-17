// データ放送に含まれるJPEGのカラリメトリはBT.709だが通常JPEGはBT601なので色がおかしくなる(TR-B14 第二分冊 3.2.1 JPEG、ITU-T Rec. T.871 6.2 Colour space参照)
// 一旦BT.601としてRGBからYCBCRに変換しそれをBT.709としてRGBに変換することで修正
export async function convertJPEG(image: ImageBitmap): Promise<{ blobUrl: string, width: number, height: number }> {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, image.width, image.height);
    const { width, height, data } = imageData;
    for (let imageY = 0; imageY < height; imageY++) {
        for (let imageX = 0; imageX < width; imageX++) {
            const r = data[(imageX + imageY * width) * 4 + 0];
            const g = data[(imageX + imageY * width) * 4 + 1];
            const b = data[(imageX + imageY * width) * 4 + 2];
            // 以下を展開
            // const y = 0.299 * r + 0.587 * g + 0.114 * b;
            // const cb = -0.168735892 * r - 0.331264108 * g + 0.5 * b + 128;
            // const cr = 0.5 * r - 0.418687589 * g - 0.081312411 * b + 128;
            // data[(imageX + imageY * width) * 4 + 0] = (y - 16) * 1.16438 + 1.79274 * (cr - 128);
            // data[(imageX + imageY * width) * 4 + 1] = (y - 16) * 1.16438 + -0.213249 * (cb - 128) - 0.532909 * (cr - 128);
            // data[(imageX + imageY * width) * 4 + 2] = (y - 16) * 1.16438 + 2.1124 * (cb - 128);
            data[(imageX + imageY * width) * 4 + 0] = 1.24452 * r - 0.0671069 * g - 0.0130327 * b - 18.6301;
            data[(imageX + imageY * width) * 4 + 1] = 0.117678 * r + 0.977255 * g + 0.0694469 * b - 18.6301;
            data[(imageX + imageY * width) * 4 + 2] = -0.00828808 * r - 0.0162712 * g + 1.18894 * b - 18.6301
        }
    }
    context.putImageData(imageData, 0, 0);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob == null) {
                reject("toBlob failed");
                return;
            }
            resolve({ blobUrl: URL.createObjectURL(blob), width, height });
        }, "image/png");
    });
}
