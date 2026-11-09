/**
 * Bridge to the WebAssembly core: instantiation, memory transfer, validation
 * of every public argument, and mapping of core status codes to errors.
 *
 * Status codes and result layouts mirror core/src/ffi.rs. Numbers are checked
 * here before they are narrowed to i32 at the boundary.
 */

import { BuildError, DartsError, InvalidDictionaryError } from '../errors.js';
import { DARTS_WASM_BASE64 } from '../generated/darts-wasm.js';
import type { Backend } from '../types.js';

/** Status codes returned by the core; mirrors core/src/ffi.rs. */
const Status = {
  OK: 0,
  ERR_HANDLE: -1,
  ERR_BACKEND: -2,
  ERR_EMPTY_KEYS: -3,
  ERR_NUL_IN_KEY: -4,
  ERR_NEGATIVE_VALUE: -5,
  ERR_BUILD_FAILED: -6,
  ERR_INVALID_DICTIONARY: -7,
  ERR_EMPTY_DICTIONARY: -8,
} as const;

/** Backend auto-detection code accepted by `darts_load`. */
const BACKEND_AUTO = -1;

const BACKEND_CODES: Record<Backend, number> = { darts: 0, clone: 1 };
const BACKEND_NAMES: readonly Backend[] = ['darts', 'clone'];

/** Bytes per array unit of each layout; mirrors the Rust backends. */
const UNIT_BYTES: Record<Backend, number> = { darts: 8, clone: 4 };

const INT32_MAX = 2147483647;

// The Node type definitions do not declare the WebAssembly global; type the
// part this module uses rather than pulling in the DOM library.
interface WasmGlobal {
  Module: new (bytes: Uint8Array) => object;
  Instance: new (module: object, imports: object) => { exports: unknown };
}
const { Module, Instance } = (globalThis as unknown as { WebAssembly: WasmGlobal }).WebAssembly;

interface CoreExports {
  memory: { buffer: ArrayBuffer };
  darts_alloc(len: number): number;
  darts_free(ptr: number, len: number): void;
  darts_scratch_ptr(): number;
  darts_out_ptr(): number;
  darts_create(backend: number): number;
  darts_destroy(handle: number): number;
  darts_backend(handle: number): number;
  darts_size(handle: number): number;
  darts_build(
    backend: number,
    keys: number,
    lengths: number,
    count: number,
    values: number
  ): number;
  darts_load(handle: number, image: number, len: number, backend: number): number;
  darts_save(handle: number): number;
  darts_exact(handle: number, key: number, len: number): number;
  darts_prefix(handle: number, key: number, len: number): number;
  darts_traverse_step(
    handle: number,
    key: number,
    len: number,
    nodePos: number,
    keyPos: number
  ): number;
}

const core = new Instance(new Module(Buffer.from(DARTS_WASM_BASE64, 'base64')), {})
  .exports as CoreExports;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const scratchPtr = core.darts_scratch_ptr();

// Reusable input buffer for search keys; grown on demand.
let keyPtr = 0;
let keyCap = 0;
let keyView: Uint8Array = new Uint8Array(0);

// Views over core memory, recreated only after the memory grows (which
// detaches the previous buffer).
let heapView: Uint8Array = new Uint8Array(core.memory.buffer);
let scratchView = new Int32Array(core.memory.buffer, scratchPtr, 3);

function heap(): Uint8Array {
  if (heapView.buffer !== core.memory.buffer) {
    heapView = new Uint8Array(core.memory.buffer);
    scratchView = new Int32Array(core.memory.buffer, scratchPtr, 3);
  }
  return heapView;
}

function scratch(index: number): number {
  heap();
  return scratchView[index];
}

function outBytes(len: number): Uint8Array {
  const ptr = core.darts_out_ptr();
  return heap().slice(ptr, ptr + len);
}

/** Runs `fn` with `bytes` copied into core memory that is freed afterwards. */
export function withBytes<T>(bytes: Uint8Array, fn: (ptr: number) => T): T {
  const ptr = core.darts_alloc(bytes.length);
  heap().set(bytes, ptr);
  try {
    return fn(ptr);
  } finally {
    core.darts_free(ptr, bytes.length);
  }
}

/**
 * Encodes `text` as UTF-8 into the shared key buffer, which the next call
 * overwrites, and returns its address and length.
 */
