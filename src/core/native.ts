import * as fs from 'node:fs';
import { BuildError, DartsError, FileNotFoundError, InvalidDictionaryError } from './errors.js';
import type { Backend, DartsNative, TraverseCallback } from './types.js';
import { BACKEND_AUTO, Status, wasmCore } from './wasm.js';

const INT32_MAX = 2147483647;

// Resolve the default backend used when callers don't pass one explicitly.
// Set NODE_DARTS_DEFAULT_BACKEND=clone in CI to exercise the same test suite
// against the darts-clone backend without rewriting individual tests.
function resolveDefaultBackend(): Backend {
  return process.env.NODE_DARTS_DEFAULT_BACKEND === 'clone' ? 'clone' : 'darts';
}
const defaultBackend: Backend = resolveDefaultBackend();

const BACKEND_CODES: Record<Backend, number> = { darts: 0, clone: 1 };
const BACKEND_NAMES: Backend[] = ['darts', 'clone'];

function backendCode(backend: Backend | undefined | null, fallback: Backend): number {
  const name = backend ?? fallback;
  if (!Object.hasOwn(BACKEND_CODES, name)) {
    throw new TypeError("backend must be 'darts' or 'clone'");
  }
  return BACKEND_CODES[name];
}

/** Validates a handle before it is narrowed to u32 at the boundary. */
function handleArg(handle: number): number {
  if (!Number.isInteger(handle) || handle < 0 || handle > 0xffffffff) {
    throw new DartsError('Invalid dictionary handle');
  }
  return handle;
}

function checkKey(key: unknown): asserts key is string {
  if (typeof key !== 'string') {
    throw new DartsError('Search key must be a string');
  }
}

/** Throws for a negative status shared by every handle-taking call. */
function check(status: number): number {
  if (status === Status.ERR_HANDLE) {
    throw new DartsError('Invalid dictionary handle');
  }
  return status;
}

const encoder = new TextEncoder();

/**
 * Wrapper over the WebAssembly core.
 * Adds input validation and error mapping, and provides a TypeScript-friendly interface.
 */
export class DartsNativeWrapper implements DartsNative {
  /**
   * Creates a dictionary object
   * @param backend backend kind to allocate (defaults to 'darts')
   * @returns dictionary handle
   */
  createDictionary(backend?: Backend): number {
    try {
      return wasmCore.create(backendCode(backend, defaultBackend));
    } catch (error) {
      throw new DartsError(`Failed to create dictionary: ${(error as Error).message}`);
    }
  }

  /**
   * Destroys a dictionary object. Destroying an unknown handle is a no-op.
   * @param handle dictionary handle
   */
  destroyDictionary(handle: number): void {
    wasmCore.destroy(handleArg(handle));
  }

  /**
   * Loads a dictionary file
   * @param handle dictionary handle
   * @param filePath path to the dictionary file
   * @param backend if provided, only that backend is used; otherwise the
   *   loader auto-detects (darts-clone first, falling back to taku910)
   * @returns true; failures throw
   */
  loadDictionary(handle: number, filePath: string, backend?: Backend): boolean {
    if (!fs.existsSync(filePath)) {
      throw new FileNotFoundError(filePath);
    }
    let image: Uint8Array;
    try {
      image = fs.readFileSync(filePath);
    } catch (error) {
      throw new InvalidDictionaryError(
        `Failed to read dictionary from ${filePath}: ${(error as Error).message}`
      );
    }
    return this.loadImage(handle, image, filePath, backend);
  }

