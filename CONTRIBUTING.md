# Contributing to node-darts

Thank you for your interest in contributing to node-darts! This document provides guidelines and instructions for contributing to this project.

## Development Environment Setup

### Prerequisites

- Node.js v20.0.0 or later
- Yarn v3.6.4 or later
- C++ compiler with C++17 support
  - Windows: Visual Studio 2019 or later with C++ build tools
  - macOS: Xcode Command Line Tools
  - Linux: GCC 7 or later, build-essential

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

#### Performance Tests

Performance tests are skipped by default because they take a long time to run. To run performance tests manually:

1. Open `tests/performance.test.ts`
2. Change `describe.skip('Performance Tests', () => {` to `describe('Performance Tests', () => {`
3. Run the performance tests:

```bash
yarn test tests/performance.test.ts
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

### Linting

To lint the code:

```bash
yarn lint
```

To automatically fix linting issues:

```bash
yarn format
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

- Follow the Airbnb TypeScript style guide.
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
├── src/                          # Source code
│   ├── native/                   # C++ native code
│   │   ├── bindings.cpp          # Node-API bindings entry point
│   │   ├── dictionary.cpp        # Dictionary native implementation
│   │   ├── dictionary.h          # Dictionary header
│   │   ├── builder.cpp           # Builder native implementation
│   │   ├── builder.h             # Builder header
│   │   ├── common.h              # Common definitions
│   │   └── third_party/
│   │       └── darts/
│   │           ├── darts.h       # Modified darts.h (C++17 compatible)
│   │           └── darts.cpp     # Original darts.cpp
│   ├── core/                     # TypeScript core implementation
│   │   ├── types.ts              # Type definitions
│   │   ├── errors.ts             # Error definitions
│   │   ├── native.ts             # Native module TypeScript wrapper
│   │   ├── builder.ts            # Builder class
│   │   ├── dictionary.ts         # Dictionary class
│   │   └── utils.ts              # Utility functions
│   ├── text-darts.ts             # TextDarts class implementation (uses Factory Method pattern)
│   └── index.ts                  # Package entry point
├── tests/                        # Test directory
│   ├── dictionary.test.ts        # Dictionary tests
│   ├── builder.test.ts           # Builder tests
│   ├── text-darts.test.ts        # TextDarts tests
│   ├── replaceWords.test.ts      # Text replacement functionality tests
│   ├── advanced.test.ts          # Advanced feature tests
│   ├── performance.test.ts       # Performance tests
│   └── integration.test.ts       # Integration tests
└── examples/                     # Example code
    ├── basic-usage.js            # Basic usage example
    ├── dictionary-builder.js     # Dictionary builder example
    ├── text-replacement.js       # Text replacement example
    ├── text-replacement.ts       # TypeScript text replacement example
    ├── auto-complete.js          # Auto-complete example
    ├── error-handling.js         # Error handling example
    ├── morphological-analysis.js # Morphological analysis example
    └── ja/                       # Japanese examples
        ├── README.md             # Japanese examples README
        ├── auto-complete.js      # Japanese auto-complete example
        ├── error-handling.js     # Japanese error handling example
        └── morphological-analysis.js # Japanese morphological analysis example
```

## License

By contributing to node-darts, you agree that your contributions will be licensed under the project's MIT license.
