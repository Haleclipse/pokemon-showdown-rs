#!/usr/bin/env node

// Enable debug logging
global.POKEMON_DEBUG = true;
Error.stackTraceLimit = 50;

/**
 * JavaScript Battle Test Runner
 *
 * Runs a random battle with a specific seed and outputs:
 * - Turn number
 * - PRNG call count before/after each turn
 * - HP of all active Pokemon
 *
 * Output format: #<iteration>: turn=<turn>, prng=<before>-><after>, P1=[...], P2=[...]
 *
 * Usage: node tests/test-battle-js.js [seed_number]
 */

const {Battle} = require('./../../pokemon-showdown-ts/dist/sim/battle');
const {PRNG} = require('./../../pokemon-showdown-ts/dist/sim/prng');
const fs = require('fs');

const seedNum = parseInt(process.argv[2]) || 1;
const teamsFile = `/tmp/teams-seed${seedNum}-js.json`;

if (!fs.existsSync(teamsFile)) {
    console.error(`ERROR: Team file not found: ${teamsFile}`);
    console.error('Run: node tests/generate-test-teams.js [seed_number] first');
    process.exit(1);
}

// Load teams from JSON file
const teams = JSON.parse(fs.readFileSync(teamsFile, 'utf8'));

// Create battle with specific seed
const battle = new Battle({formatid: 'gen9randombattle'});
battle.prng = new PRNG([0, 0, 0, seedNum]);

// Wrap PRNG to count calls BEFORE setPlayer so we count initialization PRNG calls
let totalPrngCalls = 0;
const originalNext = battle.prng.rng.next.bind(battle.prng.rng);
battle.prng.rng.next = function() {
    totalPrngCalls++;
    const result = originalNext();

    // Log PRNG calls on turns 41-43, or in a PRNG_TRACE_RANGE="from,to" window
    let traceThis = battle.turn >= 41 && battle.turn <= 43;
    if (process.env.PRNG_TRACE_RANGE) {
        const [from, to] = process.env.PRNG_TRACE_RANGE.split(',').map(Number);
        traceThis = totalPrngCalls >= from && totalPrngCalls <= to;
    }
    if (traceThis) {
        const stack = new Error().stack;
        const lines = stack.split("\n").slice(1, 30);
        console.error(`[PRNG_JS] turn=${battle.turn}, call #${totalPrngCalls}, result=${result}`);
        lines.forEach((line, i) => console.error(`  ${line.trim()}`));
    }

    return result;
};

