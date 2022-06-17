# web-bml

Webブラウザで動作するデータ放送ブラウザ(BMLブラウザ)

デモ https://otya128.github.io/web-bml

![screenshot](https://user-images.githubusercontent.com/4075988/159119988-d57b4d1b-6940-45d5-8d54-87acb2f75781.png)

## 動作環境

* LinuxまたはWindows上のnode.js (v16.x)
* 新しめのFirefoxまたはChromium系ブラウザ
* ffmpeg (動画視聴する場合)

## 使い方

git clone --recursiveするかサブモジュールを初期化

```sh
git submodule init
git submodule update
```

Mirakurunからの放送、EPGStationからの録画または引数に与えたファイルを再生できます。

### 実行方法

```sh
yarn workspace @chinachu/aribts build
yarn build
yarn start [input.ts]
```

localhost:23234

### 実行方法(コンテナ)

```sh
docker build -t web-bml .
docker run --rm --name web-bml -e MIRAK_URL=http://localhost:40772 -e EPG_URL=http://localhost:8888 -p 23234:23234 web-bml
```

ファイルを試す場合:
```sh
docker run --rm --name web-bml --mount "type=bind,source=PATH-TO-TS.ts,target=/app/input.ts,readonly" -e INPUT_FILE=input.ts -p 23234:23234 web-bml
```

MirakurunとEPGStationが既にコンテナで動いている場合:

```sh
docker run --rm --name web-bml --net=host -e MIRAK_URL=http://localhost:40772 -e EPG_URL=http://localhost:8888 web-bml
```

```sh
docker run --rm --name web-bml --net=xxxx -e MIRAK_URL=http://mirakurun:40772 -e EPG_URL=http://epgstation:8888 -p 23234:23234 web-bml
```


### 動画形式

null以外はffmpegが必須

`?format=...&demultiplexServiceId=...&seek=bytes`

* null
    * ブラウザ向けに動画をエンコードせずデータカルーセルのみをデコードする
    * データ放送のみのサービス(NHK BS1 707ヘルプチャンネルなど)はこれじゃないと表示できないことがある
        * `/channels/BS/BS15_0/stream?demultiplexServiceId=707&format=null`
* mp4
    * &lt;video&gt;のみで再生する
    * 字幕非対応
* h264-mpegts
    * デフォルト
    * mpegts.jsを利用
    * 低遅延で再生されるまでが速い
    * aribb24.jsによる字幕に対応
    * 生配信にのみ対応
        * ただしffmpegのオプションに-reを付けて等速にしているため録画でも一応は動く
* hls
    * hls.jsを利用
    * aribb24.jsによる字幕に対応
    * 特に理由がなければh264-mpegtsで良い

## 設定

環境変数か.envファイルに以下のように記述

```
MIRAK_URL=http://localhost:30772/
```

### MIRAK_URL

MirakurunのURL

デフォルト値 `http://localhost:40772/`

### EPG_URL

EPGStationのURL

デフォルト値 `http://localhost:8888/`

### FFMPEG

ffmpegの実行ファイル

デフォルト値 `ffmpeg`

### FFMPEG_OUTPUT

1であればffmpegの標準エラー出力をリダイレクト

デフォルト値 `0`

### HLS_DIR

HLSを使う場合の一時出力先

デフォルト値 `./hls`

### PORT

待ち受けるポート番号

デフォルト値 `23234`

### HOST

待ち受けるホスト

デフォルト値 `localhost`

### INPUT_FILE

入力ファイル

## フォント

丸ゴシック用にKosugiMaru(モトヤLマルベリ3等幅)、ゴシック用にKosugi(モトヤLシーダ3等幅)がGitHubからダウンロードされ使われます。

制約が厳しいBMLではスペースによるレイアウトがよく使われるためフォントは仕様で規定されている通り等幅であることが必須です。 (UnicodeではなくJISコード基準なので記号なども全角幅であるべき)

外字はOpenTypeに変換されて文字として表示されますがgrayscale-color-indexは無視されます。
Chromium系のブラウザであれば定義通りフォントの大きさに合わせた外字が表示されます。
Firefoxであれば一番大きいサイズが縮小されて表示されます。

## 実装

STD-B24, TR-B14, TR-B15の仕様を部分的に実装しています。

一部のイベント(CCStatusChanged、MediaStopped)やAPIなどは現状未実装です。
