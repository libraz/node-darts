import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 30000,
    // The WebAssembly core's handle table is module-global. Use child
    // processes per file so each test file starts with a clean table.
    pool: 'forks',
    isolate: true,
    // Tests share /tmp dir naming based on Date.now() and some assert handle
    // reuse in the module-global handle table; running files sequentially
    // avoids cross-file races without rewriting every fixture.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.d.ts', 'src/**/index.ts', 'src/**/index.esm.ts'],
      thresholds: {
        branches: 60,
        functions: 95,
        lines: 85,
        statements: 85,
      },
    },
  },
});
