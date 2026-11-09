//! Port of taku910 Darts 0.32 (`Darts::DoubleArray`).

/// Error raised by a builder.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuildError(pub &'static str);

/// One array unit, `{ int base; unsigned int check; }`.
#[derive(Debug, Default, Clone, Copy)]
struct Unit {
    base: i32,
    check: u32,
}

const UNIT_BYTES: usize = 8;

/// Double-array in the taku910 Darts 0.32 layout.
#[derive(Debug, Default, Clone)]
pub struct DoubleArray {
    units: Vec<Unit>,
}

impl DoubleArray {
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
        if keys.is_empty() {
            return Ok(Self::new());
        }
        if values.len() != keys.len() {
            return Err(BuildError("keys and values differ in length"));
        }
        let mut builder = Builder {
            units: Vec::new(),
            used: Vec::new(),
            size: 0,
            keys,
            values,
            progress: 0,
            next_check_pos: 0,
            error: None,
        };
        builder.resize(8192);
        builder.units[0].base = 1;
        let root = Node {
            code: 0,
            depth: 0,
            left: 0,
            right: keys.len(),
        };
        let siblings = builder.fetch(&root);
        builder.insert(siblings);
        // Room for every possible transition out of the last node.
        builder.size += 257;
        if builder.size >= builder.units.len() {
            builder.resize(builder.size);
        }
        if let Some(err) = builder.error {
            return Err(err);
        }
        builder.units.truncate(builder.size);
        Ok(Self {
            units: builder.units,
        })
    }

    /// Loads an array image; `None` unless it is a whole number of units whose
    /// root has `base == 1`, which the upstream builder always writes. Upstream
    /// `open()` accepts any byte string.
    #[must_use]
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.is_empty() || !bytes.len().is_multiple_of(UNIT_BYTES) {
            return None;
        }
        let units: Vec<Unit> = bytes
            .as_chunks::<UNIT_BYTES>()
            .0
            .iter()
            .map(|c| Unit {
                base: i32::from_le_bytes([c[0], c[1], c[2], c[3]]),
                check: u32::from_le_bytes([c[4], c[5], c[6], c[7]]),
            })
            .collect();
        (units[0].base == 1).then_some(Self { units })
    }

    /// The bytes upstream `save()` writes (little-endian).
    #[must_use]
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(self.units.len() * UNIT_BYTES);
        for u in &self.units {
            out.extend_from_slice(&u.base.to_le_bytes());
            out.extend_from_slice(&u.check.to_le_bytes());
        }
        out
    }

    /// Number of units.
    #[must_use]
    pub fn size(&self) -> usize {
        self.units.len()
    }

    /// Value of `key`, or -1.
    #[must_use]
    pub fn exact_match_search(&self, key: &[u8]) -> i32 {
        let Some(mut b) = self.base_at(0) else {
            return -1;
        };
        for &c in key {
            match self.edge(b, c) {
                Some((_, base)) => b = base,
                None => return -1,
            }
        }
        self.terminal(b).unwrap_or(-1)
    }

    /// Appends `(value, byte_length)` of every key that is a prefix of `key`,
    /// shortest first; a zero-length key matches with length 0.
    pub fn common_prefix_search(&self, key: &[u8], out: &mut Vec<(i32, usize)>) {
        let Some(mut b) = self.base_at(0) else {
            return;
        };
        for (i, &c) in key.iter().enumerate() {
            if let Some(v) = self.terminal(b) {
                out.push((v, i));
            }
            match self.edge(b, c) {
                Some((_, base)) => b = base,
                None => return,
            }
        }
        if let Some(v) = self.terminal(b) {
            out.push((v, key.len()));
        }
    }

    /// Upstream `traverse(key, node_pos, key_pos, key_pos + 1)`.
    pub fn traverse_one(&self, key: &[u8], node_pos: &mut usize, key_pos: &mut usize) -> i32 {
        let Some(mut b) = self.base_at(*node_pos) else {
            return -2;
        };
        let Some(&c) = key.get(*key_pos) else {
            return -2;
        };
        match self.edge(b, c) {
            Some((p, base)) => {
                *node_pos = p;
                b = base;
            }
            None => return -2,
        }
        *key_pos += 1;
        self.terminal(b).unwrap_or(-1)
    }

    /// `base` of unit `i`, if in range.
    fn base_at(&self, i: usize) -> Option<i32> {
        self.units.get(i).map(|u| u.base)
    }

    /// Follows the edge labelled `c` out of the node with base `b`; yields the
    /// target unit index and its base.
    fn edge(&self, b: i32, c: u8) -> Option<(usize, i32)> {
        let p = (b as u32).wrapping_add(u32::from(c)).wrapping_add(1) as usize;
        let u = self.units.get(p)?;
        (u.check == b as u32).then_some((p, u.base))
    }

    /// Value stored at the terminal unit of the node with base `b`.
    fn terminal(&self, b: i32) -> Option<i32> {
        let u = self.units.get(b as u32 as usize)?;
        (u.check == b as u32 && u.base < 0).then_some(!u.base)
    }
}

