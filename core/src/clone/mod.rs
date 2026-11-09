//! Port of darts-clone (`Darts::DoubleArray`, 32-bit units).

mod builder;
mod dawg;

pub use crate::darts::BuildError;

/// Double-array in the darts-clone layout.
#[derive(Debug, Default, Clone)]
pub struct DoubleArray {
    units: Vec<u32>,
}

fn has_leaf(unit: u32) -> bool {
    (unit >> 8) & 1 == 1
}

fn value(unit: u32) -> i32 {
    (unit & ((1 << 31) - 1)) as i32
}

fn label(unit: u32) -> u32 {
    unit & ((1 << 31) | 0xFF)
}

fn offset(unit: u32) -> u32 {
    (unit >> 10) << ((unit & (1 << 9)) >> 6)
}

impl DoubleArray {
    /// Unit at `pos`, or `None` past the end (only reachable on corrupt images).
    fn unit(&self, pos: usize) -> Option<u32> {
        self.units.get(pos).copied()
    }

    /// Empty array (size 0).
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Builds from keys sorted ascending by bytes, unique, non-empty, NUL-free.
    ///
    /// # Errors
    /// Returns [`BuildError`] when the upstream builder would fail.
    pub fn build(keys: &[&[u8]], values: &[i32]) -> Result<Self, BuildError> {
        Ok(Self {
            units: builder::build(keys, values)?,
        })
    }

    /// Loads an array image; `None` when upstream `open()` would fail.
    #[must_use]
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        let size = bytes.len() / 4;
        if size < 256 || size & 0xFF != 0 {
            return None;
        }
        let units: Vec<u32> = bytes
            .as_chunks::<4>()
            .0
            .iter()
            .map(|c| u32::from_le_bytes(*c))
            .collect();

