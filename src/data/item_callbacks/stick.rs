//! Stick Item
//!
//! Pokemon Showdown - http://pokemonshowdown.com/
//!
//! Generated from data/items.ts

use crate::battle::Battle;
use crate::event::EventResult;

/// onModifyCritRatio(critRatio, user) {
///     if (this.toID(user.baseSpecies.baseSpecies) === 'farfetchd') {
///         return critRatio + 2;
///     }
/// }
pub fn on_modify_crit_ratio(
    battle: &mut Battle,
    pokemon_pos: (usize, usize),
    crit_ratio: i32,
) -> EventResult {

    // if (this.toID(user.baseSpecies.baseSpecies) === 'farfetchd')
    let is_farfetchd = {
        let pokemon = match battle.pokemon_at(pokemon_pos.0, pokemon_pos.1) {
            Some(p) => p,
            None => return EventResult::Continue,
        };

        // Get species data to access baseSpecies field
        let species_data = match battle.dex.species().get_by_id(&pokemon.base_species) {
            Some(s) => s,
            None => return EventResult::Continue,
        };

        // JS: species.baseSpecies defaults to the species name itself
        let ultimate_base = species_data
            .base_species
            .as_deref()
            .unwrap_or(&species_data.name);

        // JS: this.toID(user.baseSpecies.baseSpecies) - normalize the display
        // name (e.g. "Farfetch'd") to an ID before comparing
        crate::dex_data::to_id(ultimate_base) == "farfetchd"
    };

    if is_farfetchd {
        // return critRatio + 2;
        return EventResult::Number(crit_ratio + 2);
    }

    EventResult::Continue
}
