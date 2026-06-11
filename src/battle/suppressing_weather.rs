///! Battle suppressing_weather method
///!
///! JavaScript source (field.ts suppressingWeather):
// 	suppressingWeather() {
// 		for (const side of this.battle.sides) {
// 			for (const pokemon of side.active) {
// 				if (pokemon && !pokemon.fainted && !pokemon.ignoringAbility() &&
// 					pokemon.getAbility().suppressWeather && !pokemon.abilityState.ending) {
// 					return true;
// 				}
// 			}
// 		}
// 		return false;
// 	}

use crate::battle::Battle;

impl Battle {
    pub fn suppressing_weather(&self) -> bool {
        // for (const side of this.battle.sides) {
        for side in &self.sides {
            // 	for (const pokemon of side.active) {
            for active_idx in 0..side.active.len() {
                if let Some(pokemon_idx) = side.active[active_idx] {
                    if let Some(pokemon) = side.pokemon.get(pokemon_idx) {
                        // 		if (pokemon && !pokemon.fainted && !pokemon.ignoringAbility() &&
                        // JS: !pokemon.ignoringAbility() - Neutralizing Gas / Gastro Acid
                        // disable weather-suppressing abilities like Air Lock
                        if !pokemon.fainted && !pokemon.ignoring_ability(self) {
                            // Get ability
                            if let Some(ability_data) = self.dex.abilities().get_by_id(&pokemon.ability) {
                                // JS: pokemon.getAbility().suppressWeather && !pokemon.abilityState.ending
                                if ability_data.suppress_weather.unwrap_or(false)
                                    && !pokemon.ability_state.borrow().ending.unwrap_or(false)
                                {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        // 		return false;
        false
    }
}