export function writeKey(text: string): { ptr: number; len: number } {
  const needed = text.length * 3;
  if (needed > keyCap) {
    if (keyCap > 0) core.darts_free(keyPtr, keyCap);
    keyCap = Math.max(needed, 256);
    keyPtr = core.darts_alloc(keyCap);
  }
  if (
    keyView.buffer !== core.memory.buffer ||
    keyView.byteOffset !== keyPtr ||
    keyView.length !== keyCap
  ) {
    keyView = heap().subarray(keyPtr, keyPtr + keyCap);
  }
  return { ptr: keyPtr, len: encoder.encodeInto(text, keyView).written };
}

/** Throws for a status every handle-taking call can return. */
function check(status: number): number {
  if (status === Status.ERR_HANDLE) throw disposedError();
  return status;
}

/** The error for any use of a disposed dictionary. */
export function disposedError(): DartsError {
  return new DartsError('the dictionary has been disposed', { code: 'ERR_DARTS_DISPOSED' });
}

// ---------------------------------------------------------------------------
// Argument validation shared by every public entry point.

/** Throws `TypeError` unless `value` is a string. */
export function checkString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string, got ${kindOf(value)}`);
  }
}

/** Returns `value` if it is a path `fs` accepts as a file name here. */
export function checkPath(value: unknown): string | URL {
  if (typeof value === 'string' || value instanceof URL) return value;
  throw new TypeError(`path must be a string or URL, got ${kindOf(value)}`);
}

/** Returns `value` if it is a Uint8Array (including Buffer). */
export function checkBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  throw new TypeError(`bytes must be a Uint8Array, got ${kindOf(value)}`);
}

/** Validates an options bag and returns its `backend`, if any. Unknown keys are ignored. */
export function backendOption(options: unknown): Backend | undefined {
  if (options === undefined) return undefined;
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError(`options must be an object, got ${kindOf(options)}`);
  }
  const { backend } = options as { backend?: unknown };
  if (backend === undefined || backend === 'darts' || backend === 'clone') return backend;
  throw new TypeError(`backend must be 'darts' or 'clone', got ${kindOf(backend)}`);
}

/** Normalizes a replacer to a lookup returning the replacement, or undefined to keep the match. */
export function checkReplacer(
  replacer: unknown
): (match: string, value: number) => string | undefined {
  let lookup: (match: string, value: number) => unknown;
  if (typeof replacer === 'function') {
    lookup = replacer as (match: string, value: number) => unknown;
  } else if (replacer instanceof Map) {
    lookup = (match) => replacer.get(match);
  } else if (replacer !== null && typeof replacer === 'object') {
    const table = replacer as Record<string, unknown>;
    lookup = (match) => (Object.hasOwn(table, match) ? table[match] : undefined);
  } else {
    throw new TypeError(`replacer must be a function, Map or object, got ${kindOf(replacer)}`);
  }
  const isFunction = typeof replacer === 'function';
  return (match, value) => {
    const replacement = lookup(match, value);
    if (typeof replacement === 'string') return replacement;
    if (replacement === undefined && !isFunction) return undefined;
    throw new TypeError(`replacement for '${match}' must be a string, got ${kindOf(replacement)}`);
  };
}

function checkValue(value: unknown, key: string): number {
  if (typeof value !== 'number') {
    throw new TypeError(`value of '${key}' must be a number, got ${kindOf(value)}`);
  }
  if (!Number.isInteger(value) || value < 0 || value > INT32_MAX) {
    throw new RangeError(`value of '${key}' must be an integer in 0..${INT32_MAX}, got ${value}`);
  }
  return value;
}

function kindOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value;
}

// ---------------------------------------------------------------------------
// Core operations.

/**
 * Validates `input` (see `Dictionary.build`), builds it and returns the new
 * handle.
 */
export function build(input: unknown, backend: Backend): number {
  if (
    typeof input === 'string' ||
    input === null ||
    typeof input !== 'object' ||
    typeof (input as Iterable<unknown>)[Symbol.iterator] !== 'function'
  ) {
    throw new TypeError(`input must be an iterable of keys or [key, value] pairs`);
  }
  const keys: Uint8Array[] = [];
  const values: number[] = [];
  let tuples: boolean | undefined;
  for (const entry of input as Iterable<unknown>) {
    let key: string;
    if (typeof entry === 'string') {
      if (tuples === true) throw new TypeError('input mixes keys with [key, value] pairs');
      tuples = false;
      key = entry;
    } else if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string') {
      if (tuples === false) throw new TypeError('input mixes keys with [key, value] pairs');
      tuples = true;
      key = entry[0];
      values.push(checkValue(entry[1], key));
    } else {
      throw new TypeError(
        `each input element must be a key or a [key, value] pair, got ${kindOf(entry)}`
      );
    }
    if (key.includes('\0')) throw new TypeError('keys must not contain NUL characters');
    keys.push(encoder.encode(key));
  }
  if (keys.length === 0) throw new RangeError('input must hold at least one key');

  const total = keys.reduce((sum, k) => sum + k.length, 0);
  const packed = new Uint8Array(total);
  const lengths = new Uint32Array(keys.length);
  let offset = 0;
  keys.forEach((k, i) => {
    packed.set(k, offset);
    lengths[i] = k.length;
    offset += k.length;
  });
  const code = BACKEND_CODES[backend];
  const handle = withBytes(packed, (keysPtr) =>
    withBytes(new Uint8Array(lengths.buffer), (lengthsPtr) =>
      tuples
        ? withBytes(new Uint8Array(Int32Array.from(values).buffer), (valuesPtr) =>
            core.darts_build(code, keysPtr, lengthsPtr, keys.length, valuesPtr)
          )
        : core.darts_build(code, keysPtr, lengthsPtr, keys.length, 0)
    )
  );
  if (handle >= 0) return handle;
  if (handle === Status.ERR_BUILD_FAILED) {
    const reason = decoder.decode(outBytes(scratch(0)));
    throw new BuildError(reason || 'the builder rejected the keys');
  }
  // The checks above rule out every other status.
  throw new Error(`unexpected core status ${handle} from build`);
}

/** Loads an image into a new handle; `backend` undefined detects the layout. */
export function load(image: Uint8Array, backend: Backend | undefined): number {
  const handle = core.darts_create(BACKEND_CODES.darts);
  const code = backend === undefined ? BACKEND_AUTO : BACKEND_CODES[backend];
  const status = withBytes(image, (ptr) => core.darts_load(handle, ptr, image.length, code));
  if (status === Status.OK) return handle;
  core.darts_destroy(handle);
  const layout = backend === undefined ? 'any supported' : `the '${backend}'`;
  throw new InvalidDictionaryError(`the bytes are not a dictionary image in ${layout} format`);
}

export function destroy(handle: number): void {
  core.darts_destroy(handle);
}

export function backendOf(handle: number): Backend {
  return BACKEND_NAMES[check(core.darts_backend(handle))];
}

/** Size of the image `toBytes` would return. */
export function byteLength(handle: number, backend: Backend): number {
  return check(core.darts_size(handle)) * UNIT_BYTES[backend];
}

export function toBytes(handle: number): Uint8Array {
  return outBytes(check(core.darts_save(handle)));
}

/** Exact-match value of the encoded key at `ptr`, or -1. */
export function exact(handle: number, ptr: number, len: number): number {
  check(core.darts_exact(handle, ptr, len));
  return scratch(0);
}

/** Common-prefix matches of the encoded text at `ptr` as `[value, byteLength]` pairs, shortest first. */
export function prefix(handle: number, ptr: number, len: number): Int32Array {
  const count = check(core.darts_prefix(handle, ptr, len));
  const bytes = outBytes(count * 8);
  return new Int32Array(bytes.buffer, bytes.byteOffset, count * 2);
}

/** Cursor of a byte-wise traversal. */
export interface Cursor {
  node: number;
  pos: number;
}

/**
 * Advances `cursor` by one byte of the encoded text at `ptr`. Returns the
 * value ending there (-1 for none), or -2 when the byte leaves the trie.
 */
export function step(handle: number, ptr: number, len: number, cursor: Cursor): number {
  const status = check(core.darts_traverse_step(handle, ptr, len, cursor.node, cursor.pos));
  if (status !== Status.OK) return -2;
  const value = scratch(0);
  if (value === -2) return -2;
  cursor.node = scratch(1) >>> 0;
  cursor.pos = scratch(2) >>> 0;
  return value;
}
