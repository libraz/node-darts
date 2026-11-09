import type { Backend } from '../types.js';

let defaultBackend: Backend = 'darts';

/** Backend `Dictionary.build` uses when the options name none. */
export function getDefaultBackend(): Backend {
  return defaultBackend;
}

/** Changes the build default; lets the test suite run against either backend. */
export function setDefaultBackend(backend: Backend): void {
  if (backend !== 'darts' && backend !== 'clone') {
    throw new TypeError("backend must be 'darts' or 'clone'");
  }
  defaultBackend = backend;
}
