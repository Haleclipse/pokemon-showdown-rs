//! Regenerator Ability
//!
//! Pokemon Showdown - http://pokemonshowdown.com/
//!
//! Generated from data/abilities.ts

use crate::battle::{Battle, hp_fraction};
use crate::event::EventResult;

/// onSwitchOut(pokemon) {
///     pokemon.heal(pokemon.baseMaxhp / 3);
/// }
pub fn on_switch_out(battle: &mut Battle, pokemon_pos: (usize, usize)) -> EventResult {
    // Heal 1/3 of max HP when switching out
    let heal_amount = {
        let pokemon = match battle.pokemon_at(pokemon_pos.0, pokemon_pos.1) {
            Some(p) => p,
            None => return EventResult::Continue,
        };
        hp_fraction(pokemon.base_maxhp, 3)
    };

    // JS: pokemon.heal(...) is the direct Pokemon method - it adds HP without
    // running TryHeal (so Heal Block does not stop it) and emits no message.
    if let Some(pokemon) = battle.pokemon_at_mut(pokemon_pos.0, pokemon_pos.1) {
        pokemon.heal(heal_amount);
    }
    EventResult::Continue
}

