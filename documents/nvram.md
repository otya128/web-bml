# nvramの運用規定

STD-B24, TR-B14, TR-B15を参照

## 地上波

TR-B14 第二分冊 5.2 表5-1

### 地上デジタルテレビジョン放送事業者系列専用領域

BS: 読み書き(BML3.0, 地上の拡張ブロードキャスタ記述子で同系列と定義された場合), CS: 不可, 地上: 読み書き

系列ごとに64バイトの固定長ブロック*64

系列数は8以上

`nvram://<affiliation_id>;group/<block number>`

TR-B14 第五分冊 表9-4参照

|affiliation_id|系列名|
|-|-|
|00|NHK総合|
|01|NHK教育|
|02|日本テレビ放送網|
|03|TBSテレビ|
|04|フジテレビ|
|05|テレビ朝日|
|06|テレビ東京|
|07|サンテレビジョン|

NHKは総合, 教育, BS1, BSP全て0と1に含まれる

### 地上デジタルテレビジョン放送事業者専用領域

BS: 不可, CS: 不可, 地上: 読み書き

事業者ごとに64バイトの固定長ブロック*64

事業者数は12以上

`nvram://[<original_network_id>;]local/<block number>`

### 地上デジタルテレビジョン放送事業者専用放送通信共通領域

BS: 不可, CS: 不可, 地上: 読み書き

事業者ごとに64バイトの固定長ブロック*32

事業者数は12以上

`nvram://[<original_network_id>;]local_web/<block number>`

### 地上デジタルテレビジョン放送事業者共通領域

BS: 読み出し, CS: 不可, 地上: 読み書き

64バイトの固定長ブロック*32

ブロックごとにフォーマットが定められている(5.2.8 表5-3参照)

`nvram://tr_common/<block number>`

## 共用

TR-B14 第二分冊, TR-B15 第一分冊, 第四分冊参照

### ブックマーク領域

BS: 読み書き(レベル2, 3のみ), CS: 読み書き, 地上: 読み書き

最大320バイトの可変長ブロック*50以上(地上)

最大320バイトの可変長ブロック*30以上(CS)

TR-B14(地上)とTR-B15(CS)でブロック数に違いがある

地上とBS/CSで共通でないかもしれない

`nvram://bookmark/<block number>`

### 登録発呼領域

BS: 読み書き(BML3.0), CS: 読み書き(BML3.0), 地上: 読み書き
最大1.5KBの可変長ブロック*50以上

`nvram://denbun/<block number>`

### 視聴者居住地域情報

`nvram://receiverinfo/<region type>`

TR-B14 5.2.7 表5-2参照

## BS

TR-B15 第一分冊, 第三分冊, 第四分冊参照

### BS事業者共通領域

TR-B15 第三分冊 6.3.5参照

BS: 読み書き, CS: 不可, 地上: 読み出し

全ての事業者で共通

64バイト*16

`nvram://common/<block number>`

### BS事業者専用領域

BS: 読み書き, CS: 読み書き(オプション、許可された場合のみ), 地上: 不可

事業者ごとに64バイト*64

事業者数は23

`getBrowserSupport("nvram", "BSspecifiedExtension", "48")`が1を返せば64ブロック以上, 0を返せば16ブロック

`getBrowserSupport("nvram", "NumberOfBSBroadcasters", "23")`が1を返せば23事業者以上

broadcaster_idごと

`nvram://~/<block number>`

`nvram://~/ext/<block number>`

### BSデジタル放送事業者専用放送通信共通領域(オプション)

BS: 読み書き, CS: 不可, 地上: 不可

TR-B15 第一分冊 10.3.2参照

事業者ごとに64バイト*32ブロック

事業者数は20

broadcaster_idは常に省略

`nvram://[<broadcaster_id>;]local_web/<block number>`

## CS

TR-B15 第四分冊参照

### 広帯域CSデジタル放送事業者共通領域

BS: 不可, CS: 読み書き, 地上: 不可

TR-B15 第四分冊参照 8.10.1参照

ネットワークごとに64バイト*32

ネットワーク数は2

`nvram://[<original_network_id>;]cs_common/<block number>`

original_network_idは常に省略

地上, BSと違い中身はネットワークごとに規定される

### 広帯域CSデジタル放送事業者専用領域

BS: 不可, CS: 読み書き, 地上: 不可

事業者ごとに64バイト*47

`getBrowserSupport("nvram", "NumberOfCSBroadcasters", "23")`が1を返せば23事業者以上

`nvrams://[<original_network_id>;]~/<block number>`

original_network_idは常に省略

broadcaster_idごと

nvram://は運用されない

### 広帯域CSデジタル放送事業者専用放送通信共通領域

BS: 不可, CS: 読み書き, 地上: 不可

TR-B15 第四分冊 11.5.7.1参照

事業者ごとに64バイト*46

broadcaster_idは常に省略

`nvram://[<broadcaster_id>;]local_web/<block number>`


## STD-B24

STD-B24 第二編(1/2) 解説7 参照

### 事業者専用領域

通常領域

`nvram://~/<block number>`

### BS共通領域, 広帯域CS事業者共通領域

ネットワーク毎の共通領域
`nvram://common/<block number>`

original_network_idは常に省略
