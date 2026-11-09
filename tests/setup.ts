import { setDefaultBackend } from '../src/internal/defaults';

// Runs the same suite against either backend: NODE_DARTS_TEST_BACKEND picks
// the backend Dictionary.build uses when a test does not name one.
const backend = process.env.NODE_DARTS_TEST_BACKEND;
if (backend === 'darts' || backend === 'clone') {
  setDefaultBackend(backend);
} else if (backend !== undefined) {
  throw new Error(`NODE_DARTS_TEST_BACKEND must be 'darts' or 'clone', got '${backend}'`);
}
