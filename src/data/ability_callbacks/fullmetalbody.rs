//! Full Metal Body Ability
//!
//! Pokemon Showdown - http://pokemonshowdown.com/
//!
//! Generated from data/abilities.ts

use crate::battle::Battle;
use crate::battle::Effect;
use crate::event::EventResult;

/// onTryBoost(boost, target, source, effect) {
///     if (source && target === source) return;
///     let showMsg = false;
///     let i: BoostID;
///     for (i in boost) {
///         if (boost[i]! < 0) {
///             delete boost[i];
///             showMsg = true;
///         }
///     }
///     if (showMsg && !(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
///         this.add("-fail", target, "unboost", "[from] ability: Full Metal Body", `[of] ${target}`);
///     }
/// }
pub fn on_try_boost(
    battle: &mut Battle,
    boost: Option<&mut crate::dex_data::BoostsTable>, target_pos: (usize, usize), source_pos: Option<(usize, usize)>, _effect: Option<&Effect>,
) -> EventResult {
    // if (source && target === source) return;
    if let Some(src) = source_pos {
        if src == target_pos {
            return EventResult::Continue;
        }
    }

    // Check if we have a boost table
    let boost = match boost {
        Some(b) => b,
        None => return EventResult::Continue,
    };

    // let showMsg = false;
    let mut show_msg = false;

    // for (i in boost) {
    //     if (boost[i]! < 0) {
    //         delete boost[i];
    //         showMsg = true;
    //     }
    // }
    if boost.atk != crate::dex_data::BoostsTable::DELETED && boost.atk < 0 {
        boost.atk = crate::dex_data::BoostsTable::DELETED; // JS: delete boost[i]
        show_msg = true;
    }
    if boost.def != crate::dex_data::BoostsTable::DELETED && boost.def < 0 {
        boost.def = crate::dex_data::BoostsTable::DELETED; // JS: delete boost[i]
        show_msg = true;
    }
    if boost.spa != crate::dex_data::BoostsTable::DELETED && boost.spa < 0 {
        boost.spa = crate::dex_data::BoostsTable::DELETED; // JS: delete boost[i]
        show_msg = true;
    }
    if boost.spd != crate::dex_data::BoostsTable::DELETED && boost.spd < 0 {
        boost.spd = crate::dex_data::BoostsTable::DELETED; // JS: delete boost[i]
        show_msg = true;
    }
    if boost.spe != crate::dex_data::BoostsTable::DELETED && boost.spe < 0 {
        boost.spe = crate::dex_data::BoostsTable::DELETED; // JS: delete boost[i]
        show_msg = true;
    }
    if boost.accuracy != crate::dex_data::BoostsTable::DELETED && boost.accuracy < 0 {
        boost.accuracy = crate::dex_data::BoostsTable::DELETED; // JS: delete boost[i]
        show_msg = true;
    }
    if boost.evasion != crate::dex_data::BoostsTable::DELETED && boost.evasion < 0 {
        boost.evasion = crate::dex_data::BoostsTable::DELETED; // JS: delete boost[i]
        show_msg = true;
    }

    // if (showMsg && !(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
    if show_msg {
        let has_secondaries = battle.active_move.as_ref()
            .map(|m| !m.borrow().secondaries.is_empty())
            .unwrap_or(false);

        let is_octolock = battle.event.as_ref()
            .and_then(|e| e.effect.as_ref())
            .map(|eff| eff.id.as_str() == "octolock")
            .unwrap_or(false);

        // Only show message if no secondaries and not octolock
        if !has_secondaries && !is_octolock {
            let target_slot = {
                let pokemon = match battle.pokemon_at(target_pos.0, target_pos.1) {
                    Some(p) => p,
                    None => return EventResult::Continue,
                };
                pokemon.get_slot()
            };

            battle.add(
                "-fail",
                &[
                    crate::battle::Arg::from(target_slot.clone()),
                    crate::battle::Arg::from("unboost"),
                    crate::battle::Arg::from("[from] ability: Full Metal Body"),
                    crate::battle::Arg::from(format!("[of] {}", target_slot)),
                ],
            );
        }
    }

    EventResult::Continue
}

