//! C ABI exported from the WebAssembly module to the JavaScript binding.
//!
//! Dictionaries live in a handle table; a freed slot is reused by the next
//! allocation. Every entry point returns an `i32`: a non-negative result
//! (handle, length, count or [`OK`]) or one of the negative `ERR_*` codes,
//! which the JavaScript binding mirrors. Scalar results are written to a fixed
//! scratch area ([`darts_scratch_ptr`]) and variable-length results to an
//! output buffer ([`darts_out_ptr`]) that the next call may move.
//!
//! Result layouts: [`darts_prefix`] returns the match count `n` and writes
//! `[value, byte_len]` `i32` pairs (`2n` of them); [`darts_build`] failing with
//! [`ERR_BUILD_FAILED`] writes the UTF-8 reason to the output buffer and its
//! byte length to scratch slot 0.
//!
//! The JavaScript side owns narrowing: it converts numbers to `i32` with
//! range and integrality checks before they cross this boundary.

use std::sync::{Mutex, MutexGuard, PoisonError};

use crate::dict::{Backend, Dictionary, Error};

/// Success.
pub const OK: i32 = 0;
/// No dictionary is registered under the handle.
pub const ERR_HANDLE: i32 = -1;
/// The backend code is neither 0 (darts) nor 1 (clone).
pub const ERR_BACKEND: i32 = -2;
/// `build` was given no keys.
pub const ERR_EMPTY_KEYS: i32 = -3;
/// A key contains a NUL byte.
pub const ERR_NUL_IN_KEY: i32 = -4;
/// A value is negative.
pub const ERR_NEGATIVE_VALUE: i32 = -5;
/// The upstream builder rejected the input.
pub const ERR_BUILD_FAILED: i32 = -6;
/// The bytes are not a dictionary image for the requested backend.
pub const ERR_INVALID_DICTIONARY: i32 = -7;
/// The dictionary holds no trie, so there is nothing to save or traverse.
pub const ERR_EMPTY_DICTIONARY: i32 = -8;

const BACKEND_AUTO: i32 = -1;

struct State {
    dictionaries: Vec<Option<Dictionary>>,
    out: Vec<u8>,
}

static STATE: Mutex<State> = Mutex::new(State {
    dictionaries: Vec::new(),
    out: Vec::new(),
});
static SCRATCH: Mutex<[i32; 3]> = Mutex::new([0; 3]);

fn state() -> MutexGuard<'static, State> {
    STATE.lock().unwrap_or_else(PoisonError::into_inner)
}

fn status(error: &Error) -> i32 {
    match error {
        Error::EmptyKeys => ERR_EMPTY_KEYS,
        Error::NulInKey => ERR_NUL_IN_KEY,
        Error::NegativeValue => ERR_NEGATIVE_VALUE,
        Error::LengthMismatch | Error::BuildFailed(_) => ERR_BUILD_FAILED,
        Error::InvalidDictionary => ERR_INVALID_DICTIONARY,
    }
}

fn backend(code: i32) -> Option<Backend> {
    match code {
        0 => Some(Backend::Darts),
        1 => Some(Backend::Clone),
        _ => None,
    }
}

impl State {
    fn get(&self, handle: u32) -> Option<&Dictionary> {
        self.dictionaries.get(handle as usize)?.as_ref()
    }

    fn slot(&mut self, handle: u32) -> Option<&mut Option<Dictionary>> {
        self.dictionaries
            .get_mut(handle as usize)
            .filter(|slot| slot.is_some())
    }

    fn insert(&mut self, dict: Dictionary) -> i32 {
        if let Some(i) = self.dictionaries.iter().position(Option::is_none) {
            self.dictionaries[i] = Some(dict);
            return i as i32;
        }
        self.dictionaries.push(Some(dict));
        (self.dictionaries.len() - 1) as i32
    }

    fn emit_matches(&mut self, matches: &[(i32, usize)]) -> i32 {
        self.out.clear();
        for &(value, len) in matches {
            self.out.extend(value.to_le_bytes());
            self.out.extend((len as i32).to_le_bytes());
        }
        matches.len() as i32
    }

    fn emit_reason(&mut self, reason: &str) {
        self.out.clear();
        self.out.extend_from_slice(reason.as_bytes());
        set_scratch([reason.len() as i32, 0, 0]);
    }
}

fn set_scratch(values: [i32; 3]) {
    *SCRATCH.lock().unwrap_or_else(PoisonError::into_inner) = values;
}

