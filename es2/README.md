## ES2

ECMAScript実装

<https://github.com/otya128/es2>のbmlブランチの`src/index.ts`が配置されています。

DOMについてはIDLからインタプリタとのバインディングを自動生成しています。

IDLを更新した場合
```sh
git clone --branch bml https://github.com/otya128/es2
cd es2
npm ci
npm run build
echo 'import { BML } from "../interface/DOM";' | node ./build/omg-idl/idl2ts.js ../../es2 "BML." - ../../idl/bml.idl ../../idl/html1.idl ../../idl/dom.idl > ../../client/interpreter/es2_dom_binding.ts
```
