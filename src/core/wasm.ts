import { DARTS_WASM_BASE64 } from '../generated/darts-wasm.js';

/** Status codes returned by the core; mirrors core/src/ffi.rs. */
export const Status = {
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
export const BACKEND_AUTO = -1;

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

/** Copies `bytes` into fresh core memory; the caller frees it. */
function copyIn(bytes: Uint8Array): number {
  const ptr = core.darts_alloc(bytes.length);
  heap().set(bytes, ptr);
  return ptr;
}

function withBuffer<T>(bytes: Uint8Array, fn: (ptr: number) => T): T {
  const ptr = copyIn(bytes);
  try {
    return fn(ptr);
  } finally {
    core.darts_free(ptr, bytes.length);
  }
}

/** Encodes `key` as UTF-8 into the shared key buffer and returns its length. */
function writeKey(key: string): number {
  const needed = key.length * 3;
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
  return encoder.encodeInto(key, keyView).written;
}

function scratch(index: number): number {
  heap();
  return scratchView[index];
}

function outBytes(len: number): Uint8Array {
  const ptr = core.darts_out_ptr();
  return heap().slice(ptr, ptr + len);
}

/** Result of one traversal step; `value`/`node`/`key` are meaningful when `status` is OK. */
export type StepResult = { status: number; value: number; node: number; key: number };

/** Thin typed facade over the core exports; status codes are left to the caller. */
export const wasmCore = {
  create: (backend: number): number => core.darts_create(backend),
  destroy: (handle: number): number => core.darts_destroy(handle),
  backend: (handle: number): number => core.darts_backend(handle),
  size: (handle: number): number => core.darts_size(handle),

  build(backend: number, keys: Uint8Array[], values: Int32Array | undefined): number {
    const total = keys.reduce((sum, k) => sum + k.length, 0);
    const packed = new Uint8Array(total);
    const lengths = new Uint32Array(keys.length);
    let offset = 0;
    keys.forEach((k, i) => {
      packed.set(k, offset);
      lengths[i] = k.length;
      offset += k.length;
    });
    return withBuffer(packed, (keysPtr) =>
      withBuffer(new Uint8Array(lengths.buffer), (lengthsPtr) =>
        values === undefined
          ? core.darts_build(backend, keysPtr, lengthsPtr, keys.length, 0)
          : withBuffer(new Uint8Array(values.buffer), (valuesPtr) =>
              core.darts_build(backend, keysPtr, lengthsPtr, keys.length, valuesPtr)
            )
      )
    );
  },

  load(handle: number, image: Uint8Array, backend: number): number {
    return withBuffer(image, (ptr) => core.darts_load(handle, ptr, image.length, backend));
  },

  /** The saved image, or a negative status. */
  save(handle: number): Uint8Array | number {
    const len = core.darts_save(handle);
    return len < 0 ? len : outBytes(len);
  },

  /** `[status, value]`. */
  exact(handle: number, key: string): [number, number] {
    const len = writeKey(key);
    const status = core.darts_exact(handle, keyPtr, len);
    return [status, status === Status.OK ? scratch(0) : 0];
  },

  /** The matched values, or a negative status. */
  prefix(handle: number, key: string): number[] | number {
    const len = writeKey(key);
    const count = core.darts_prefix(handle, keyPtr, len);
    if (count < 0) return count;
    const bytes = outBytes(count * 4);
    return Array.from(new Int32Array(bytes.buffer, bytes.byteOffset, count));
  },

  /**
   * Runs `fn` with `key` encoded into its own core buffer, so nested searches
   * from inside `fn` cannot overwrite it.
   */
  withKey<T>(key: string, fn: (ptr: number, len: number) => T): T {
    const bytes = encoder.encode(key);
    return withBuffer(bytes, (ptr) => fn(ptr, bytes.length));
  },

  /** One traversal step over a key placed by `withKey`. */
  step(handle: number, ptr: number, len: number, nodePos: number, keyPos: number): StepResult {
    const status = core.darts_traverse_step(handle, ptr, len, nodePos, keyPos);
    if (status !== Status.OK) return { status, value: 0, node: 0, key: 0 };
    return { status, value: scratch(0), node: scratch(1) >>> 0, key: scratch(2) >>> 0 };
  },
};
