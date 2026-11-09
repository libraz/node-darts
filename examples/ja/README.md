# node-darts のサンプル

`node-darts` の API を使う実行可能なサンプルです。各ファイルは `node-darts` から import する ES モジュールで、`yarn build` の後にリポジトリのルートから実行します。

```bash
node examples/ja/basic-usage.mjs
```

| ファイル | 内容 |
|---|---|
| `basic-usage.mjs` | 辞書の構築、完全一致検索、共通接頭辞検索、`replaceWords` |
| `dictionary-builder.mjs` | `[key, value]` と `Map` の入力、`save`、`load`、`toBytes`、`fromBytes`、backend の選択 |
| `text-replacement.mjs` | 関数・オブジェクト・`Map` による置換、リンクの生成、読み込んだ辞書での置換 |
| `auto-complete.mjs` | `traverse` による接頭辞の判定 |
| `morphological-analysis.mjs` | `commonPrefixSearch` による最長一致の分割と品詞の付与 |
| `error-handling.mjs` | 引数の誤りの `TypeError` / `RangeError`、`FileNotFoundError`・`InvalidDictionaryError`・`DartsError` と `code` |

ファイルを書き出すサンプルは一時ディレクトリを使い、終了前に削除します。
