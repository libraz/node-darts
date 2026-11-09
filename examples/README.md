# node-darts examples

Runnable examples for the `node-darts` API. Each file is an ES module that imports from `node-darts`; run one from the repository root after `yarn build`:

```bash
node examples/basic-usage.mjs
```

| File | Shows |
|---|---|
| `basic-usage.mjs` | Building a dictionary, exact match, common prefix search, `replaceWords` |
| `dictionary-builder.mjs` | `[key, value]` and `Map` input, `save`, `load`, `toBytes`, `fromBytes`, choosing a backend |
| `text-replacement.mjs` | Function, object and `Map` replacers; generating links; replacing with a loaded dictionary |
| `auto-complete.mjs` | Prefix checks with `traverse` |
| `morphological-analysis.mjs` | Longest-match word segmentation with part-of-speech tags using `commonPrefixSearch` |
| `error-handling.mjs` | `TypeError` / `RangeError` for bad arguments, and `FileNotFoundError`, `InvalidDictionaryError`, `DartsError` with their `code` |

Examples that write files use a temporary directory and remove it before exiting.

Japanese versions of every example are in [`ja/`](ja/).