  /**
   * Loads a dictionary file without blocking the event loop while reading it
   * @param handle dictionary handle
   * @param filePath path to the dictionary file
   * @param backend see {@link DartsNativeWrapper.loadDictionary}
   * @returns true; failures reject
   */
  async loadDictionaryAsync(handle: number, filePath: string, backend?: Backend): Promise<boolean> {
    let image: Uint8Array;
    try {
      image = await fs.promises.readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError(filePath);
      }
      throw new InvalidDictionaryError(
        `Failed to read dictionary from ${filePath}: ${(error as Error).message}`
      );
    }
    return this.loadImage(handle, image, filePath, backend);
  }

  private loadImage(
    handle: number,
    image: Uint8Array,
    filePath: string,
    backend: Backend | undefined
  ): boolean {
    let code: number;
    try {
      code =
        backend === undefined || backend === null ? BACKEND_AUTO : backendCode(backend, 'darts');
    } catch (error) {
      throw new InvalidDictionaryError((error as Error).message);
    }
    const status = check(wasmCore.load(handleArg(handle), image, code));
    if (status !== Status.OK) {
      throw new InvalidDictionaryError(`Failed to load dictionary from ${filePath}`);
    }
    return true;
  }

  /**
   * Saves a dictionary file
   * @param handle dictionary handle
   * @param filePath destination file path
   * @returns true; failures throw
   */
  saveDictionary(handle: number, filePath: string): boolean {
    const image = wasmCore.save(handleArg(handle));
    if (typeof image === 'number') {
      check(image);
      throw new DartsError(`Failed to save dictionary to ${filePath}: dictionary is empty`);
    }
    try {
      fs.writeFileSync(filePath, image);
    } catch (error) {
      throw new DartsError(`Failed to save dictionary to ${filePath}: ${(error as Error).message}`);
    }
    return true;
  }

  /**
   * Performs an exact match search
   * @param handle dictionary handle
   * @param key search key
   * @returns the corresponding value if found, -1 otherwise
   */
  exactMatchSearch(handle: number, key: string): number {
    checkKey(key);
    const [status, value] = wasmCore.exact(handleArg(handle), key);
    check(status);
    return value;
  }

  /**
   * Performs a common prefix search
   * @param handle dictionary handle
   * @param key search key
   * @returns array of found values, shortest prefix first
   */
  commonPrefixSearch(handle: number, key: string): number[] {
    checkKey(key);
    const result = wasmCore.prefix(handleArg(handle), key);
    if (typeof result === 'number') {
      check(result);
      return [];
    }
    return result;
  }

  /**
   * Traverses the trie one UTF-8 byte at a time, calling `callback` per step
   * until it returns false or the key leaves the trie
   * @param handle dictionary handle
   * @param key search key
   * @param callback callback function
   */
  traverse(handle: number, key: string, callback: TraverseCallback): void {
    if (typeof callback !== 'function') {
      throw new DartsError('Failed to traverse: callback must be a function');
    }
    checkKey(key);
    wasmCore.withKey(key, (ptr, len) => {
      let node = 0;
      let pos = 0;
      while (pos < len) {
        const step = wasmCore.step(handleArg(handle), ptr, len, node, pos);
        if (check(step.status) === Status.ERR_EMPTY_DICTIONARY) return;
        const advanced = step.key !== pos;
        node = step.node;
        pos = step.key;
        let proceed: boolean | undefined;
        try {
          proceed = callback({ node, key: pos, value: step.value });
        } catch (error) {
          throw new DartsError(`Failed to traverse: ${(error as Error).message}`);
        }
        if (proceed === false || step.value === -2 || !advanced) return;
      }
    });
  }

  /**
   * Builds a Double-Array
   * @param keys array of keys
   * @param values array of values (indices are used if omitted)
   * @param backend backend kind to build with (defaults to 'darts')
   * @returns dictionary handle
   */
  build(keys: string[], values?: number[], backend?: Backend): number {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new BuildError('Empty keys array');
    }
    for (const key of keys) {
      if (typeof key !== 'string') {
        throw new BuildError('All keys must be strings');
      }
    }
    let packedValues: Int32Array | undefined;
    if (values !== undefined) {
      if (!Array.isArray(values) || values.length !== keys.length) {
        throw new BuildError('Values array length must match keys array length');
      }
      for (const value of values) {
        if (typeof value !== 'number') {
          throw new BuildError('All values must be numbers');
        }
        // Negative values collide with the -1 "not found" result.
        if (!Number.isInteger(value) || value < 0 || value > INT32_MAX) {
          throw new BuildError('All values must be non-negative 32-bit integers');
        }
      }
      packedValues = Int32Array.from(values);
    }
    let code: number;
    try {
      code = backendCode(backend, defaultBackend);
    } catch (error) {
      throw new BuildError((error as Error).message);
    }

    const handle = wasmCore.build(
      code,
      keys.map((key) => encoder.encode(key)),
      packedValues
    );
    if (handle >= 0) return handle;
    switch (handle) {
      case Status.ERR_NUL_IN_KEY:
        throw new BuildError('All keys must not contain NUL characters');
      case Status.ERR_NEGATIVE_VALUE:
        throw new BuildError('All values must be non-negative 32-bit integers');
      default:
        throw new BuildError('Failed to build dictionary');
    }
  }

  /**
   * Gets the size of the dictionary: the number of units in its array, not
   * the number of keys
   * @param handle dictionary handle
   * @returns size of the dictionary
   */
  size(handle: number): number {
    return check(wasmCore.size(handleArg(handle)));
  }

  /**
   * Returns the backend kind currently held by the handle.
   */
  getBackend(handle: number): Backend {
    return BACKEND_NAMES[check(wasmCore.backend(handleArg(handle)))];
  }
}

// Export singleton instance
export const dartsNative = new DartsNativeWrapper();