/// # Safety
/// `ptr` must be valid for `len` bytes, or `len` must be 0.
unsafe fn bytes<'a>(ptr: *const u8, len: usize) -> &'a [u8] {
    if len == 0 {
        &[]
    } else {
        // SAFETY: guaranteed by the caller.
        unsafe { std::slice::from_raw_parts(ptr, len) }
    }
}

/// Allocates `len` bytes for the caller to fill; release with [`darts_free`].
#[unsafe(no_mangle)]
pub extern "C" fn darts_alloc(len: usize) -> *mut u8 {
    let mut buf = std::mem::ManuallyDrop::new(Vec::<u8>::with_capacity(len));
    buf.as_mut_ptr()
}

/// Releases memory from [`darts_alloc`].
///
/// # Safety
/// `ptr` and `len` must come from one [`darts_alloc`] call, freed once.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn darts_free(ptr: *mut u8, len: usize) {
    // SAFETY: guaranteed by the caller.
    drop(unsafe { Vec::from_raw_parts(ptr, 0, len) });
}

/// Address of the three-slot `i32` scratch area. It never moves.
#[unsafe(no_mangle)]
pub extern "C" fn darts_scratch_ptr() -> *const i32 {
    SCRATCH
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .as_ptr()
}

/// Address of the output buffer written by the last variable-length result.
#[unsafe(no_mangle)]
pub extern "C" fn darts_out_ptr() -> *const u8 {
    state().out.as_ptr()
}

/// Allocates an empty dictionary and returns its handle.
#[unsafe(no_mangle)]
pub extern "C" fn darts_create(backend_code: i32) -> i32 {
    match backend(backend_code) {
        Some(b) => state().insert(Dictionary::empty(b)),
        None => ERR_BACKEND,
    }
}

/// Frees a dictionary; its handle becomes available for reuse.
#[unsafe(no_mangle)]
pub extern "C" fn darts_destroy(handle: u32) -> i32 {
    match state().slot(handle) {
        Some(slot) => {
            *slot = None;
            OK
        }
        None => ERR_HANDLE,
    }
}

/// Backend code (0 darts, 1 clone) of a dictionary.
#[unsafe(no_mangle)]
pub extern "C" fn darts_backend(handle: u32) -> i32 {
    match state().get(handle).map(Dictionary::backend) {
        Some(Backend::Darts) => 0,
        Some(Backend::Clone) => 1,
        None => ERR_HANDLE,
    }
}

/// Number of units in a dictionary's array.
#[unsafe(no_mangle)]
pub extern "C" fn darts_size(handle: u32) -> i32 {
    state().get(handle).map_or(ERR_HANDLE, |d| d.size() as i32)
}

/// Builds a dictionary from `count` keys packed back to back in `keys`, the
/// byte length of each in `lengths`, and an optional `values` array (null
/// for "index of the key"). Returns the new handle.
///
/// # Safety
/// `keys` must be valid for the sum of `lengths`, `lengths` for `count`
/// entries, and `values` null or valid for `count` entries.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn darts_build(
    backend_code: i32,
    keys: *const u8,
    lengths: *const u32,
    count: usize,
    values: *const i32,
) -> i32 {
    let Some(b) = backend(backend_code) else {
        return ERR_BACKEND;
    };
    if count == 0 {
        return ERR_EMPTY_KEYS;
    }
    // SAFETY: guaranteed by the caller.
    let lengths = unsafe { std::slice::from_raw_parts(lengths, count) };
    let total = lengths.iter().map(|&n| n as usize).sum();
    // SAFETY: guaranteed by the caller.
    let packed = unsafe { bytes(keys, total) };
    let mut split = Vec::with_capacity(count);
    let mut offset = 0;
    for &n in lengths {
        split.push(&packed[offset..offset + n as usize]);
        offset += n as usize;
    }
    // SAFETY: guaranteed by the caller.
    let values = (!values.is_null()).then(|| unsafe { std::slice::from_raw_parts(values, count) });
    match Dictionary::build(b, &split, values) {
        Ok(dict) => state().insert(dict),
        Err(e) => {
            let code = status(&e);
            if code == ERR_BUILD_FAILED {
                // JS passes equal-length arrays, so a mismatch cannot occur.
                debug_assert!(e != Error::LengthMismatch, "length mismatch from JS");
                let reason = match e {
                    Error::BuildFailed(reason) => reason,
                    _ => "",
                };
                state().emit_reason(reason);
            }
            code
        }
    }
}

