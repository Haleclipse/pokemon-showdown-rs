//! Magic Bounce Ability
//!
//! Pokemon Showdown - http://pokemonshowdown.com/
//!
//! Generated from data/abilities.ts

use crate::battle::Battle;
use crate::event::EventResult;

/// onTryHit(target, source, move) {
///     if (target === source || move.hasBounced || !move.flags['reflectable'] || target.isSemiInvulnerable()) {
///         return;
///     }
///     const newMove = this.dex.getActiveMove(move.id);
///     newMove.hasBounced = true;
///     newMove.pranksterBoosted = false;
///     this.actions.useMove(newMove, target, { target: source });
///     return null;
/// }
pub fn on_try_hit(battle: &mut Battle, target_pos: (usize, usize), source_pos: (usize, usize), active_move: Option<&crate::battle_actions::ActiveMove>) -> EventResult { let move_id = active_move.as_ref().map(|m| m.id.to_string()).unwrap_or_default();
    use crate::pokemon::Pokemon;

    // if (target === source || move.hasBounced || !move.flags['reflectable'] || target.isSemiInvulnerable()) {
    //     return;
    // }
    if target_pos == source_pos {
        return EventResult::Continue;
    }

    // JS reads `move` from the event args (the move being bounced), not battle.activeMove
    let (has_bounced, is_reflectable) = match active_move {
        Some(m) => (m.has_bounced, m.flags.reflectable),
        None => return EventResult::Continue,
    };
    let target_semi_invulnerable = Pokemon::is_semi_invulnerable(battle, target_pos);

    if has_bounced || !is_reflectable || target_semi_invulnerable {
        return EventResult::Continue;
    }

    // const newMove = this.dex.getActiveMove(move.id);
    // newMove.hasBounced = true;
    // newMove.pranksterBoosted = false;
    // this.actions.useMove(newMove, target, { target: source });
    // The flags go on the NEW move only; the ORIGINAL move stays unbounced so a second
    // Magic Bounce holder hit by the same spread move can bounce it too.
    let move_data = match battle.dex.moves().get(&move_id).cloned() {
        Some(m) => m,
        None => return EventResult::Continue,
    };
    battle.use_move_with_bounced(
        &move_data,
        target_pos,        // Magic Bounce holder becomes the user
        Some(source_pos),  // Original source becomes the target
        true,
        false,
    );

    // return null;
    EventResult::Null
}

/// onAllyTryHitSide(target, source, move) {
///     if (target.isAlly(source) || move.hasBounced || !move.flags['reflectable'] || target.isSemiInvulnerable()) {
///         return;
///     }
///     const newMove = this.dex.getActiveMove(move.id);
///     newMove.hasBounced = true;
///     newMove.pranksterBoosted = false;
///     this.actions.useMove(newMove, this.effectState.target, { target: source });
///     move.hasBounced = true; // only bounce once in free-for-all battles
///     return null;
/// }
pub fn on_ally_try_hit_side(battle: &mut Battle, target_pos: Option<(usize, usize)>, source_pos: Option<(usize, usize)>, active_move: Option<&crate::battle_actions::ActiveMove>) -> EventResult { let move_id = active_move.as_ref().map(|m| m.id.to_string()).unwrap_or_default();
    use crate::pokemon::Pokemon;

    let target = match target_pos {
        Some(pos) => pos,
        None => return EventResult::Continue,
    };

    let source = match source_pos {
        Some(pos) => pos,
        None => return EventResult::Continue,
    };

    // if (target.isAlly(source) || move.hasBounced || !move.flags['reflectable'] || target.isSemiInvulnerable()) {
    //     return;
    // }
    let is_ally = battle.is_ally(target, source);
    if is_ally {
        return EventResult::Continue;
    }

    // JS reads `move` from the event args (the move being bounced), not battle.activeMove
    let (has_bounced, is_reflectable) = match active_move {
        Some(m) => (m.has_bounced, m.flags.reflectable),
        None => return EventResult::Continue,
    };
    let target_semi_invulnerable = Pokemon::is_semi_invulnerable(battle, target);

    if has_bounced || !is_reflectable || target_semi_invulnerable {
        return EventResult::Continue;
    }

    // this.actions.useMove(newMove, this.effectState.target, { target: source });
    // Get the Magic Bounce holder from effect_state.target
    let magic_bounce_holder = match battle.effect_state.borrow().target {
        Some(holder) => holder,
        None => return EventResult::Continue,
    };

    // const newMove = this.dex.getActiveMove(move.id);
    // newMove.hasBounced = true;
    // newMove.pranksterBoosted = false;
    // Reflect the move: Magic Bounce holder uses the move against the original source
    let move_data = match battle.dex.moves().get(&move_id).cloned() {
        Some(m) => m,
        None => return EventResult::Continue,
    };
    battle.use_move_with_bounced(
        &move_data,
        magic_bounce_holder,  // Magic Bounce holder becomes the user
        Some(source),         // Original source becomes the target
        true,
        false,
    );

    // move.hasBounced = true; // only bounce once in free-for-all battles
    // Set on the ORIGINAL move (the event's move instance), after the reflection, as JS does
    if let Some(source_move) = battle.event.as_ref().and_then(|e| e.source_move.clone()) {
        source_move.borrow_mut().has_bounced = true;
    }

    // return null;
    EventResult::Null
}

