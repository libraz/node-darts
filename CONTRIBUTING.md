# Contributing to node-darts

Thank you for your interest in contributing to node-darts! This document provides guidelines and instructions for contributing to this project.

## Development Environment Setup

### Prerequisites

- Node.js v20.0.0 or later
- Yarn v4.0.0 or later (the repo pins `yarn@4.9.1` via Volta / `packageManager`)
- C++ compiler with C++17 support
  - Windows: Visual Studio 2019 or later with C++ build tools
  - macOS: Xcode Command Line Tools
  - Linux: GCC 7 or later, build-essential

Both Darts backends (`darts` and `darts-clone`) are vendored under `src/native/third_party/` and compiled into a single native addon, so no submodule init is required.

### Setting Up

This project uses [Volta](https://volta.sh/) to manage Node.js and Yarn versions. If you have Volta installed, it will automatically use the correct versions specified in `package.json`.

1. Clone the repository:

   ```bash
   git clone https://github.com/libraz/node-darts.git
   cd node-darts
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

   This will automatically build the native addon after installing dependencies.

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

This will compile the TypeScript code and build the native addon.

To clean the build artifacts:

```bash
yarn clean
```

### Testing

To run tests:

```bash
yarn test
```

To run tests with coverage:

```bash
yarn test:coverage
```

Tests are organised into tiers under `tests/`:

- `tests/unit/` — fast unit tests for the core TypeScript layer
- `tests/integration/` — exercises the native addon end-to-end
- `tests/perf/` — performance smoke + heavy benchmarks
- `tests/regression/` — pinned regression cases

Vitest runs with `pool: 'forks'` and `fileParallelism: false` so the process-global native handle table is isolated between files. See `vitest.config.ts`.

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

### C++

- Follow the Google C++ Style Guide.
- Use modern C++17 features where appropriate.
- Handle errors properly and propagate them to JavaScript.
- Avoid memory leaks by properly managing resources.

## Project Structure

```
node-darts/
├── scripts/                      # Build scripts
│   ├── postbuild-copy.cjs        # Copies non-TS assets into dist/ after build
│   └── install-build-tools.js    # Best-effort native toolchain bootstrap (Windows)
├── src/                          # Source code
│   ├── native/                   # C++ native code
│   │   ├── bindings.cpp          # Node-API bindings entry point + handle table
│   │   ├── bindings.d.ts         # TypeScript types for the `bindings` package
│   │   ├── dictionary.cpp        # Dictionary native dispatch (BackendDict)
│   │   ├── dictionary.h          # Dictionary header
│   │   ├── builder.cpp           # Builder native dispatch (BackendDict)
│   │   ├── builder.h             # Builder header
│   │   ├── backend.h             # BackendDict virtual interface + factory
│   │   ├── backend_factory.cpp   # MakeBackend() dispatcher
│   │   ├── backend_darts.cpp     # taku910/darts implementation of BackendDict
│   │   ├── backend_clone.cpp     # darts-clone implementation (namespace-rename trick)
│   │   ├── common.h              # Shared declarations (handle table, backend parser)
│   │   └── third_party/
│   │       ├── darts/            # taku910/darts (C++17-patched)
│   │       └── darts-clone/      # s-yata/darts-clone (vendored, header-only)
│   ├── core/                     # TypeScript core implementation
│   │   ├── types.ts              # Type definitions
│   │   ├── errors.ts             # Error definitions
│   │   ├── native.ts             # Native module TypeScript wrapper
│   │   ├── builder.ts            # Builder class
│   │   ├── dictionary.ts         # Dictionary class
│   │   └── utils.ts              # Utility functions
│   ├── text-darts.ts             # TextDarts class (Factory Method pattern)
│   ├── index.ts                  # Package entry point (CommonJS)
│   └── index.esm.ts              # ESM wrapper for the native module
├── tests/                        # Vitest test suite (tiered)
│   ├── unit/                     # Fast unit tests for the TS core
│   ├── integration/              # End-to-end native addon tests
│   ├── perf/                     # perf-smoke (always on) + performance (skipped)
│   └── regression/               # Pinned regression cases
├── examples/                     # Example code
│   ├── basic-usage.js
│   ├── dictionary-builder.js
│   ├── text-replacement.js
│   ├── text-replacement.ts
│   ├── auto-complete.js
│   ├── error-handling.js
│   ├── morphological-analysis.js
│   └── ja/                       # Japanese-localised examples
├── biome.json                    # Biome lint/format config
├── vitest.config.ts              # Vitest config (pool='forks', fileParallelism=false)
├── binding.gyp                   # node-gyp build (compiles both backends)
├── tsconfig.json                 # TypeScript base config
├── tsconfig.build.cjs.json       # CommonJS build config
└── tsconfig.build.esm.json       # ESM build config
```

## License

By contributing to node-darts, you agree that your contributions will be licensed under the project's MIT license.
