//! Backend-neutral dictionary: build-input contract, format auto-detection and
//! the search surface shared by both double-array layouts.

use crate::{clone, darts};

/// Double-array implementation a dictionary is held in.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Backend {
    /// taku910 Darts 0.32 layout.
    Darts,
    /// darts-clone layout.
    Clone,
}

/// Failure of a dictionary operation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    /// `build` was given no keys.
    EmptyKeys,
    /// A key contains a NUL byte, which both layouts use as the terminator.
    NulInKey,
    /// A value is negative; negative results are reserved for "not found".
    NegativeValue,
    /// `keys` and `values` differ in length.
    LengthMismatch,
    /// The upstream builder rejected the input.
    BuildFailed(&'static str),
    /// No backend accepts the bytes as a dictionary image.
    InvalidDictionary,
}

#[derive(Debug, Clone)]
enum Array {
    Darts(darts::DoubleArray),
    Clone(clone::DoubleArray),
}

/// A double-array dictionary held in one of the two layouts.
#[derive(Debug, Clone)]
pub struct Dictionary {
    array: Array,
}

/// One step of [`Dictionary::traverse_one`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Step {
    /// Value at the reached node, -1 when it is not terminal, -2 when the
    /// next byte has no edge (positions are then left unchanged).
    pub value: i32,
    /// Node position after the step.
    pub node_pos: usize,
    /// Key position after the step.
    pub key_pos: usize,
}

/// Validates build input and orders it the way both builders require:
/// ascending by bytes, first occurrence of a duplicated key kept. An omitted
/// value is the key's index in `keys`.
///
/// # Errors
/// [`Error::EmptyKeys`], [`Error::LengthMismatch`], [`Error::NulInKey`] or
/// [`Error::NegativeValue`].
pub fn prepare_keys<'a>(
    keys: &[&'a [u8]],
    values: Option<&[i32]>,
) -> Result<(Vec<&'a [u8]>, Vec<i32>), Error> {
    if keys.is_empty() {
        return Err(Error::EmptyKeys);
    }
    if values.is_some_and(|v| v.len() != keys.len()) {
        return Err(Error::LengthMismatch);
    }
    let mut pairs = Vec::with_capacity(keys.len());
    for (i, &key) in keys.iter().enumerate() {
        if key.contains(&0) {
            return Err(Error::NulInKey);
        }
        let value = values.map_or(i as i32, |v| v[i]);
        if value < 0 {
            return Err(Error::NegativeValue);
        }
        pairs.push((key, value));
    }
    pairs.sort_by(|a, b| a.0.cmp(b.0));
    pairs.dedup_by(|later, earlier| later.0 == earlier.0);
    Ok(pairs.into_iter().unzip())
}

impl Dictionary {
    /// An empty dictionary that holds no trie; every search misses.
    #[must_use]
    pub fn empty(backend: Backend) -> Self {
        let array = match backend {
            Backend::Darts => Array::Darts(darts::DoubleArray::new()),
            Backend::Clone => Array::Clone(clone::DoubleArray::new()),
        };
        Self { array }
    }

    /// Builds a dictionary; see [`prepare_keys`] for the input contract.
    ///
    /// # Errors
    /// Any [`prepare_keys`] error, or [`Error::BuildFailed`].
    pub fn build(backend: Backend, keys: &[&[u8]], values: Option<&[i32]>) -> Result<Self, Error> {
        let (keys, values) = prepare_keys(keys, values)?;
        let array = match backend {
            Backend::Darts => darts::DoubleArray::build(&keys, &values).map(Array::Darts),
            Backend::Clone => clone::DoubleArray::build(&keys, &values).map(Array::Clone),
        }
        .map_err(|e| Error::BuildFailed(e.0))?;
        Ok(Self { array })
    }

    /// Loads a dictionary image. With no explicit backend, darts-clone is
    /// tried first because it validates the image; the taku910 layout
    /// accepts any byte string.
    ///
    /// # Errors
    /// [`Error::InvalidDictionary`] when the chosen backend rejects the bytes.
    pub fn load(bytes: &[u8], backend: Option<Backend>) -> Result<Self, Error> {
        let clone = || clone::DoubleArray::from_bytes(bytes).map(Array::Clone);
        let darts = || darts::DoubleArray::from_bytes(bytes).map(Array::Darts);
        let array = match backend {
            Some(Backend::Darts) => darts(),
            Some(Backend::Clone) => clone(),
            None => clone().or_else(darts),
        };
        array
            .map(|array| Self { array })
            .ok_or(Error::InvalidDictionary)
    }

    /// The backend this dictionary is held in.
    #[must_use]
    pub fn backend(&self) -> Backend {
        match self.array {
            Array::Darts(_) => Backend::Darts,
            Array::Clone(_) => Backend::Clone,
        }
    }

    /// Number of units in the array (not the number of keys).
    #[must_use]
    pub fn size(&self) -> usize {
        match &self.array {
            Array::Darts(a) => a.size(),
            Array::Clone(a) => a.size(),
        }
    }

    /// The file image, or `None` for a dictionary that holds no trie.
    #[must_use]
    pub fn to_bytes(&self) -> Option<Vec<u8>> {
        if self.size() == 0 {
            return None;
        }
        Some(match &self.array {
            Array::Darts(a) => a.to_bytes(),
            Array::Clone(a) => a.to_bytes(),
        })
    }

    /// Value of `key`, or -1.
    #[must_use]
    pub fn exact_match_search(&self, key: &[u8]) -> i32 {
        if self.size() == 0 {
            return -1;
        }
        match &self.array {
            Array::Darts(a) => a.exact_match_search(key),
            Array::Clone(a) => a.exact_match_search(key),
        }
    }

    /// Values of every key that is a prefix of `key`, shortest first.
    #[must_use]
    pub fn common_prefix_search(&self, key: &[u8]) -> Vec<i32> {
        let mut out = Vec::new();
        if self.size() == 0 {
            return out;
        }
        match &self.array {
            Array::Darts(a) => a.common_prefix_search(key, &mut out),
            Array::Clone(a) => a.common_prefix_search(key, &mut out),
        }
        out
    }

    /// Advances one byte along `key` from (`node_pos`, `key_pos`), or returns
    /// `None` for a dictionary that holds no trie.
    #[must_use]
    pub fn traverse_one(&self, key: &[u8], node_pos: usize, key_pos: usize) -> Option<Step> {
        if self.size() == 0 {
            return None;
        }
        let (mut node_pos, mut key_pos) = (node_pos, key_pos);
        let value = match &self.array {
            Array::Darts(a) => a.traverse_one(key, &mut node_pos, &mut key_pos),
            Array::Clone(a) => a.traverse_one(key, &mut node_pos, &mut key_pos),
        };
        Some(Step {
            value,
            node_pos,
            key_pos,
        })
    }

    /// Every step of a traversal along `key`, stopping when `visit` returns
    /// `false` or no further edge exists.
    pub fn traverse(&self, key: &[u8], mut visit: impl FnMut(Step) -> bool) {
        let (mut node_pos, mut key_pos) = (0, 0);
        while key_pos < key.len() {
            let Some(step) = self.traverse_one(key, node_pos, key_pos) else {
                return;
            };
            let advanced = step.key_pos != key_pos;
            (node_pos, key_pos) = (step.node_pos, step.key_pos);
            if !visit(step) || step.value == -2 || !advanced {
                return;
            }
        }
    }
}
