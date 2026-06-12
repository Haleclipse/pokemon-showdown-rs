//! Metal Burst Move
//!
//! Pokemon Showdown - http://pokemonshowdown.com/
//!
//! Generated from data/moves.ts

use crate::battle::Battle;
use crate::event::EventResult;
use crate::Pokemon;

/// damageCallback(pokemon) {
///     const lastDamagedBy = pokemon.getLastDamagedBy(true);
///     if (lastDamagedBy !== undefined) {
///         return (lastDamagedBy.damage * 1.5) || 1;
///     }
///     return 0;
/// }
pub fn damage_callback(
    battle: &mut Battle,
    pokemon_pos: (usize, usize),
    _target_pos: Option<(usize, usize)>,
) -> EventResult {
    // const lastDamagedBy = pokemon.getLastDamagedBy(true);
    let last_damaged_by = Pokemon::get_last_damaged_by(battle, pokemon_pos, true);

    // if (lastDamagedBy !== undefined) {
    if let Some(damaged_by) = last_damaged_by {
        // return (lastDamagedBy.damage * 1.5) || 1;
        let damage = ((damaged_by.damage as f64 * 1.5) as i32).max(1);
        return EventResult::Number(damage);
    }

    // return 0;
    EventResult::Number(0)
}

/// onTry(source) {
///     const lastDamagedBy = source.getLastDamagedBy(true);
///     if (!lastDamagedBy?.thisTurn) return false;
/// }
pub fn on_try(
    battle: &mut Battle,
    source_pos: (usize, usize),
    _target_pos: Option<(usize, usize)>,
) -> EventResult {
    // const lastDamagedBy = source.getLastDamagedBy(true);
    let last_damaged_by = Pokemon::get_last_damaged_by(battle, source_pos, true);

    // if (!lastDamagedBy?.thisTurn) return false;
    match last_damaged_by {
        Some(damaged_by) if damaged_by.this_turn => {
            // Continue if this_turn is true
            EventResult::Continue
        }
        _ => {
            // return false;
            EventResult::Boolean(false)
        }
    }
}

/// onModifyTarget(targetRelayVar, source, target, move) {
///     const lastDamagedBy = source.getLastDamagedBy(true);
///     if (lastDamagedBy) {
///         targetRelayVar.target = this.getAtSlot(lastDamagedBy.slot);
///     }
/// }
pub fn on_modify_target(
    battle: &mut Battle,
    source_pos: Option<(usize, usize)>,
    _target_pos: Option<(usize, usize)>,
    _active_move: Option<&crate::battle_actions::ActiveMove>,
) -> EventResult {
    // Get the source
    let source = match source_pos {
        Some(pos) => pos,
        None => return EventResult::Continue,
    };

    // const lastDamagedBy = source.getLastDamagedBy(true);
    let last_damaged_by = Pokemon::get_last_damaged_by(battle, source, true);

    // if (lastDamagedBy) {
    if let Some(damaged_by) = last_damaged_by {
        // targetRelayVar.target = this.getAtSlot(lastDamagedBy.slot);
        // slot is (side_idx, ACTIVE position); resolve via side.active so the
        // redirect hits whoever occupies that slot now (e.g. after Volt Switch).
        let (side_idx, position) = damaged_by.slot;
        if let Some(Some(party_idx)) = battle
            .sides
            .get(side_idx)
            .and_then(|s| s.active.get(position))
        {
            return EventResult::Position((side_idx, *party_idx));
        }
    }

    EventResult::Continue
}
