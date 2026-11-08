//! DAWG to double-array converter (upstream `DoubleArrayBuilder`).

use super::BuildError;
use super::dawg::Dawg;

const BLOCK_SIZE: u32 = 256;
const NUM_EXTRA_BLOCKS: u32 = 16;
const NUM_EXTRAS: usize = (BLOCK_SIZE * NUM_EXTRA_BLOCKS) as usize;
const UPPER_MASK: u32 = 0xFF << 21;
const LOWER_MASK: u32 = 0xFF;

fn set_has_leaf(unit: &mut u32, has_leaf: bool) {
    if has_leaf {
        *unit |= 1 << 8;
    } else {
        *unit &= !(1 << 8);
    }
}

fn set_value(unit: &mut u32, value: i32) {
    *unit = value as u32 | (1 << 31);
}

fn set_label(unit: &mut u32, label: u8) {
    *unit = (*unit & !0xFF) | u32::from(label);
}

fn set_offset(unit: &mut u32, offset: u32) -> Result<(), BuildError> {
    if offset >= 1 << 29 {
        return Err(BuildError("failed to modify unit: too large offset"));
    }
    *unit &= (1 << 31) | (1 << 8) | 0xFF;
    if offset < 1 << 21 {
        *unit |= offset << 10;
    } else {
        *unit |= (offset << 2) | (1 << 9);
    }
    Ok(())
}

#[derive(Clone, Copy, Default)]
struct Extra {
    prev: u32,
    next: u32,
    is_fixed: bool,
    is_used: bool,
}

/// Position in the sibling list of a node whose children are being built.
struct SiblingWalk {
    dawg_child_id: u32,
    offset: u32,
}

#[derive(Default)]
struct Builder {
    units: Vec<u32>,
    extras: Vec<Extra>,
    labels: Vec<u8>,
    table: Vec<u32>,
    extras_head: u32,
}

/// Builds the unit array for `keys` (NUL-truncated, sorted) with `values`.
pub(super) fn build(keys: &[&[u8]], values: &[i32]) -> Result<Vec<u32>, BuildError> {
    if keys.len() != values.len() {
        return Err(BuildError(
            "failed to build double-array: key/value count mismatch",
        ));
    }
    let mut dawg = Dawg::default();
    dawg.init();
    for (key, &value) in keys.iter().zip(values) {
        let length = key.iter().position(|&b| b == 0).unwrap_or(key.len());
        dawg.insert(&key[..length], value)?;
    }
    dawg.finish();

    let mut builder = Builder::default();
    builder.build_from_dawg(&dawg)?;
    Ok(builder.units)
}

impl Builder {
    fn num_blocks(&self) -> u32 {
        (self.units.len() / BLOCK_SIZE as usize) as u32
    }

    fn extra(&self, id: u32) -> &Extra {
        &self.extras[id as usize % NUM_EXTRAS]
    }

    fn extra_mut(&mut self, id: u32) -> &mut Extra {
        &mut self.extras[id as usize % NUM_EXTRAS]
    }

    fn build_from_dawg(&mut self, dawg: &Dawg) -> Result<(), BuildError> {
        self.table = vec![0; dawg.num_intersections()];
        self.extras = vec![Extra::default(); NUM_EXTRAS];

        self.reserve_id(0);
        self.extra_mut(0).is_used = true;
        set_offset(&mut self.units[0], 1)?;
        set_label(&mut self.units[0], 0);

        if dawg.child(0) != 0 {
            self.build_from_dawg_at(dawg, 0, 0)?;
        }

        self.fix_all_blocks();

        self.extras = Vec::new();
        self.labels = Vec::new();
        self.table = Vec::new();
        Ok(())
    }

    /// Iterative form of upstream's recursive `build_from_dawg`: one `SiblingWalk`
    /// per level, so stack use is independent of key length.
    fn build_from_dawg_at(
        &mut self,
        dawg: &Dawg,
        dawg_id: u32,
        dic_id: u32,
    ) -> Result<(), BuildError> {
        let mut stack: Vec<SiblingWalk> = Vec::new();
        stack.extend(self.enter_dawg_node(dawg, dawg_id, dic_id)?);
        while let Some(walk) = stack.last_mut() {
            let dawg_child_id = walk.dawg_child_id;
            let offset = walk.offset;
            // The sibling link is a pure read, so advancing before descending
            // keeps the visiting order of the recursive form.
            let next = dawg.sibling(dawg_child_id);
            if next == 0 {
                stack.pop();
            } else {
                walk.dawg_child_id = next;
            }
            let child_label = dawg.label(dawg_child_id);
            if child_label != 0 {
                let dic_child_id = offset ^ u32::from(child_label);
                stack.extend(self.enter_dawg_node(dawg, dawg_child_id, dic_child_id)?);
            }
        }
        Ok(())
    }

    /// Prologue of upstream `build_from_dawg`: `None` when the node needs no
    /// descent into its children (shared offset reused).
    fn enter_dawg_node(
        &mut self,
        dawg: &Dawg,
        dawg_id: u32,
        dic_id: u32,
    ) -> Result<Option<SiblingWalk>, BuildError> {
        let dawg_child_id = dawg.child(dawg_id);
        if dawg.is_intersection(dawg_child_id) {
            let intersection_id = dawg.intersection_id(dawg_child_id);
            let mut offset = self.table[intersection_id as usize];
            if offset != 0 {
                offset ^= dic_id;
                if offset & UPPER_MASK == 0 || offset & LOWER_MASK == 0 {
                    if dawg.is_leaf(dawg_child_id) {
                        set_has_leaf(&mut self.units[dic_id as usize], true);
                    }
                    set_offset(&mut self.units[dic_id as usize], offset)?;
                    return Ok(None);
                }
            }
        }

        let offset = self.arrange_from_dawg(dawg, dawg_id, dic_id)?;
        if dawg.is_intersection(dawg_child_id) {
            self.table[dawg.intersection_id(dawg_child_id) as usize] = offset;
        }
        Ok(Some(SiblingWalk {
            dawg_child_id,
            offset,
        }))
    }

