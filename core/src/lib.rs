//! Double-array trie core for node-darts.
//!
//! Two on-disk formats are supported side by side and selected per dictionary:
//! [`darts`] reads and writes the taku910 Darts 0.32 layout (8-byte base/check
//! units) and [`clone`] the darts-clone layout (4-byte packed units). Both
//! builders reproduce their upstream output byte for byte, so dictionaries are
//! interchangeable with files produced by the C++ libraries.
//!
//! [`dict`] is the backend-neutral layer: input validation, key ordering,
//! format auto-detection. `ffi` exposes it to JavaScript as a C ABI over a
//! handle table; the crate is compiled to `wasm32-unknown-unknown` for that.

pub mod clone;
pub mod darts;
pub mod dict;
pub mod ffi;
