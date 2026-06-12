use crate::*;

impl Battle {
    /// Relative location of `target` as seen from `viewer`.
    /// Equivalent to pokemon.ts getLocOf(target).
    ///
    /// JavaScript source:
    /// ```js
    /// getLocOf(target: Pokemon) {
    ///     const positionOffset = Math.floor(target.side.n / 2) * target.side.active.length;
    ///     const position = target.position + positionOffset + 1;
    ///     const sameHalf = (this.side.n % 2) === (target.side.n % 2);
    ///     return sameHalf ? -position : position;
    /// }
    /// ```
    ///
    /// IMPORTANT: the location is derived from the target's ACTIVE POSITION
    /// (slot 0..active_per_half), NOT its party index. Both positions are
    /// passed as (side_index, party_index) tuples; the position is resolved
    /// here. A previous Pokemon::get_loc_of helper took the party index as if
    /// it were the position, which was invisible in singles (the wrong loc
    /// failed validTargetLoc and getRandomTarget re-resolved the single foe
    /// without a PRNG roll) but broke doubles target selection.
    pub fn get_loc_of(&self, viewer: (usize, usize), target: (usize, usize)) -> i8 {
        // JS: const positionOffset = Math.floor(target.side.n / 2) * target.side.active.length;
        let position_offset = (target.0 / 2) * self.active_per_half;
        let target_position = self
            .sides
            .get(target.0)
            .and_then(|s| s.pokemon.get(target.1))
            .map(|p| p.position)
            .unwrap_or(0);
        let position = (target_position + position_offset) as i8 + 1;
        let same_half = (viewer.0 % 2) == (target.0 % 2);
        if same_half {
            -position
        } else {
            position
        }
    }
}