// Wrap speedSort to track shuffles
const originalSpeedSort = battle.speedSort.bind(battle);
battle.speedSort = function(list, comparator) {
    const startPrng = totalPrngCalls;
    // Log 2-item Pokemon sorts (eachEvent) to debug speed-tie shuffles
    if (list.length === 2 && list[0]?.constructor?.name === 'Pokemon') {
        const items = list.map(p => `${p.name}(spd=${p.speed})`);
        console.error(`[SPEED_SORT_JS_2POKE] turn=${battle.turn}, PRNG=${totalPrngCalls}, items=[${items.join(', ')}]`);
    }
    // Optional caller traces for a turn window: SPEEDSORT_TRACE_TURNS="36,37"
    if (process.env.SPEEDSORT_TRACE_TURNS &&
        process.env.SPEEDSORT_TRACE_TURNS.split(',').includes(String(battle.turn))) {
        const stack = new Error().stack.split('\n').slice(2, 9).map(l => l.trim()).join(' <- ');
        console.error(`[SPEED_SORT_TRACE] turn=${battle.turn}, PRNG=${totalPrngCalls}, len=${list.length}, ${stack}`);
    }
    if (process.env.SORT2_TRACE && list.length === 2 && list[0]?.effect) {
        const ids = list.map(h => `${h.effect.id}(spd=${h.speed},pri=${h.priority},sub=${h.subOrder},eo=${h.effectOrder})`);
        console.error(`[SORT2_JS] turn=${battle.turn}, ids=[${ids.join(', ')}]`);
    }
    // Optional: HANDLER_SORT_TRACE=1 logs every speedSort over event handlers (entries with .effect)
    if (process.env.HANDLER_SORT_TRACE && list.length >= 2 && list[0]?.effect) {
        const items = list.map(h => `${h.effect?.id}(order=${h.order},prio=${h.priority},spd=${h.speed},sub=${h.subOrder},effOrd=${h.effectOrder})`);
        console.error(`[HANDLER_SORT_JS] turn=${battle.turn}, PRNG=${totalPrngCalls}, handlers=[${items.join(', ')}]`);
    }
    // Log all speedSort calls with 3 handlers to debug the divergence
    if (list.length === 3) {
        console.error(`[SPEED_SORT_JS_3] turn=${battle.turn}, list.length=${list.length}, BEFORE sort, PRNG=${totalPrngCalls}`);
        for (let i = 0; i < Math.min(list.length, 5); i++) {
            const h = list[i];
            const stateTarget = h.state?.target;
            const stateTargetType = stateTarget?.constructor?.name || 'undefined';
            // Log more details about the action/handler
            const choice = h.choice || 'no-choice';
            const moveName = h.move?.name || h.move?.id || 'no-move';
            const pokemonName = h.pokemon?.name || 'no-pokemon';
            console.error(`[SPEED_SORT_JS_3]   [${i}] choice=${choice}, move=${moveName}, pokemon=${pokemonName}, speed=${h.speed}, priority=${h.priority}, order=${h.order}, subOrder=${h.subOrder}`);
        }
    }
    originalSpeedSort(list, comparator);
    const endPrng = totalPrngCalls;
    if (endPrng > startPrng) {
        // Log details about what was shuffled
        const items = list.slice(0, 3).map(h => {
            const choice = h.choice || 'handler';
            const moveName = h.move?.name || h.move?.id || h.effect?.id || 'no-move';
            const pokemonName = h.pokemon?.name || h.effectHolder?.name || 'no-pokemon';
            return `${choice}(${moveName},${pokemonName},spd=${h.speed})`;
        });
        console.error(`[SPEED_SORT_JS] turn=${battle.turn}, shuffled ${list.length} items, PRNG calls: ${endPrng - startPrng}, items=[${items.join(', ')}]`);
        // Log detailed info for each shuffled handler
        for (let i = 0; i < Math.min(list.length, 5); i++) {
            const h = list[i];
            console.error(`[SPEED_SORT_DETAIL]   [${i}] effect.id=${h.effect?.id}, effect.name=${h.effect?.name}, effectType=${h.effect?.effectType}`);
            console.error(`[SPEED_SORT_DETAIL]   [${i}] effectHolder=${h.effectHolder?.name || h.effectHolder?.constructor?.name || 'none'}, state.target=${h.state?.target?.constructor?.name || 'none'}`);
            console.error(`[SPEED_SORT_DETAIL]   [${i}] speed=${h.speed}, priority=${h.priority}, subOrder=${h.subOrder}, order=${h.order}`);
        }
    }
};

// Optional handler trace: HANDLER_TRACE=onModifyMove logs handler lists
if (process.env.HANDLER_TRACE) {
    const origFind = battle.findEventHandlers.bind(battle);
    battle.findEventHandlers = function(target, eventName, ...rest) {
        const r = origFind(target, eventName, ...rest);
        if (eventName === process.env.HANDLER_TRACE && r.length) {
            console.error(`[HANDLER_TRACE] turn=${battle.turn}, ${eventName}, n=${r.length}, ids=[${r.map(h => h.effect.id).join(',')}]`);
        }
        return r;
    };
}

// Optional ability trace: ABILITY_TRACE=1 logs every pokemon.setAbility
if (process.env.ABILITY_TRACE) {
    const PokemonClass = require('./../../pokemon-showdown-ts/dist/sim/pokemon').Pokemon;
    const origSetAbility = PokemonClass.prototype.setAbility;
    PokemonClass.prototype.setAbility = function(ability, source, sourceEffect, isFromFormeChange, isTransform) {
        const before = this.ability;
        const r = origSetAbility.call(this, ability, source, sourceEffect, isFromFormeChange, isTransform);
        console.error(`[SETABILITY_JS] turn=${battle.turn}, who=${this.name}, ${before} -> ${this.ability}, requested=${typeof ability === 'string' ? ability : ability.id}, result=${JSON.stringify(r)}`);
        return r;
    };
}

