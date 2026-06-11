// JS Source:
//
// /**
//  * Like Field.effectiveWeather(), but ignores sun and rain if
//  * the Utility Umbrella is active for the Pokemon.
//  */
// effectiveWeather() {
// 	const weather = this.battle.field.effectiveWeather();
// 	switch (weather) {
// 	case 'sunnyday':
// 	case 'raindance':
// 	case 'desolateland':
// 	case 'primordialsea':
// 		if (this.hasItem('utilityumbrella')) return '';
// 	}
// 	return weather;
// }

use crate::*;

impl Pokemon {
    /// Get effective weather considering abilities and Utility Umbrella
    /// Equivalent to pokemon.ts effectiveWeather()
    ///
    /// Like JS, this internally uses Field.effectiveWeather() (which returns ''
    /// while a weather-suppressing ability such as Air Lock / Cloud Nine is
    /// active), so callers must not pass in the raw field weather.
    pub fn effective_weather(&self, battle: &Battle) -> ID {
        // JS: const weather = this.battle.field.effectiveWeather();
        let weather = battle.effective_weather();
        // JS: switch (weather) {
        // JS: case 'sunnyday': case 'raindance': case 'desolateland': case 'primordialsea':
        //         if (this.hasItem('utilityumbrella')) return '';
        match weather.as_str() {
            "sunnyday" | "raindance" | "desolateland" | "primordialsea" => {
                // JS: if (this.hasItem('utilityumbrella')) return '';
                if self.has_item(battle, &["utilityumbrella"]) {
                    ID::empty()
                } else {
                    weather
                }
            }
            // JS: return weather;
            _ => weather,
        }
    }
}