/// Replaces a dictionary's contents with an image; `backend_code` -1
/// auto-detects. On failure the dictionary is left unchanged.
///
/// # Safety
/// `image` must be valid for `len` bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn darts_load(
    handle: u32,
    image: *const u8,
    len: usize,
    backend_code: i32,
) -> i32 {
    let requested = match backend_code {
        BACKEND_AUTO => None,
        code => match backend(code) {
            Some(b) => Some(b),
            None => return ERR_BACKEND,
        },
    };
    let mut state = state();
    let Some(slot) = state.slot(handle) else {
        return ERR_HANDLE;
    };
    // SAFETY: guaranteed by the caller.
    match Dictionary::load(unsafe { bytes(image, len) }, requested) {
        Ok(dict) => {
            *slot = Some(dict);
            OK
        }
        Err(e) => status(&e),
    }
}

/// Serializes a dictionary into the output buffer and returns its length.
#[unsafe(no_mangle)]
pub extern "C" fn darts_save(handle: u32) -> i32 {
    let mut state = state();
    let Some(dict) = state.get(handle) else {
        return ERR_HANDLE;
    };
    let Some(image) = dict.to_bytes() else {
        return ERR_EMPTY_DICTIONARY;
    };
    let len = image.len() as i32;
    state.out = image;
    len
}

/// Exact-match search; the value (or -1) goes to scratch slot 0.
///
/// # Safety
/// `key` must be valid for `len` bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn darts_exact(handle: u32, key: *const u8, len: usize) -> i32 {
    let state = state();
    let Some(dict) = state.get(handle) else {
        return ERR_HANDLE;
    };
    // SAFETY: guaranteed by the caller.
    set_scratch([dict.exact_match_search(unsafe { bytes(key, len) }), 0, 0]);
    OK
}

/// Common-prefix search; returns the match count `n`, and the output buffer
/// holds `[value, byte_len]` `i32` pairs for the matches, shortest first.
///
/// # Safety
/// `key` must be valid for `len` bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn darts_prefix(handle: u32, key: *const u8, len: usize) -> i32 {
    let mut state = state();
    let Some(dict) = state.get(handle) else {
        return ERR_HANDLE;
    };
    // SAFETY: guaranteed by the caller.
    let found = dict.common_prefix_search(unsafe { bytes(key, len) });
    state.emit_matches(&found)
}

/// Advances one byte along `key`; scratch receives `[value, node_pos,
/// key_pos]`. Returns [`ERR_EMPTY_DICTIONARY`] when there is no trie.
///
/// # Safety
/// `key` must be valid for `len` bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn darts_traverse_step(
    handle: u32,
    key: *const u8,
    len: usize,
    node_pos: u32,
    key_pos: u32,
) -> i32 {
    let state = state();
    let Some(dict) = state.get(handle) else {
        return ERR_HANDLE;
    };
    // SAFETY: guaranteed by the caller.
    let key = unsafe { bytes(key, len) };
    match dict.traverse_one(key, node_pos as usize, key_pos as usize) {
        Some(step) => {
            set_scratch([step.value, step.node_pos as i32, step.key_pos as i32]);
            OK
        }
        None => ERR_EMPTY_DICTIONARY,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn out_bytes() -> Vec<u8> {
        let len = SCRATCH.lock().unwrap()[0] as usize;
        state().out[..len].to_vec()
    }

    #[test]
    fn build_failure_reports_reason_and_prefix_emits_pairs() {
        let keys = b"";
        let lengths = [0u32];
        // SAFETY: one zero-length key; `keys` is never read.
        let code = unsafe { darts_build(1, keys.as_ptr(), lengths.as_ptr(), 1, std::ptr::null()) };
        assert_eq!(code, ERR_BUILD_FAILED);
        assert_eq!(
            String::from_utf8(out_bytes()).unwrap(),
            "failed to insert key: zero-length key"
        );

        let packed = b"aab";
        let lengths = [1u32, 2];
        // SAFETY: `packed` holds 1 + 2 bytes for two keys.
        let handle =
            unsafe { darts_build(0, packed.as_ptr(), lengths.as_ptr(), 2, std::ptr::null()) };
        assert!(handle >= 0);
        let query = b"abx";
        // SAFETY: `query` is valid for its length.
        let n = unsafe { darts_prefix(handle as u32, query.as_ptr(), query.len()) };
        assert_eq!(n, 2);
        let out = state().out.clone();
        let pairs: Vec<i32> = out
            .as_chunks::<4>()
            .0
            .iter()
            .map(|c| i32::from_le_bytes(*c))
            .collect();
        assert_eq!(pairs, [0, 1, 1, 2]);
        assert_eq!(darts_destroy(handle as u32), OK);
    }
}