// Optional PP trace: PP_TRACE=1 logs deductPP and lastMove
if (process.env.PP_TRACE) {
    const PokemonClass = require('./../../pokemon-showdown-ts/dist/sim/pokemon').Pokemon;
    const origDeduct = PokemonClass.prototype.deductPP;
    PokemonClass.prototype.deductPP = function(move, amount, target) {
        const r = origDeduct.call(this, move, amount, target);
        const mid = typeof move === 'string' ? move : move.id;
        console.error(`[PP_TRACE] turn=${battle.turn}, who=${this.name}, deductPP(${mid}, ${amount}) = ${r}, lastMove=${this.lastMove?.id}, slots=[${this.moveSlots.map(m => m.id + ':' + m.pp).join(',')}], baseSlots=[${this.baseMoveSlots.map(m => m.id + ':' + m.pp).join(',')}], shared=[${this.moveSlots.map((m, i) => m === this.baseMoveSlots[i]).join(',')}]`);
        return r;
    };
}

// Optional gotAttacked trace: GOTATTACKED_TRACE=1 logs gotAttacked args and berserk-relevant move state
if (process.env.GOTATTACKED_TRACE) {
    const PokemonClass = require('./../../pokemon-showdown-ts/dist/sim/pokemon').Pokemon;
    const origGotAttacked = PokemonClass.prototype.gotAttacked;
    PokemonClass.prototype.gotAttacked = function(move, damage, source) {
        const r = origGotAttacked.call(this, move, damage, source);
        const am = battle.activeMove;
        console.error(`[GOTATTACKED_JS] turn=${battle.turn}, who=${this.name}, hp=${this.hp}/${this.maxhp}, move=${typeof move === 'string' ? move : move.id}, damage=${damage}, activeMove.smartTarget=${am?.smartTarget}, activeMove.totalDamage=${am?.totalDamage}`);
        return r;
    };
}