        if label(units[0]) != 0
            || has_leaf(units[0])
            || offset(units[0]) == 0
            || offset(units[0]) >= 512
        {
            return None;
        }
        if units[1..256]
            .iter()
            .any(|&u| label(u) <= 0xFF && offset(u) as usize >= size)
        {
            return None;
        }
        Some(Self { units })
    }

    /// The bytes upstream `save()` writes (little-endian).
    #[must_use]
    pub fn to_bytes(&self) -> Vec<u8> {
        self.units.iter().flat_map(|u| u.to_le_bytes()).collect()
    }

    /// Number of units.
    #[must_use]
    pub fn size(&self) -> usize {
        self.units.len()
    }

    /// Value of `key`, or -1.
    #[must_use]
    pub fn exact_match_search(&self, key: &[u8]) -> i32 {
        let mut node_pos = 0usize;
        let Some(mut unit) = self.unit(node_pos) else {
            return -1;
        };
        for &b in key {
            node_pos ^= (offset(unit) ^ u32::from(b)) as usize;
            match self.unit(node_pos) {
                Some(u) if label(u) == u32::from(b) => unit = u,
                _ => return -1,
            }
        }

        if !has_leaf(unit) {
            return -1;
        }
        self.unit(node_pos ^ offset(unit) as usize)
            .map_or(-1, value)
    }

    /// Appends `(value, byte_length)` of every key that is a prefix of `key`,
    /// shortest first.
    pub fn common_prefix_search(&self, key: &[u8], out: &mut Vec<(i32, usize)>) {
        let mut node_pos = 0usize;
        let Some(root) = self.unit(node_pos) else {
            return;
        };
        node_pos ^= offset(root) as usize;
        for (i, &b) in key.iter().enumerate() {
            node_pos ^= usize::from(b);
            let Some(unit) = self.unit(node_pos) else {
                return;
            };
            if label(unit) != u32::from(b) {
                return;
            }

            node_pos ^= offset(unit) as usize;
            if has_leaf(unit) {
                let Some(leaf) = self.unit(node_pos) else {
                    return;
                };
                out.push((value(leaf), i + 1));
            }
        }
    }

    /// Upstream `traverse(key, node_pos, key_pos, key_pos + 1)`.
    pub fn traverse_one(&self, key: &[u8], node_pos: &mut usize, key_pos: &mut usize) -> i32 {
        let mut id = *node_pos as u32;
        let Some(mut unit) = self.unit(id as usize) else {
            return -2;
        };

        let Some(&b) = key.get(*key_pos) else {
            return -2;
        };
        id ^= offset(unit) ^ u32::from(b);
        match self.unit(id as usize) {
            Some(u) if label(u) == u32::from(b) => unit = u,
            _ => return -2,
        }
        *node_pos = id as usize;
        *key_pos += 1;

        if !has_leaf(unit) {
            return -1;
        }
        self.unit((id ^ offset(unit)) as usize).map_or(-1, value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> (Vec<Vec<u8>>, DoubleArray) {
        let mut keys: Vec<Vec<u8>> = (0..3000)
            .map(|i| format!("key{i:05}").into_bytes())
            .collect();
        keys.push(b"zebra".to_vec());
        keys.sort();
        let refs: Vec<&[u8]> = keys.iter().map(Vec::as_slice).collect();
        let values: Vec<i32> = (0..keys.len() as i32).collect();
        let da = DoubleArray::build(&refs, &values).unwrap();
        (keys, da)
    }

    #[test]
    fn round_trip() {
        let (keys, da) = sample();
        let loaded = DoubleArray::from_bytes(&da.to_bytes()).unwrap();
        for (i, k) in keys.iter().enumerate() {
            assert_eq!(loaded.exact_match_search(k), i as i32);
        }
        assert_eq!(loaded.exact_match_search(b"key"), -1);
        let mut out = Vec::new();
        loaded.common_prefix_search(b"key00001xyz", &mut out);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].1, 8);
    }

    #[test]
    fn deep_keys_build_on_small_stack() {
        let long = vec![b'a'; 1_000_000];
        let mut mid = vec![b'a'; 500_000];
        mid.push(b'c');
        std::thread::Builder::new()
            .stack_size(256 * 1024)
            .spawn(move || {
                let keys: [&[u8]; 3] = [&long, &mid, b"b"];
                let da = DoubleArray::build(&keys, &[1, 3, 2]).unwrap();
                assert_eq!(da.exact_match_search(&long), 1);
                assert_eq!(da.exact_match_search(b"b"), 2);
                assert_eq!(da.exact_match_search(&mid), 3);
                assert_eq!(da.exact_match_search(b"a"), -1);
            })
            .unwrap()
            .join()
            .unwrap();
    }

    #[test]
    fn corrupt_images_never_panic() {
        let (keys, da) = sample();
        let image = da.to_bytes();
        let mut state = 0x1234_5678_9abc_def0_u64;
        let mut next = move || {
            state = state
                .wrapping_mul(6_364_136_223_846_793_005)
                .wrapping_add(1_442_695_040_888_963_407);
            (state >> 33) as u32
        };
        for _ in 0..200 {
            let mut bytes = image.clone();
            let units = bytes.len() / 4;
            for _ in 0..=(next() % 64) {
                let at = 256 + next() as usize % (units - 256);
                bytes[at * 4..at * 4 + 4]
                    .copy_from_slice(&next().wrapping_mul(0x9E37_79B1).to_le_bytes());
            }
            let Some(bad) = DoubleArray::from_bytes(&bytes) else {
                continue;
            };
            let mut out = Vec::new();
            for k in keys.iter().step_by(7) {
                let _ = bad.exact_match_search(k);
                out.clear();
                bad.common_prefix_search(k, &mut out);
                let (mut node, mut pos) = (0usize, 0usize);
                while pos < k.len() && bad.traverse_one(k, &mut node, &mut pos) != -2 {}
            }
            let (mut node, mut pos) = (usize::MAX, 0usize);
            let _ = bad.traverse_one(b"a", &mut node, &mut pos);
        }
        let empty = DoubleArray::new();
        assert_eq!(empty.exact_match_search(b"a"), -1);
        let mut out = Vec::new();
        empty.common_prefix_search(b"a", &mut out);
        let (mut node, mut pos) = (0, 0);
        assert_eq!(empty.traverse_one(b"a", &mut node, &mut pos), -2);
    }
}
