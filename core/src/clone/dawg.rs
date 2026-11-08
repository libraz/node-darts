//! Directed acyclic word graph builder (upstream `DawgBuilder`).

use super::BuildError;

const INITIAL_TABLE_SIZE: usize = 1 << 10;

/// Mutable DAWG node (upstream `DawgNode`).
#[derive(Clone, Copy, Default)]
struct Node {
    child: u32,
    sibling: u32,
    label: u8,
    is_state: bool,
    has_sibling: bool,
}

impl Node {
    fn unit(&self) -> u32 {
        if self.label == 0 {
            return (self.child << 1) | u32::from(self.has_sibling);
        }
        (self.child << 2) | if self.is_state { 2 } else { 0 } | u32::from(self.has_sibling)
    }
}

/// Bit vector with a rank index (upstream `BitVector`).
#[derive(Default)]
struct BitVector {
    units: Vec<u32>,
    ranks: Vec<u32>,
    num_ones: usize,
    size: usize,
}

impl BitVector {
    fn get(&self, id: usize) -> bool {
        (self.units[id / 32] >> (id % 32)) & 1 == 1
    }

    fn rank(&self, id: usize) -> u32 {
        let unit_id = id / 32;
        self.ranks[unit_id] + (self.units[unit_id] & (!0u32 >> (32 - (id % 32) - 1))).count_ones()
    }

    fn set(&mut self, id: usize, bit: bool) {
        if bit {
            self.units[id / 32] |= 1u32 << (id % 32);
        } else {
            self.units[id / 32] &= !(1u32 << (id % 32));
        }
    }

    fn append(&mut self) {
        if self.size.is_multiple_of(32) {
            self.units.push(0);
        }
        self.size += 1;
    }

    fn build(&mut self) {
        self.ranks.clear();
        self.num_ones = 0;
        for &unit in &self.units {
            self.ranks.push(self.num_ones as u32);
            self.num_ones += unit.count_ones() as usize;
        }
    }
}

fn hash(mut key: u32) -> u32 {
    key = (!key).wrapping_add(key << 15);
    key ^= key >> 12;
    key = key.wrapping_add(key << 2);
    key ^= key >> 4;
    key = key.wrapping_mul(2057);
    key ^= key >> 16;
    key
}

/// Minimal acyclic automaton over the inserted keys.
#[derive(Default)]
pub(super) struct Dawg {
    nodes: Vec<Node>,
    units: Vec<u32>,
    labels: Vec<u8>,
    is_intersections: BitVector,
    table: Vec<u32>,
    node_stack: Vec<u32>,
    recycle_bin: Vec<u32>,
    num_states: usize,
}

impl Dawg {
    pub(super) fn child(&self, id: u32) -> u32 {
        self.units[id as usize] >> 2
    }

    pub(super) fn sibling(&self, id: u32) -> u32 {
        if self.units[id as usize] & 1 == 1 {
            id + 1
        } else {
            0
        }
    }

    pub(super) fn value(&self, id: u32) -> i32 {
        (self.units[id as usize] >> 1) as i32
    }

    pub(super) fn is_leaf(&self, id: u32) -> bool {
        self.label(id) == 0
    }

    pub(super) fn label(&self, id: u32) -> u8 {
        self.labels[id as usize]
    }

    pub(super) fn is_intersection(&self, id: u32) -> bool {
        self.is_intersections.get(id as usize)
    }

    pub(super) fn intersection_id(&self, id: u32) -> u32 {
        self.is_intersections.rank(id as usize) - 1
    }

    pub(super) fn num_intersections(&self) -> usize {
        self.is_intersections.num_ones
    }

    pub(super) fn init(&mut self) {
        self.table.resize(INITIAL_TABLE_SIZE, 0);

        self.append_node();
        self.append_unit();

        self.num_states = 1;

        self.nodes[0].label = 0xFF;
        self.node_stack.push(0);
    }

    pub(super) fn finish(&mut self) {
        self.flush(0);

        self.units[0] = self.nodes[0].unit();
        self.labels[0] = self.nodes[0].label;

        self.nodes = Vec::new();
        self.table = Vec::new();
        self.node_stack = Vec::new();
        self.recycle_bin = Vec::new();

        self.is_intersections.build();
    }

    pub(super) fn insert(&mut self, key: &[u8], value: i32) -> Result<(), BuildError> {
        let length = key.len();
        if value < 0 {
            return Err(BuildError("failed to insert key: negative value"));
        } else if length == 0 {
            return Err(BuildError("failed to insert key: zero-length key"));
        }
        let byte = |pos: usize| key.get(pos).copied().unwrap_or(0);

        let mut id = 0u32;
        let mut key_pos = 0usize;

        while key_pos <= length {
            let child_id = self.nodes[id as usize].child;
            if child_id == 0 {
                break;
            }

            let key_label = byte(key_pos);
            let unit_label = self.nodes[child_id as usize].label;
            if key_label < unit_label {
                return Err(BuildError("failed to insert key: wrong key order"));
            } else if key_label > unit_label {
                self.nodes[child_id as usize].has_sibling = true;
                self.flush(child_id);
                break;
            }
            id = child_id;
            key_pos += 1;
        }

        if key_pos > length {
            return Ok(());
        }

        while key_pos <= length {
            let key_label = byte(key_pos);
            let child_id = self.append_node();

            if self.nodes[id as usize].child == 0 {
                self.nodes[child_id as usize].is_state = true;
            }
            self.nodes[child_id as usize].sibling = self.nodes[id as usize].child;
            self.nodes[child_id as usize].label = key_label;
            self.nodes[id as usize].child = child_id;
            self.node_stack.push(child_id);

            id = child_id;
            key_pos += 1;
        }
        self.nodes[id as usize].child = value as u32;
        Ok(())
    }

