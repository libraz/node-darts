# 日本語版サンプル

このディレクトリには、node-dartsライブラリの日本語版サンプルが含まれています。

## サンプル一覧

1. **morphological-analysis.js** - 形態素解析のような辞書検索の例
   - Dartsを使った簡易的な形態素解析の実装例
   - 日本語テキストの単語分割と品詞タグ付けのデモ

2. **auto-complete.js** - 自動補完機能の例
   - Dartsを使った自動補完機能の実装例
   - インタラクティブなコマンドライン自動補完デモ

3. **error-handling.js** - エラーハンドリングの例
   - node-dartsのエラーハンドリング方法を示すサンプル
   - 様々なエラーケースとその対処法

## 実行方法

各サンプルは以下のコマンドで実行できます：

```bash
node examples/ja/morphological-analysis.js
node examples/ja/auto-complete.js
node examples/ja/error-handling.js
```

## 注意事項

- これらのサンプルは、Dartsライブラリの基本機能（辞書構築、検索）を応用した例です
- 形態素解析の例は、実際の形態素解析器よりも簡易的なものです
- 自動補完の例は、実際のアプリケーションでは、より複雑な実装が必要になる場合があります