    fn arrange_from_dawg(
        &mut self,
        dawg: &Dawg,
        dawg_id: u32,
        dic_id: u32,
    ) -> Result<u32, BuildError> {
        self.labels.clear();

        let mut dawg_child_id = dawg.child(dawg_id);
        while dawg_child_id != 0 {
            self.labels.push(dawg.label(dawg_child_id));
            dawg_child_id = dawg.sibling(dawg_child_id);
        }

        let offset = self.find_valid_offset(dic_id);
        set_offset(&mut self.units[dic_id as usize], dic_id ^ offset)?;

        dawg_child_id = dawg.child(dawg_id);
        for i in 0..self.labels.len() {
            let label = self.labels[i];
            let dic_child_id = offset ^ u32::from(label);
            self.reserve_id(dic_child_id);

            if dawg.is_leaf(dawg_child_id) {
                set_has_leaf(&mut self.units[dic_id as usize], true);
                set_value(
                    &mut self.units[dic_child_id as usize],
                    dawg.value(dawg_child_id),
                );
            } else {
                set_label(&mut self.units[dic_child_id as usize], label);
            }

            dawg_child_id = dawg.sibling(dawg_child_id);
        }
        self.extra_mut(offset).is_used = true;

        Ok(offset)
    }

    fn find_valid_offset(&self, id: u32) -> u32 {
        if self.extras_head as usize >= self.units.len() {
            return self.units.len() as u32 | (id & LOWER_MASK);
        }

        let mut unfixed_id = self.extras_head;
        loop {
            let offset = unfixed_id ^ u32::from(self.labels[0]);
            if self.is_valid_offset(id, offset) {
                return offset;
            }
            unfixed_id = self.extra(unfixed_id).next;
            if unfixed_id == self.extras_head {
                break;
            }
        }

        self.units.len() as u32 | (id & LOWER_MASK)
    }

    fn is_valid_offset(&self, id: u32, offset: u32) -> bool {
        if self.extra(offset).is_used {
            return false;
        }

        let rel_offset = id ^ offset;
        if rel_offset & LOWER_MASK != 0 && rel_offset & UPPER_MASK != 0 {
            return false;
        }

        self.labels[1..]
            .iter()
            .all(|&label| !self.extra(offset ^ u32::from(label)).is_fixed)
    }

    fn reserve_id(&mut self, id: u32) {
        if id as usize >= self.units.len() {
            self.expand_units();
        }

        if id == self.extras_head {
            self.extras_head = self.extra(id).next;
            if self.extras_head == id {
                self.extras_head = self.units.len() as u32;
            }
        }
        let (prev, next) = (self.extra(id).prev, self.extra(id).next);
        self.extra_mut(prev).next = next;
        self.extra_mut(next).prev = prev;
        self.extra_mut(id).is_fixed = true;
    }

    fn expand_units(&mut self) {
        let src_num_units = self.units.len() as u32;
        let src_num_blocks = self.num_blocks();

        let dest_num_units = src_num_units + BLOCK_SIZE;
        let dest_num_blocks = src_num_blocks + 1;

        if dest_num_blocks > NUM_EXTRA_BLOCKS {
            self.fix_block(src_num_blocks - NUM_EXTRA_BLOCKS);
        }

        self.units.resize(dest_num_units as usize, 0);

        if dest_num_blocks > NUM_EXTRA_BLOCKS {
            for id in src_num_units..dest_num_units {
                self.extra_mut(id).is_used = false;
                self.extra_mut(id).is_fixed = false;
            }
        }

        for i in src_num_units + 1..dest_num_units {
            self.extra_mut(i - 1).next = i;
            self.extra_mut(i).prev = i - 1;
        }

        self.extra_mut(src_num_units).prev = dest_num_units - 1;
        self.extra_mut(dest_num_units - 1).next = src_num_units;

        let head = self.extras_head;
        let head_prev = self.extra(head).prev;
        self.extra_mut(src_num_units).prev = head_prev;
        self.extra_mut(dest_num_units - 1).next = head;

        let head_prev = self.extra(head).prev;
        self.extra_mut(head_prev).next = src_num_units;
        self.extra_mut(head).prev = dest_num_units - 1;
    }

    fn fix_all_blocks(&mut self) {
        let end = self.num_blocks();
        let begin = end.saturating_sub(NUM_EXTRA_BLOCKS);
        for block_id in begin..end {
            self.fix_block(block_id);
        }
    }

    fn fix_block(&mut self, block_id: u32) {
        let begin = block_id * BLOCK_SIZE;
        let end = begin + BLOCK_SIZE;

        let mut unused_offset = 0;
        for offset in begin..end {
            if !self.extra(offset).is_used {
                unused_offset = offset;
                break;
            }
        }

        for id in begin..end {
            if !self.extra(id).is_fixed {
                self.reserve_id(id);
                set_label(&mut self.units[id as usize], (id ^ unused_offset) as u8);
            }
        }
    }
}