// Optional eachEvent trace: EACHEVENT_TRACE=1 logs every eachEvent call with a stack hint
if (process.env.EACHEVENT_TRACE) {
    const origEachEvent = battle.eachEvent.bind(battle);
    battle.eachEvent = function(eventid, effect, relayVar) {
        const stack = new Error().stack.split('\n').slice(2, 4).map(s => s.trim().replace(/.*at /, '').replace(/ \(.*/, '')).join(' < ');
        console.error(`[EACHEVENT_JS] turn=${battle.turn}, event=${eventid}, PRNG=${totalPrngCalls}, from=${stack}`);
        return origEachEvent(eventid, effect, relayVar);
    };
}

// Optional getStat trace: GETSTAT_TRACE=1 logs getStat calls with unmodified=true (Download etc.)
if (process.env.GETSTAT_TRACE) {
    const PokemonClass = require('./../../pokemon-showdown-ts/dist/sim/pokemon').Pokemon;
    const origGetStat = PokemonClass.prototype.getStat;
    PokemonClass.prototype.getStat = function(statName, unboosted, unmodified) {
        const r = origGetStat.call(this, statName, unboosted, unmodified);
        if (unmodified) {
            console.error(`[GETSTAT_JS] turn=${battle.turn}, who=${this.name}, stat=${statName}, unboosted=${unboosted}, stored=${JSON.stringify(this.storedStats)}, boosts=${JSON.stringify(this.boosts)}, result=${r}`);
        }
        return r;
    };
}

// Optional residual trace: RESIDUAL_TRACE=1 logs singleEvent calls during Residual and faintMessages
if (process.env.RESIDUAL_TRACE) {
    const BattleClass = battle.constructor;
    const origSingleEvent = BattleClass.prototype.singleEvent;
    BattleClass.prototype.singleEvent = function(eventid, effect, state, target, source, sourceEffect, relayVar, customCallback) {
        if (eventid.includes('Residual')) {
            const tname = target?.name || target?.id || String(target);
            console.error(`[RESIDUAL_JS] turn=${this.turn}, event=${eventid}, effect=${effect.id}, target=${tname}, fainted=${target?.fainted}, hp=${target?.hp}, PRNG=${totalPrngCalls}`);
        }
        return origSingleEvent.call(this, eventid, effect, state, target, source, sourceEffect, relayVar, customCallback);
    };
    const origFaintMessages = BattleClass.prototype.faintMessages;
    BattleClass.prototype.faintMessages = function(...args) {
        const queued = this.faintQueue.length;
        const r = origFaintMessages.apply(this, args);
        if (queued) console.error(`[RESIDUAL_JS] turn=${this.turn}, faintMessages processed ${queued} queued, PRNG=${totalPrngCalls}`);
        return r;
    };
}

// Optional weather trace: WEATHER_TRACE=1 logs every field.setWeather call
if (process.env.WEATHER_TRACE) {
    const originalSetWeather = battle.field.setWeather.bind(battle.field);
    battle.field.setWeather = function(status, source, sourceEffect) {
        const before = totalPrngCalls;
        const result = originalSetWeather(status, source, sourceEffect);
        console.error(`[SET_WEATHER_JS] turn=${battle.turn}, status=${typeof status === 'string' ? status : status.id}, result=${result}, weather_now=${battle.field.weather}, PRNG=${before}->${totalPrngCalls}`);
        return result;
    };
}

// Optional action trace: ACTION_TRACE=1 logs every runAction with PRNG counts
if (process.env.ACTION_TRACE) {
    const originalRunAction = battle.runAction.bind(battle);
    battle.runAction = function(action) {
        const before = totalPrngCalls;
        const desc = `${action.choice}${action.move ? ':' + action.move.id : ''}${action.pokemon ? ' by ' + action.pokemon.name : ''}`;
        const result = originalRunAction(action);
        const peek = battle.queue.peek()?.choice || 'empty';
        console.error(`[ACTION_JS] turn=${battle.turn}, ${desc}, PRNG=${before}->${totalPrngCalls}, paused=${result}, peek_after=${peek}`);
        return result;
    };
}

battle.setPlayer('p1', {
    name: 'Player 1',
    team: teams.p1.map(p => ({
        name: p.name,
        species: p.species,
        level: p.level,
        ability: p.ability,
        item: p.item,
        nature: p.nature,
        gender: p.gender,
        moves: p.moves,
        evs: p.evs,
        ivs: p.ivs,
    })),
});

battle.setPlayer('p2', {
    name: 'Player 2',
    team: teams.p2.map(p => ({
        name: p.name,
        species: p.species,
        level: p.level,
        ability: p.ability,
        item: p.item,
        nature: p.nature,
        gender: p.gender,
        moves: p.moves,
        evs: p.evs,
        ivs: p.ivs,
    })),
});

// Instrument runMove to log when it's called on turns 15-17
const originalRunMove = battle.actions.runMove.bind(battle.actions);
battle.actions.runMove = function(moveOrMoveName, pokemon, targetLoc, options) {
    if (battle.turn >= 15 && battle.turn <= 17) {
        const moveName = typeof moveOrMoveName === 'string' ? moveOrMoveName : moveOrMoveName.name;
        console.error(`[RUNMOVE_JS] turn=${battle.turn}, move=${moveName}, pokemon=${pokemon.name}, externalMove=${options?.externalMove || false}`);
    }
    return originalRunMove(moveOrMoveName, pokemon, targetLoc, options);
};

// Instrument useMove to log when it's called on turns 15-17
const originalUseMove = battle.actions.useMove.bind(battle.actions);
battle.actions.useMove = function(moveOrMoveName, pokemon, options) {
    if (battle.turn >= 15 && battle.turn <= 17) {
        const moveName = typeof moveOrMoveName === 'string' ? moveOrMoveName : moveOrMoveName.name;
        console.error(`[USEMOVE_JS] turn=${battle.turn}, move=${moveName}, pokemon=${pokemon.name}`);
    }
    return originalUseMove(moveOrMoveName, pokemon, options);
};

// Instrument runEvent to log BeforeMove events on turns 15-17
const originalRunEvent = battle.runEvent.bind(battle);
battle.runEvent = function(eventid, target, ...args) {
    if (process.env.STATUS_TRACE && ['SetStatus', 'Immunity', 'TryAddVolatile'].includes(eventid)) {
        const r = originalRunEvent(eventid, target, ...args);
        console.error(`[STATUS_TRACE] turn=${battle.turn}, event=${eventid}, target=${target?.name}, relay=${JSON.stringify(args[2]?.id || args[2])}, result=${JSON.stringify(r?.id || r)}`);
        return r;
    }
    if (battle.turn >= 15 && battle.turn <= 17 && eventid === 'BeforeMove' && target && target.name) {
        console.error(`[RUNEVENT_JS] turn=${battle.turn}, event=BeforeMove, pokemon=${target.name}, status=${target.status || 'none'}, volatiles=${Object.keys(target.volatiles || {}).join(',') || 'none'}`);
    }
    return originalRunEvent(eventid, target, ...args);
};

// Instrument hitStepAccuracy to log accuracy checks
const originalHitStepAccuracy = battle.actions.hitStepAccuracy.bind(battle.actions);
battle.actions.hitStepAccuracy = function(targets, pokemon, move) {
    const startPrng = totalPrngCalls;
    console.error(`[HIT_STEP_ACCURACY_JS] turn=${battle.turn}, move=${move.id}, accuracy=${move.accuracy}, alwaysHit=${move.alwaysHit || false}, PRNG=${totalPrngCalls}`);
    const result = originalHitStepAccuracy(targets, pokemon, move);
    const endPrng = totalPrngCalls;
    console.error(`[HIT_STEP_ACCURACY_JS] turn=${battle.turn}, move=${move.id}, result=${JSON.stringify(result)}, PRNG_used=${endPrng - startPrng}`);
    return result;
};

// Instrument randomChance to log when it's called
const originalRandomChance = battle.randomChance.bind(battle);
battle.randomChance = function(numerator, denominator) {
    const result = originalRandomChance(numerator, denominator);
    console.error(`[RANDOM_CHANCE_JS] turn=${battle.turn}, numerator=${numerator}, denominator=${denominator}, result=${result}, PRNG=${totalPrngCalls}`);
    return result;
};

// Instrument modifyDamage to log STAB check
const originalModifyDamage = battle.actions.modifyDamage.bind(battle.actions);
battle.actions.modifyDamage = function(baseDamage, pokemon, target, move, suppressMessages) {
    // Log move type and pokemon types for STAB calculation
    const moveType = move.type;
    const pokemonTypes = pokemon.getTypes ? pokemon.getTypes() : pokemon.types;
    const hasType = pokemon.hasType ? pokemon.hasType(moveType) : pokemonTypes.includes(moveType);
    const isSTAB = move.forceSTAB || hasType;
    console.error(`[STAB_CHECK_JS] turn=${battle.turn}, move=${move.id}, move.type=${moveType}, pokemon.types=${JSON.stringify(pokemonTypes)}, hasType=${hasType}, forceSTAB=${move.forceSTAB || false}, isSTAB=${isSTAB}, baseDamage=${baseDamage}`);
    // Also log hpType if available
    if (pokemon.hpType) {
        console.error(`[STAB_CHECK_JS] pokemon.hpType=${pokemon.hpType}`);
    }
    return originalModifyDamage(baseDamage, pokemon, target, move, suppressMessages);
};

// Instrument findPokemonEventHandlers to log what volatiles are checked
const originalFindPokemonEventHandlers = battle.findPokemonEventHandlers.bind(battle);
battle.findPokemonEventHandlers = function(pokemon, callbackName, getKey) {
    const handlers = originalFindPokemonEventHandlers(pokemon, callbackName, getKey);

    // Log on turns 15-17 for BeforeMove
    if (battle.turn >= 15 && battle.turn <= 17 && callbackName === 'onBeforeMove') {
        console.error(`[FIND_HANDLERS_JS] turn=${battle.turn}, pokemon=${pokemon.name}, callback=${callbackName}, status=${pokemon.status || 'none'}, handlers_found=${handlers.length}`);
        handlers.forEach((h, i) => {
            console.error(`[FIND_HANDLERS_JS]   [${i}] effect=${h.effect.id}, effectType=${h.effect.effectType}`);
        });
    }

    return handlers;
};

console.log(`# JavaScript Battle Test - Seed ${seedNum}`);
console.log(`# P1: ${teams.p1[0].name} vs P2: ${teams.p2[0].name}`);

// Helper to format Pokemon detail
function formatPokemonDetail(pokemon, side) {
    if (!pokemon) return null;

    const boosts = [];
    for (const [stat, boost] of Object.entries(pokemon.boosts || {})) {
        if (boost !== 0) {
            boosts.push(`${stat}:${boost > 0 ? '+' : ''}${boost}`);
        }
    }

    const volatiles = Object.keys(pokemon.volatiles || {}).filter(v => v !== 'lockedmove');

    const moves = (pokemon.moveSlots || []).map(m => `${m.id}(${m.pp}/${m.maxpp})`).join(', ');

    const statsStr = pokemon.stats
        ? `Atk:${pokemon.stats.atk} Def:${pokemon.stats.def} SpA:${pokemon.stats.spa} SpD:${pokemon.stats.spd} Spe:${pokemon.stats.spe}`
        : 'not initialized';

    return {
        name: pokemon.name,
        species: pokemon.species?.name || 'unknown',
        hp: `${pokemon.hp}/${pokemon.maxhp}`,
        hpPercent: Math.floor((pokemon.hp / pokemon.maxhp) * 100),
        status: pokemon.status || 'none',
        item: pokemon.item || 'none',
        ability: pokemon.ability || 'none',
        stats: statsStr,
        boosts: boosts.length > 0 ? boosts.join(', ') : 'none',
        volatiles: volatiles.length > 0 ? volatiles.join(', ') : 'none',
        moves: moves
    };
}

function printBattleState(battle, iteration) {
    console.error('');
    console.error(`========== Turn ${battle.turn} (Iteration ${iteration}) ==========`);

    // Field conditions
    const weather = battle.field.weather || 'none';
    const terrain = battle.field.terrain || 'none';
    console.error(`Field: Weather=${weather}, Terrain=${terrain}, PRNG calls=${totalPrngCalls}`);

    // Player 1 state
    console.error('');
    console.error('--- Player 1 ---');
    battle.sides[0].active.forEach((pokemon, i) => {
        if (pokemon) {
            const detail = formatPokemonDetail(pokemon, battle.sides[0]);
            console.error(`  Active[${i}]: ${detail.name} (${detail.species})`);
            console.error(`    HP: ${detail.hp} (${detail.hpPercent}%) | Status: ${detail.status}`);
            console.error(`    Item: ${detail.item} | Ability: ${detail.ability}`);
            console.error(`    Stats: ${detail.stats}`);
            console.error(`    Boosts: ${detail.boosts}`);
            console.error(`    Volatiles: ${detail.volatiles}`);
            console.error(`    Moves: ${detail.moves}`);
        }
    });

    // Show side conditions for P1
    const p1SideConditions = Object.keys(battle.sides[0].sideConditions || {});
    if (p1SideConditions.length > 0) {
        console.error(`  Side Conditions: ${p1SideConditions.join(', ')}`);
    }

    // Player 2 state
    console.error('');
    console.error('--- Player 2 ---');
    battle.sides[1].active.forEach((pokemon, i) => {
        if (pokemon) {
            const detail = formatPokemonDetail(pokemon, battle.sides[1]);
            console.error(`  Active[${i}]: ${detail.name} (${detail.species})`);
            console.error(`    HP: ${detail.hp} (${detail.hpPercent}%) | Status: ${detail.status}`);
            console.error(`    Item: ${detail.item} | Ability: ${detail.ability}`);
            console.error(`    Stats: ${detail.stats}`);
            console.error(`    Boosts: ${detail.boosts}`);
            console.error(`    Volatiles: ${detail.volatiles}`);
            console.error(`    Moves: ${detail.moves}`);
        }
    });

    // Show side conditions for P2
    const p2SideConditions = Object.keys(battle.sides[1].sideConditions || {});
    if (p2SideConditions.length > 0) {
        console.error(`  Side Conditions: ${p2SideConditions.join(', ')}`);
    }

    console.error('');
}

// Run battle for up to 100 turns
for (let i = 1; i <= 100; i++) {
    const prngBefore = totalPrngCalls;

    // Print detailed state before turn
    printBattleState(battle, i);

    console.error(`>>> Making choices for turn ${battle.turn}...`);

    // Debug: log choices at iterations 6-10
    if (i >= 6 && i <= 10) {
        console.error(`[CHOICE_DEBUG] Before makeChoices (iteration ${i}):`);
        console.error(`[CHOICE_DEBUG]   P1 requestState=${battle.sides[0].requestState}, actions=${battle.sides[0].choice.actions.length}`);
        console.error(`[CHOICE_DEBUG]   P2 requestState=${battle.sides[1].requestState}, actions=${battle.sides[1].choice.actions.length}`);
        battle.sides[0].choice.actions.forEach((a, idx) => {
            console.error(`[CHOICE_DEBUG]     P1 action[${idx}]: ${a.choice} ${a.move ? a.move.id : a.moveid || ''}`);
        });
        battle.sides[1].choice.actions.forEach((a, idx) => {
            console.error(`[CHOICE_DEBUG]     P2 action[${idx}]: ${a.choice} ${a.move ? a.move.id : a.moveid || ''}`);
        });
        console.error(`[CHOICE_DEBUG]   Queue size: ${battle.queue.list.length}`);
        battle.queue.list.forEach((a, idx) => {
            if (a.choice === 'move') {
                console.error(`[CHOICE_DEBUG]     Queue[${idx}]: ${a.choice} ${a.moveid || a.move?.id || ''} by ${a.pokemon?.name || '?'}`);
            } else {
                console.error(`[CHOICE_DEBUG]     Queue[${idx}]: ${a.choice}`);
            }
        });
    }

    battle.makeChoices('default', 'default');

    // Debug: log choices after makeChoices at iterations 6-10
    if (i >= 6 && i <= 10) {
        console.error(`[CHOICE_DEBUG] After makeChoices (iteration ${i}):`);
        console.error(`[CHOICE_DEBUG]   P1 actions=${battle.sides[0].choice.actions.length}`);
        console.error(`[CHOICE_DEBUG]   P2 actions=${battle.sides[1].choice.actions.length}`);
        battle.sides[0].choice.actions.forEach((a, idx) => {
            console.error(`[CHOICE_DEBUG]     P1 action[${idx}]: ${a.choice} ${a.move ? a.move.id : a.moveid || ''}`);
        });
        battle.sides[1].choice.actions.forEach((a, idx) => {
            console.error(`[CHOICE_DEBUG]     P2 action[${idx}]: ${a.choice} ${a.move ? a.move.id : a.moveid || ''}`);
        });
        console.error(`[CHOICE_DEBUG]   Queue size after: ${battle.queue.list.length}`);
    }

    const prngAfter = totalPrngCalls;

    // Get active Pokemon HP
    const p1Active = battle.sides[0].active
        .map(p => p ? `${p.name}(${p.hp}/${p.maxhp})` : 'none')
        .join(', ');
    const p2Active = battle.sides[1].active
        .map(p => p ? `${p.name}(${p.hp}/${p.maxhp})` : 'none')
        .join(', ');

    console.log(`#${i}: turn=${battle.turn}, prng=${prngBefore}->${prngAfter}, P1=[${p1Active}], P2=[${p2Active}]`);
    console.error(`>>> Turn ${battle.turn} completed. PRNG: ${prngBefore}->${prngAfter} (+${prngAfter - prngBefore} calls)`);

    if (battle.ended || i >= 100) {
        // Optional protocol dump: PROTOCOL_LOG=1 dumps the full battle protocol log
        if (process.env.PROTOCOL_LOG) {
            console.error('===== PROTOCOL LOG =====');
            for (const line of battle.log) console.error(line);
            console.error('===== END PROTOCOL LOG =====');
        }
        console.error('');
        console.error('========================================');
        console.error(`Battle ended: ${battle.ended}`);
        console.error(`Final turn: ${battle.turn}`);
        console.error(`Total PRNG calls: ${totalPrngCalls}`);
        console.error('========================================');
        console.log(`# Battle ended: ${battle.ended}, Turn: ${battle.turn}, Total PRNG: ${totalPrngCalls}`);
        break;
    }
}