/// Trie node during construction.
struct Node {
    code: u32,
    depth: usize,
    left: usize,
    right: usize,
}

/// Suspended `insert` call: resumes at `siblings[next]`.
struct Frame {
    siblings: Vec<Node>,
    begin: usize,
    next: usize,
}

/// Mirror of the upstream builder state.
struct Builder<'a> {
    units: Vec<Unit>,
    used: Vec<bool>,
    size: usize,
    keys: &'a [&'a [u8]],
    values: &'a [i32],
    progress: usize,
    next_check_pos: usize,
    error: Option<BuildError>,
}

impl Builder<'_> {
    fn resize(&mut self, new_size: usize) {
        self.units.resize(new_size, Unit::default());
        self.used.resize(new_size, false);
    }

    fn fetch(&mut self, parent: &Node) -> Vec<Node> {
        let mut siblings: Vec<Node> = Vec::new();
        if self.error.is_some() {
            return siblings;
        }
        let mut prev = 0u32;
        for i in parent.left..parent.right {
            let key = self.keys[i];
            if key.len() < parent.depth {
                continue;
            }
            let cur = if key.len() == parent.depth {
                0
            } else {
                u32::from(key[parent.depth]) + 1
            };
            if prev > cur {
                self.error = Some(BuildError("keys are not sorted"));
                return Vec::new();
            }
            if cur != prev || siblings.is_empty() {
                if let Some(last) = siblings.last_mut() {
                    last.right = i;
                }
                siblings.push(Node {
                    code: cur,
                    depth: parent.depth + 1,
                    left: i,
                    right: 0,
                });
            }
            prev = cur;
        }
        if let Some(last) = siblings.last_mut() {
            last.right = parent.right;
        }
        siblings
    }

    /// Iterative form of upstream's recursive `insert`: one `Frame` per level,
    /// resumed after each child returns, so stack use is independent of key length.
    fn insert(&mut self, siblings: Vec<Node>) -> usize {
        let mut stack: Vec<Frame> = Vec::new();
        match self.enter(siblings) {
            Ok(frame) => stack.push(frame),
            Err(ret) => return ret,
        }
        // Result of the call that just returned, awaiting delivery to its parent.
        let mut ret: Option<usize> = None;
        loop {
            let Some(f) = stack.last_mut() else {
                return ret.unwrap_or(0);
            };
            if let Some(h) = ret.take() {
                let code = f.siblings[f.next].code as usize;
                self.units[f.begin + code].base = h as i32;
                f.next += 1;
            }
            if f.next == f.siblings.len() {
                ret = Some(f.begin);
                stack.pop();
                continue;
            }
            let s = &f.siblings[f.next];
            let children = self.fetch(s);
            if children.is_empty() {
                let v = self.values[s.left];
                self.units[f.begin + s.code as usize].base = !v;
                if !v >= 0 {
                    self.error = Some(BuildError("values must be non-negative"));
                    ret = Some(0);
                    stack.pop();
                    continue;
                }
                self.progress += 1;
                f.next += 1;
            } else {
                match self.enter(children) {
                    Ok(frame) => stack.push(frame),
                    Err(r) => ret = Some(r),
                }
            }
        }
    }

    /// Prologue of upstream `insert`: finds `begin` and claims the sibling slots.
    /// `Err(0)` is an immediate return.
    #[allow(clippy::cast_precision_loss)] // upstream computes these ratios in double
    fn enter(&mut self, siblings: Vec<Node>) -> Result<Frame, usize> {
        if self.error.is_some() || siblings.is_empty() {
            return Err(0);
        }
        let first_code = siblings[0].code as usize;
        let last_code = siblings[siblings.len() - 1].code as usize;
        let mut pos = (first_code + 1).max(self.next_check_pos) - 1;
        let mut nonzero_num = 0usize;
        let mut first = false;
        if self.units.len() <= pos {
            self.resize(pos + 1);
        }
        let begin = 'search: loop {
            pos += 1;
            if self.units.len() <= pos {
                self.resize(pos + 1);
            }
            if self.units[pos].check != 0 {
                nonzero_num += 1;
                continue;
            } else if !first {
                self.next_check_pos = pos;
                first = true;
            }
            let begin = pos - first_code;
            if self.units.len() <= begin + last_code {
                // Upstream divides by `progress` (0 before the first leaf, giving
                // an unbounded factor); the 5% floor is what it effectively uses.
                let ratio = if self.progress == 0 {
                    1.05
                } else {
                    (self.keys.len() as f64 / self.progress as f64).max(1.05)
                };
                let grown = (self.units.len() as f64 * ratio) as usize;
                self.resize(grown.max(begin + last_code + 1));
            }
            if self.used[begin] {
                continue;
            }
            for s in &siblings[1..] {
                if self.units[begin + s.code as usize].check != 0 {
                    continue 'search;
                }
            }
            break begin;
        };

        // Move `next_check_pos` forward when the scanned range is mostly full.
        if nonzero_num as f64 / (pos - self.next_check_pos + 1) as f64 >= 0.95 {
            self.next_check_pos = pos;
        }

        self.used[begin] = true;
        self.size = self.size.max(begin + last_code + 1);

        for s in &siblings {
            self.units[begin + s.code as usize].check = begin as u32;
        }

        Ok(Frame {
            siblings,
            begin,
            next: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lcg(state: &mut u64) -> u64 {
        *state = state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        *state >> 33
    }

    #[test]
    fn build_and_search() {
        let keys: [&[u8]; 4] = [b"a", b"ab", b"abc", b"b"];
        let da = DoubleArray::build(&keys, &[0, 1, 2, 3]).unwrap();
        assert_eq!(da.exact_match_search(b"ab"), 1);
        assert_eq!(da.exact_match_search(b"abd"), -1);
        let mut out = Vec::new();
        da.common_prefix_search(b"abcd", &mut out);
        assert_eq!(out, [(0, 1), (1, 2), (2, 3)]);
        let (mut n, mut k) = (0, 0);
        assert_eq!(da.traverse_one(b"ab", &mut n, &mut k), 0);
        assert_eq!(da.traverse_one(b"ab", &mut n, &mut k), 1);
        assert_eq!(da.traverse_one(b"ab", &mut n, &mut k), -2);
        let again = DoubleArray::from_bytes(&da.to_bytes()).unwrap();
        assert_eq!(again.size(), da.size());
        assert_eq!(again.exact_match_search(b"abc"), 2);
    }

    #[test]
    fn deep_keys_build_on_small_stack() {
        let long = vec![b'a'; 1_000_000];
        let mut mid = vec![b'a'; 500_000];
        mid.push(b'c');
        let (long2, mid2) = (long.clone(), mid.clone());
        std::thread::Builder::new()
            .stack_size(256 * 1024)
            .spawn(move || {
                let keys: [&[u8]; 3] = [&long2, &mid2, b"b"];
                let da = DoubleArray::build(&keys, &[1, 3, 2]).unwrap();
                assert_eq!(da.exact_match_search(&long2), 1);
                assert_eq!(da.exact_match_search(b"b"), 2);
                assert_eq!(da.exact_match_search(&mid2), 3);
                assert_eq!(da.exact_match_search(b"a"), -1);
            })
            .unwrap()
            .join()
            .unwrap();
    }

    #[test]
    fn empty_array() {
        let da = DoubleArray::new();
        assert_eq!(da.size(), 0);
        assert_eq!(da.exact_match_search(b"a"), -1);
        let (mut n, mut k) = (0, 0);
        assert_eq!(da.traverse_one(b"a", &mut n, &mut k), -2);
    }

    #[test]
    fn rejects_malformed_images() {
        let mut unit = vec![0u8; 16];
        assert!(DoubleArray::from_bytes(&unit).is_none());
        unit[0] = 1;
        assert!(DoubleArray::from_bytes(&unit).is_some());
        assert!(DoubleArray::from_bytes(&unit[..15]).is_none());
        assert!(DoubleArray::from_bytes(&[]).is_none());
    }

    #[test]
    fn random_images_never_panic() {
        let mut s = 12345u64;
        for round in 0..3000 {
            let len = (lcg(&mut s) % 400) as usize;
            let image: Vec<u8> = (0..len)
                .map(|_| {
                    let r = lcg(&mut s);
                    // Bias towards small numbers so links often stay in range.
                    if round % 2 == 0 {
                        (r % 8) as u8
                    } else {
                        r as u8
                    }
                })
                .collect();
            let mut image: Vec<u8> = image;
            image.resize(len.div_ceil(UNIT_BYTES).max(1) * UNIT_BYTES, 0);
            image[..4].copy_from_slice(&1i32.to_le_bytes());
            let da = DoubleArray::from_bytes(&image).unwrap();
            for _ in 0..8 {
                let klen = (lcg(&mut s) % 6) as usize;
                let key: Vec<u8> = (0..klen).map(|_| lcg(&mut s) as u8).collect();
                let _ = da.exact_match_search(&key);
                let mut out = Vec::new();
                da.common_prefix_search(&key, &mut out);
                let (mut n, mut k) = ((lcg(&mut s) % 64) as usize, 0);
                while k < key.len() && da.traverse_one(&key, &mut n, &mut k) != -2 {}
            }
        }
    }
}
