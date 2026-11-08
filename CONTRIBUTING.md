# Contributing to node-darts

Thank you for your interest in contributing to node-darts! This document provides guidelines and instructions for contributing to this project.

## Development Environment Setup

### Prerequisites

- Node.js v20.0.0 or later
- Yarn v4.0.0 or later (the repo pins `yarn@4.18.0` via `mise.toml` / `packageManager`)
- Rust via [rustup](https://rustup.rs/). `rust-toolchain.toml` pins the version and adds the `wasm32-unknown-unknown` target, so rustup installs the right toolchain on first use.

The trie core lives in `core/` (a Rust crate, not published). `yarn build:wasm` compiles it to WebAssembly and embeds the binary into `src/generated/darts-wasm.ts`, which the TypeScript build and the test suite import.

### Setting Up

This project uses [mise](https://mise.jdx.dev/) to manage Node.js and Yarn versions. With mise installed, run `mise install` in the repository root to get the versions pinned in `mise.toml`.

1. Clone the repository:

   ```bash
   git clone https://github.com/libraz/node-darts.git
   cd node-darts
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

   This also runs `yarn build` (the `prepare` script), which compiles the WebAssembly core.

3. Verify the setup:
   ```bash
   yarn test
   ```

## Development Workflow

### Building

To build the project:

```bash
yarn build
```

This compiles the WebAssembly core and the TypeScript code.

After changing anything under `core/`, run `yarn build:wasm` before `yarn test`; the JS suite runs against the embedded binary.

To clean the build artifacts:

```bash
yarn clean
```

### Testing

To run everything (Rust unit and oracle tests, then the JS suite once per backend):

```bash
make test
```

The JS suite alone:

```bash
yarn test
```

`core/tests/oracle.rs` compares both Rust builders and every search against images and results recorded from the original C++ libraries (`core/tests/fixtures/oracle/`). Built dictionaries must match those images byte for byte.

To run tests with coverage:

```bash
yarn test:coverage
```

Tests are organised into tiers under `tests/`:

- `tests/unit/` — fast unit tests for the core TypeScript layer
- `tests/integration/` — exercises the package end-to-end
- `tests/perf/` — performance smoke + heavy benchmarks
- `tests/regression/` — pinned regression cases

Vitest runs with `pool: 'forks'` and `fileParallelism: false` so the module-global handle table of the WebAssembly core is isolated between files. See `vitest.config.mts`.

#### Running tests against the `darts-clone` backend

The `NODE_DARTS_DEFAULT_BACKEND` env var overrides the default backend used when callers don't pass one explicitly. CI runs the suite twice (once per backend); to do the same locally:

```bash
yarn test                                  # taku910/darts default
NODE_DARTS_DEFAULT_BACKEND=clone yarn test # darts-clone default
```

`tests/regression/backend-switch.test.ts` always exercises both backends explicitly via `describe.each`.

#### Performance Tests

`tests/perf/perf-smoke.test.ts` runs by default and only catches order-of-magnitude regressions. The heavy suite at `tests/perf/performance.test.ts` is `describe.skip`-ed because it generates 10k–100k keys and is too slow for CI. To run it manually:

1. Open `tests/perf/performance.test.ts`
2. Change `describe.skip('Performance Tests', () => {` to `describe('Performance Tests', () => {`
3. Run the performance tests:

```bash
yarn test tests/perf/performance.test.ts
```

4. Remember to change it back to `describe.skip` before committing your changes.

Note: If the tests fail due to timeout or memory issues, you can:
- Increase the timeout in the test file (e.g., change `120000` to a higher value)
- Reduce the number of keys generated in the tests
- Run the tests on a machine with more memory

Alternatively, you can run a specific performance test:

```bash
# First change describe.skip to describe in the file
yarn test -t "should build large dictionary efficiently"
```

Performance tests are useful for:
- Benchmarking dictionary building and searching operations
- Identifying performance regressions
- Optimizing critical code paths
- Testing the replaceWords functionality with large datasets

### Linting & Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting (ESLint + Prettier are no longer used). Configuration lives in `biome.json`.

```bash
yarn lint        # biome lint
yarn lint:fix    # biome lint --write
yarn format      # biome format --write
yarn check       # biome check (lint + format together)
yarn check:fix   # biome check --write
yarn ci          # biome ci (used in CI; fails on any issue)
```

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Make your changes, following the coding style of the project.
3. Add or update tests as necessary.
4. Ensure all tests pass and the code lints without errors.
5. Update documentation as needed.
6. Submit a pull request.

### Pull Request Requirements

- The CI must pass (lint, test, build).
- Code should be properly formatted (run `yarn format` before committing).
- Use clear and descriptive commit messages.
- Include tests for new features or bug fixes.
- Update documentation if necessary.

## Coding Guidelines

### TypeScript

- Follow the project's Biome configuration (`biome.json`); run `yarn check:fix` before committing.
- Use meaningful variable and function names.
- Add JSDoc comments for public APIs.
- Maintain type safety throughout the codebase.
- **Write all comments in English.** This is important for maintaining consistency and ensuring that all contributors can understand the code.
- Use design patterns appropriately. For example, the TextDarts class uses the Factory Method pattern to encapsulate object creation logic.

### Rust

- `rustfmt` and `clippy` (pedantic, configured in `core/Cargo.toml`) must be clean; `make format` fixes formatting for Rust and TypeScript and then runs every linter, `make format-check` is the read-only CI gate.
- Search code must never panic on a loaded image: index with bounds checks and treat an out-of-range read as a miss.
- Builders must keep their output byte-identical to the upstream libraries; the oracle test enforces it.
- `unsafe` is confined to the C ABI in `core/src/ffi.rs`.

## Project Structure

```
node-darts/
├── core/                         # Rust crate compiled to WebAssembly (not published)
│   ├── src/
│   │   ├── darts.rs              # Darts 0.32 double-array: build, load, search
│   │   ├── clone/                # darts-clone double-array (DAWG builder, units)
│   │   ├── dict.rs               # Backend-neutral layer: input contract, auto-detect
│   │   └── ffi.rs                # C ABI exported to JS: handle table, status codes
│   └── tests/                    # Oracle tests against upstream recordings
├── scripts/
│   ├── build-wasm.mjs            # cargo build + embed into src/generated/
│   └── postbuild-copy.cjs        # Writes dist/ type and module-format markers
├── src/
│   ├── core/
│   │   ├── wasm.ts               # Instantiates the core; memory marshalling
│   │   ├── native.ts             # Validating wrapper, error mapping, file I/O
│   │   ├── builder.ts            # Builder class
│   │   ├── dictionary.ts         # Dictionary class
│   │   ├── types.ts / errors.ts / utils.ts
│   ├── generated/                # Embedded WebAssembly (gitignored)
│   ├── text-darts.ts             # TextDarts class (Factory Method pattern)
│   ├── index.ts                  # Package entry point (CommonJS)
│   └── index.esm.ts              # ESM entry point
├── tests/                        # Vitest suite: unit, integration, perf, regression
├── examples/
├── Cargo.toml / rust-toolchain.toml / rustfmt.toml
├── Makefile                      # build, test, format, format-check, lint
├── biome.json
├── vitest.config.mts
└── tsconfig*.json
```

## License

By contributing to node-darts, you agree that your contributions will be licensed under the project's MIT license.
