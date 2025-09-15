## ES2

ECMAScript実装

<https://github.com/otya128/es2>のbmlブランチの`src/index.ts`が配置されています。

DOMについてはIDLからインタプリタとのバインディングを自動生成しています。

```sh
echo 'import { BML } from "../interface/DOM";' | node es2/build/omg-idl/idl2ts.js ./es2 "BML." - idl/dom.idl idl/html1.idl idl/bml.idl > src/client/interpreter/binding.ts
```
