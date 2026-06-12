use crate::*;
use crate::pokemon::Attacker;
use crate::battle_actions::ActiveMove;

impl Pokemon {

    /// Record that this Pokemon was attacked
    //
    // 	gotAttacked(move: string | Move, damage: number | false | undefined, source: Pokemon) {
    // 		const damageNumber = (typeof damage === 'number') ? damage : 0;
    // 		move = this.battle.dex.moves.get(move);
    // 		this.attackedBy.push({
    // 			source,
    // 			damage: damageNumber,
    // 			move: move.id,
    // 			thisTurn: true,
    // 			slot: source.getSlot(),
    // 			damageValue: damage,
    // 		});
    // 	}
    //
    pub fn got_attacked(
        &mut self,
        active_move: &ActiveMove,
        damage: i32,
        damage_value: Option<i32>,  // JavaScript: damageValue can be number | false | undefined
        source_side: usize,
        source_pos: usize,
        source_position: usize, // source.position (active slot) - for the JS getSlot() semantics
    ) {
        let move_id = active_move.id.clone();

        // JS: this.attackedBy.push({ source, damage, move: move.id, thisTurn: true, ... })
        // JavaScript: damage = (typeof damageValue === 'number') ? damageValue : 0
        // JavaScript: damageValue = original damage parameter (can be number, false, or undefined)
        self.attacked_by.push(Attacker {
            source: (source_side, source_pos),
            damage,
            this_turn: true,
            move_id: Some(move_id),
            // JS stores source.getSlot() ("p2a") - an ACTIVE SLOT reference, so later
            // consumers (Metal Burst/Comeuppance getAtSlot) hit whoever occupies that
            // slot now. Encode as (side_idx, active position).
            slot: (source_side, source_position),
            damage_value, // JavaScript: damageValue: damage - None if not a number, Some(n) if numeric
        });

        // NOTE: timesAttacked is NOT incremented here!
        // In JavaScript, gotAttacked() only pushes to attackedBy.
        // The timesAttacked increment happens separately in moveHitLoop.
    }
}
