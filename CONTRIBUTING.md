# Contributing to node-darts

Small and unfinished changes are welcome: a bug report, a failing test, a half-written fix, a documentation correction. The maintainer reviews every pull request, finishes what is missing and merges it. You do not need to satisfy or read all of this document; the first section is the whole ask.

## What a pull request needs

1. A description of what the change does and why. A clear intent is enough for the maintainer to verify the behavior.
2. If possible, a build and the tests for the part you changed (see Development setup).

A red check, a missing test or an untouched backend is fine; the maintainer fills the gaps. Open pull requests against `main`. Opening an issue first is optional and mostly useful for a larger change. A bug report with no fix is a contribution too.

## What you are contributing to

node-darts is a Node.js package around a Rust trie core in `core/`. The core is a literal port of Darts 0.32 and darts-clone and is compiled to WebAssembly. Bugs in dictionary building or searching usually belong in `core/`; bugs in argument handling, errors or file I/O belong in `src/`.

## Development setup

Node.js and Yarn versions are pinned in `mise.toml` and `packageManager`; `mise install` sets them up. The Rust toolchain is pinned in `rust-toolchain.toml` (rustup installs it, with the `wasm32-unknown-unknown` target, on first use). The package manager is Yarn only.

```bash
yarn install
yarn build:wasm   # compile core/ and embed it in src/generated/ (gitignored)
yarn build        # TypeScript to dist/
make test         # cargo test, then the JS suite once per backend
make format       # cargo fmt and Biome fixes, then every linter
make format-check # the read-only version of format
make lint         # clippy (host and wasm32), Biome, tsc
```

Run `yarn build:wasm` after any change under `core/` and before `yarn test`; the JS suite runs against the embedded binary. The JS suite runs once per backend, selected with `NODE_DARTS_TEST_BACKEND=darts` or `=clone`; `yarn test` alone uses the library default.

## CI

Workflow `ci.yml` runs on pushes and pull requests to `main` that touch more than Markdown, `docs/`, `LICENSE` or `NOTICE`.

| Job | Runs |
|---|---|
| `lint` | `make format-check` |
| `test-rust` | `cargo test --locked` |
| `test` | `yarn test:coverage` for both backends, on Node.js 22 and 24 |
| `node20-smoke` | Build, save and load round trip on the oldest supported Node.js |

A red check is no reason to hold a pull request back.

## Checklist

What a merged change looks like. The maintainer completes whatever is missing.

- A builder change leaves the built image byte-identical to the upstream libraries; `core/tests/oracle.rs` checks it.
- Search code never panics on a loaded image: out-of-range reads are misses.
- Builders stay iterative; the WebAssembly stack is 1 MB.
- A status code or FFI signature change is made in `core/src/ffi.rs` and `src/internal/core.ts` together.
- Argument checks live at the public boundary and raise `TypeError` or `RangeError`; domain failures are `DartsError` subclasses with a `code`.
- A behavior fix in one backend is checked in the other.
- Tests go through the public entry point (`src/index.ts`).
- Comments are in English, and public symbols carry JSDoc.
- Commit messages follow Conventional Commits (`fix: ...`, `feat(core): ...`); a message can be reworded at merge.

## Reference

This section asks nothing of you.

- The fixtures in `core/tests/fixtures/oracle/` are recordings of the original C++ libraries, which are no longer in the tree, so they cannot be regenerated. New cases need an expected output derived independently.
- The Darts format has no header, so any bytes load as a Darts image; the loader rejects images that cannot have come from the upstream builder.
- Vitest runs files serially in separate processes, because the WebAssembly core keeps a module-global handle table.
- `make test` and `make format-check` are the same commands CI runs. `main` is the only branch CI watches.

## Reporting issues

Include the node-darts and Node.js versions, your OS, the backend (`'darts'` or `'clone'`), and the smallest code that reproduces the problem. If a particular dictionary file is the problem, attach it or the keys it was built from.

## License

Contributions are licensed under the [MIT License](LICENSE).