    fn top(&self) -> u32 {
        self.node_stack.last().copied().unwrap_or(0)
    }

    fn flush(&mut self, id: u32) {
        while self.top() != id {
            let node_id = self.top();
            self.node_stack.pop();

            if self.num_states >= self.table.len() - (self.table.len() >> 2) {
                self.expand_table();
            }

            let mut num_siblings = 0u32;
            let mut i = node_id;
            while i != 0 {
                num_siblings += 1;
                i = self.nodes[i as usize].sibling;
            }

            let (mut match_id, hash_id) = self.find_node(node_id);
            if match_id != 0 {
                self.is_intersections.set(match_id as usize, true);
            } else {
                let mut unit_id = 0u32;
                for _ in 0..num_siblings {
                    unit_id = self.append_unit();
                }
                let mut i = node_id;
                while i != 0 {
                    self.units[unit_id as usize] = self.nodes[i as usize].unit();
                    self.labels[unit_id as usize] = self.nodes[i as usize].label;
                    unit_id -= 1;
                    i = self.nodes[i as usize].sibling;
                }
                match_id = unit_id + 1;
                self.table[hash_id] = match_id;
                self.num_states += 1;
            }

            let mut i = node_id;
            while i != 0 {
                let next = self.nodes[i as usize].sibling;
                self.recycle_bin.push(i);
                i = next;
            }

            let top = self.top();
            self.nodes[top as usize].child = match_id;
        }
        self.node_stack.pop();
    }

    fn expand_table(&mut self) {
        let table_size = self.table.len() << 1;
        self.table = vec![0; table_size];

        for i in 1..self.units.len() {
            let id = i as u32;
            if self.labels[i] == 0 || self.units[i] & 2 == 2 {
                let hash_id = self.find_unit(id);
                self.table[hash_id] = id;
            }
        }
    }

    /// First empty slot on the probe sequence of unit `id`.
    fn find_unit(&self, id: u32) -> usize {
        let size = self.table.len();
        let mut hash_id = self.hash_unit(id) as usize % size;
        while self.table[hash_id] != 0 {
            hash_id = (hash_id + 1) % size;
        }
        hash_id
    }

    /// Matching unit id (0 when none) and the slot where it was or would be stored.
    fn find_node(&self, node_id: u32) -> (u32, usize) {
        let size = self.table.len();
        let mut hash_id = self.hash_node(node_id) as usize % size;
        loop {
            let unit_id = self.table[hash_id];
            if unit_id == 0 {
                return (0, hash_id);
            }
            if self.are_equal(node_id, unit_id) {
                return (unit_id, hash_id);
            }
            hash_id = (hash_id + 1) % size;
        }
    }

    fn are_equal(&self, node_id: u32, mut unit_id: u32) -> bool {
        let mut i = self.nodes[node_id as usize].sibling;
        while i != 0 {
            if self.units[unit_id as usize] & 1 == 0 {
                return false;
            }
            unit_id += 1;
            i = self.nodes[i as usize].sibling;
        }
        if self.units[unit_id as usize] & 1 == 1 {
            return false;
        }

        let mut i = node_id;
        while i != 0 {
            let node = &self.nodes[i as usize];
            if node.unit() != self.units[unit_id as usize]
                || node.label != self.labels[unit_id as usize]
            {
                return false;
            }
            i = node.sibling;
            unit_id = unit_id.wrapping_sub(1);
        }
        true
    }

    fn hash_unit(&self, mut id: u32) -> u32 {
        let mut hash_value = 0u32;
        while id != 0 {
            let unit = self.units[id as usize];
            let label = u32::from(self.labels[id as usize]);
            hash_value ^= hash((label << 24) ^ unit);

            if self.units[id as usize] & 1 == 0 {
                break;
            }
            id += 1;
        }
        hash_value
    }

    fn hash_node(&self, mut id: u32) -> u32 {
        let mut hash_value = 0u32;
        while id != 0 {
            let node = &self.nodes[id as usize];
            hash_value ^= hash((u32::from(node.label) << 24) ^ node.unit());
            id = node.sibling;
        }
        hash_value
    }

    fn append_unit(&mut self) -> u32 {
        self.is_intersections.append();
        self.units.push(0);
        self.labels.push(0);

        (self.is_intersections.size - 1) as u32
    }

    fn append_node(&mut self) -> u32 {
        if let Some(id) = self.recycle_bin.pop() {
            self.nodes[id as usize] = Node::default();
            id
        } else {
            self.nodes.push(Node::default());
            (self.nodes.len() - 1) as u32
        }
    }
}
