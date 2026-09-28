import {
	BALANCE,
	BUILDINGS,
	CLEAR_YIELD,
	ENERGY_DEMAND_FACTOR,
	NATURE_WEIGHT,
	PLANT_COST,
	investedCost,
	stat,
	RAIN,
	SOLAR_FACTOR,
	STAR_THRESHOLDS,
	WIND_FACTOR
} from './HarmoniaConfig.ts';
import { rollEvent } from './HarmoniaEvents.ts';
import { createRandom, forestNeighbours, generateIsland } from './HarmoniaMap.ts';
import type {
	EffectKind,
	Flows,
	GameState,
	LogEntry,
	Scores,
	Season,
	Tile,
	ToolId
} from './HarmoniaTypes.ts';

export function newGame(seed: number = Math.floor(Math.random() * 2 ** 32)): GameState {
	const random = createRandom(seed);
	const tiles = generateIsland(random);
	const state: GameState = {
		turn: 0,
		tiles,
		materials: BALANCE.startMaterials,
		population: BALANCE.startPopulation,
		groundwater: BALANCE.startGroundwater,
		pollution: 0,
		nature: 0,
		happiness: BALANCE.startHappiness,
		effects: [],
		solarTech: 0,
		windTech: 0,
		lowHarmonyStreak: 0,
		harmonyHistory: [],
		populationHistory: [],
		log: [],
		pendingEvent: null,
		lastEvent: null,
		outcome: 'playing',
		seed: random.seed
	};
	state.nature = natureTarget(state);
	state.harmonyHistory.push(harmony(state));
	state.populationHistory.push(state.population);
	return state;
}

export function seasonOf(state: GameState): Season {
	return (state.turn % 4) as Season;
}

export function yearOf(state: GameState): number {
	return Math.floor(state.turn / 4) + 1;
}

export function hasEffect(state: GameState, kind: EffectKind): boolean {
	return state.effects.some((e) => e.kind === kind);
}

/** A mine or coal plant on an emptied mountain produces nothing. */
export function isExhausted(tile: Tile): boolean {
	const def = tile.building ? BUILDINGS[tile.building] : null;
	return !!def?.oreUse && tile.ore <= 0;
}

export function buildingOutput(state: GameState, tile: Tile) {
	const def = tile.building ? BUILDINGS[tile.building] : null;
	const output = { food: 0, water: 0, energy: 0, materials: 0 };
	if (!def || isExhausted(tile)) return output;

	const season = seasonOf(state);
	switch (def.id) {
		case 'farm': {
			const soil = 1 - state.pollution / 250;
			output.food = stat(tile, 'food') * soil * (hasEffect(state, 'pests') ? 0.5 : 1);
			break;
		}
		case 'garden': {
			const pollinators = Math.min(2, forestNeighbours(state.tiles, tile));
			output.food = stat(tile, 'food') + pollinators * BALANCE.gardenForestBonus;
			break;
		}
		case 'wind': {
			const storm = hasEffect(state, 'storm') ? 1.6 : 1;
			output.energy = (stat(tile, 'energy') + state.windTech) * WIND_FACTOR[season] * storm;
			break;
		}
		case 'solar': {
			const weather = hasEffect(state, 'storm') ? 0.5 : hasEffect(state, 'heatwave') ? 1.3 : 1;
			output.energy = (stat(tile, 'energy') + state.solarTech) * SOLAR_FACTOR[season] * weather;
			break;
		}
		case 'waterworks':
			output.water = stat(tile, 'water') * (hasEffect(state, 'drought') ? 0.7 : 1);
			break;
		case 'sawmill':
			output.materials = stat(tile, 'materials') * (tile.vitality >= 30 ? 1 : 0.5);
			break;
		default:
			output.food = stat(tile, 'food');
			output.energy = stat(tile, 'energy');
			output.materials = stat(tile, 'materials');
	}
	return output;
}

export function computeFlows(state: GameState): Flows {
	const season = seasonOf(state);
	let foodProduction = 0;
	let waterCapacity = 0;
	let drainWeighted = 0;
	let waterUse = 0;
	let energyProduction = 0;
	let energyUse = 0;
	let buildingMaterials = 0;
	let emissions = 0;
	let housing = 0;
	let parks = 0;
	let forestCover = 0;

	for (const tile of state.tiles) {
		if (tile.terrain === 'forest') forestCover += tile.vitality / 100;
		if (!tile.building) continue;
		const def = BUILDINGS[tile.building];
		const output = buildingOutput(state, tile);
		foodProduction += output.food;
		waterCapacity += output.water;
		drainWeighted += output.water * stat(tile, 'drain');
		energyProduction += output.energy;
		buildingMaterials += output.materials;
		housing += stat(tile, 'housing');
		if (def.id === 'park') parks++;
		waterUse += stat(tile, 'waterUse');
		if (!isExhausted(tile)) {
			energyUse += stat(tile, 'energyUse');
			emissions += stat(tile, 'emissions');
		}
	}

	const heat = hasEffect(state, 'heatwave') ? 1.2 : 1;
	const people = state.population * consumptionFactor(state);
	const foodDemand = people * BALANCE.foodPerPerson;
	const waterDemand = people * BALANCE.waterPerPerson + waterUse;
	const energyDemand =
		people * BALANCE.energyPerPerson * ENERGY_DEMAND_FACTOR[season] * heat + energyUse;
	const waterSupply = Math.min(waterCapacity, state.groundwater, waterDemand);
	// Workshops stall in a blackout, so industry scales with the power supply.
	const power = energyDemand > 0 ? Math.min(1, energyProduction / energyDemand) : 1;
	const materialsIncome =
		BALANCE.baseMaterials +
		Math.floor(state.population / BALANCE.peoplePerMaterial) +
		buildingMaterials * power;

	return {
		foodProduction,
		foodDemand,
		waterCapacity,
		waterSupply,
		drainRate: waterCapacity > 0 ? drainWeighted / waterCapacity : 0,
		waterDemand,
		energyProduction,
		energyDemand,
		materialsIncome,
		emissions,
		absorption: forestCover * BALANCE.forestAbsorption,
		housing,
		parks,
		groundwaterRecharge: hasEffect(state, 'drought')
			? 0
			: RAIN[season] * climateFactor(state) + forestCover * BALANCE.forestRecharge
	};
}

export function consumptionFactor(state: GameState): number {
	return 1 + state.turn * BALANCE.demandGrowth;
}

export function climateFactor(state: GameState): number {
	return 1 - state.turn * BALANCE.rainDecline;
}

export function ratios(flows: Flows) {
	const safe = (supply: number, demand: number) => (demand > 0 ? supply / demand : 1);
	return {
		food: safe(flows.foodProduction, flows.foodDemand),
		water: safe(Math.min(flows.waterCapacity, flows.waterDemand * 2), flows.waterDemand),
		waterDelivered: safe(flows.waterSupply, flows.waterDemand),
		energy: safe(flows.energyProduction, flows.energyDemand)
	};
}

/** Shortage hurts steeply; a big surplus is waste and costs a little too. */
export function supplyScore(ratio: number, wasteful: boolean): number {
	if (ratio < 1) return 100 * Math.pow(Math.max(0, ratio), 1.5);
	if (!wasteful || ratio <= 1.5) return 100;
	return Math.max(50, 100 - (ratio - 1.5) * 50);
}

export function computeScores(state: GameState, flows: Flows = computeFlows(state)): Scores {
	const r = ratios(flows);
	return {
		food: supplyScore(r.food, true),
		water: supplyScore(r.waterDelivered, false),
		energy: supplyScore(r.energy, true),
		nature: state.nature,
		air: 100 - state.pollution,
		happiness: state.happiness
	};
}

/** Balance beats excellence: the weakest score pulls the whole island down. */
export function harmony(state: GameState, flows: Flows = computeFlows(state)): number {
	const values = Object.values(computeScores(state, flows));
	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	return Math.round(0.6 * mean + 0.4 * Math.min(...values));
}

export function tileNatureWeight(state: GameState, tile: Tile): number {
	const forestHealth = 0.4 + 0.6 * (tile.vitality / 100);
	if (tile.building) {
		const weight = BUILDINGS[tile.building].natureWeight;
		return tile.terrain === 'forest' ? weight * forestHealth : weight;
	}
	if (tile.terrain === 'forest') return forestHealth;
	if (tile.terrain === 'lake' && state.groundwater < 20) return NATURE_WEIGHT.lake * 0.6;
	return NATURE_WEIGHT[tile.terrain];
}

export function natureTarget(state: GameState): number {
	const total = state.tiles.reduce((sum, tile) => sum + tileNatureWeight(state, tile), 0);
	const value = (total / state.tiles.length) * BALANCE.natureScale - state.pollution * 0.3;
	return clamp(value, 0, 100);
}

export function happinessTarget(state: GameState, flows: Flows): number {
	const r = ratios(flows);
	const supply = Math.min(r.food, r.waterDelivered, r.energy, 1);
	return clamp(
		35 + 30 * supply + state.nature * 0.15 - state.pollution * 0.35 + Math.min(flows.parks * 6, 18),
		0,
		100
	);
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function stars(value: number): number {
	return STAR_THRESHOLDS.filter((t) => value >= t).length;
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

export type ActionCheck = { ok: true; cost: number } | { ok: false; reason: string };

export function toolCost(tool: ToolId, tile?: Tile): number {
	if (tool === 'plant') return (tile && PLANT_COST[tile.terrain]) ?? PLANT_COST.meadow!;
	if (tool === 'upgrade') return tile?.building ? (BUILDINGS[tile.building].upgrade?.cost ?? 0) : 0;
	if (tool === 'clear' || tool === 'demolish' || tool === 'inspect') return 0;
	return BUILDINGS[tool].cost;
}

/** What demolishing or clearing hands back, so the UI can show it up front. */
export function toolRefund(tool: ToolId, tile: Tile): number {
	if (tool === 'demolish') return Math.floor(investedCost(tile) / 2);
	if (tool === 'clear') return Math.max(2, Math.round(CLEAR_YIELD * (tile.vitality / 100)));
	return 0;
}

export function checkAction(state: GameState, tool: ToolId, tile: Tile): ActionCheck {
	if (state.outcome !== 'playing' || state.pendingEvent) return { ok: false, reason: 'busy' };
	if (tool === 'inspect') return { ok: false, reason: 'inspect' };

	if (tool === 'demolish') {
		return tile.building ? { ok: true, cost: 0 } : { ok: false, reason: 'nothing_to_demolish' };
	}
	if (tool === 'upgrade') {
		if (!tile.building) return { ok: false, reason: 'nothing_to_upgrade' };
		const upgrade = BUILDINGS[tile.building].upgrade;
		if (!upgrade || tile.upgraded) return { ok: false, reason: 'no_upgrade' };
		if (state.materials < upgrade.cost) return { ok: false, reason: 'too_expensive' };
		return { ok: true, cost: upgrade.cost };
	}
	if (tile.building) return { ok: false, reason: 'occupied' };

	if (tool === 'clear') {
		return tile.terrain === 'forest'
			? { ok: true, cost: 0 }
			: { ok: false, reason: 'needs_forest' };
	}

	const cost = toolCost(tool, tile);
	if (tool === 'plant') {
		if (!(tile.terrain in PLANT_COST)) return { ok: false, reason: 'cannot_plant' };
	} else if (!BUILDINGS[tool].terrains.includes(tile.terrain)) {
		return { ok: false, reason: 'wrong_terrain' };
	}
	if (state.materials < cost) return { ok: false, reason: 'too_expensive' };
	return { ok: true, cost };
}

/** Applies a player action in place; returns false when it was not allowed. */
export function applyAction(state: GameState, tool: ToolId, tileId: number): boolean {
	const tile = state.tiles[tileId];
	const check = checkAction(state, tool, tile);
	if (!check.ok) return false;

	switch (tool) {
		case 'demolish': {
			// Half the materials come back out of the rubble.
			state.materials += toolRefund(tool, tile);
			tile.building = null;
			tile.upgraded = false;
			state.population = Math.min(state.population, computeFlows(state).housing);
			break;
		}
		case 'clear':
			state.materials += toolRefund(tool, tile);
			tile.terrain = 'meadow';
			tile.vitality = 0;
			break;
		case 'plant':
			state.materials -= check.cost;
			tile.terrain = 'forest';
			tile.vitality = 25;
			break;
		case 'upgrade':
			state.materials -= check.cost;
			tile.upgraded = true;
			break;
		case 'inspect':
			return false;
		default:
			state.materials -= check.cost;
			tile.building = tool;
	}
	return true;
}

// ---------------------------------------------------------------------------
// The season tick
// ---------------------------------------------------------------------------

function log(state: GameState, key: string, tone: LogEntry['tone'], params?: LogEntry['params']) {
	state.log.push({ turn: state.turn, key, tone, params });
}

export function advanceSeason(state: GameState): void {
	if (state.outcome !== 'playing' || state.pendingEvent) return;

	const flows = computeFlows(state);
	const r = ratios(flows);

	state.materials += Math.round(flows.materialsIncome);

	for (const tile of state.tiles) {
		const def = tile.building ? BUILDINGS[tile.building] : null;
		if (def?.oreUse && tile.ore > 0) {
			tile.ore = Math.max(0, tile.ore - def.oreUse);
			if (tile.ore === 0) {
				log(state, 'ore_exhausted', 'bad', { building: def.id });
				tile.terrain = 'barren';
				tile.building = null;
				tile.upgraded = false;
			}
		}
	}

	const regrowth = state.tiles.map((tile) =>
		tile.terrain === 'forest'
			? BALANCE.forestRegrowth +
				BALANCE.forestNeighbourRegrowth * forestNeighbours(state.tiles, tile)
			: 0
	);
	state.tiles.forEach((tile, index) => {
		if (tile.terrain !== 'forest') return;
		const cut = tile.building === 'sawmill' ? BALANCE.sawmillCut : 0;
		tile.vitality = clamp(tile.vitality + regrowth[index] - cut, 0, 100);
		if (tile.vitality <= 0) {
			tile.terrain = 'meadow';
			tile.building = null;
			tile.upgraded = false;
			log(state, 'forest_lost', 'bad');
		}
	});

	state.groundwater = clamp(
		state.groundwater - flows.waterSupply * flows.drainRate + flows.groundwaterRecharge,
		0,
		100
	);
	if (state.groundwater < 20) log(state, 'groundwater_low', 'bad');

	state.pollution = clamp(
		state.pollution + flows.emissions - flows.absorption - state.pollution * BALANCE.pollutionDecay,
		0,
		100
	);

	state.nature += (natureTarget(state) - state.nature) * BALANCE.natureInertia;
	state.happiness += (happinessTarget(state, flows) - state.happiness) * BALANCE.happinessInertia;

	const supply = Math.min(r.food, r.waterDelivered, r.energy);
	const housing = flows.housing;
	if (supply >= 0.95 && state.happiness >= 45 && state.population < housing) {
		const rate = 0.08 + 0.12 * ((state.happiness - 45) / 55);
		const growth = Math.min(
			housing - state.population,
			Math.max(1, Math.round(state.population * rate))
		);
		state.population += growth;
		log(state, 'growth', 'good', { count: growth });
	} else if (supply < 0.85) {
		const loss = Math.max(1, Math.round(state.population * (1 - supply) * 0.35));
		state.population = Math.max(0, state.population - loss);
		const kind =
			r.food <= r.waterDelivered && r.food <= r.energy
				? 'food'
				: r.waterDelivered <= r.energy
					? 'water'
					: 'energy';
		log(state, `shortage_${kind}`, 'bad', { count: loss });
	} else if (state.happiness < 30) {
		const loss = Math.max(1, Math.round(state.population * 0.06));
		state.population = Math.max(0, state.population - loss);
		log(state, 'emigration', 'bad', { count: loss });
	}

	for (const effect of state.effects) effect.turnsLeft--;
	state.effects = state.effects.filter((e) => e.turnsLeft > 0);

	state.turn++;

	const value = harmony(state);
	state.harmonyHistory.push(value);
	state.populationHistory.push(state.population);
	state.lowHarmonyStreak = value < BALANCE.sinkThreshold ? state.lowHarmonyStreak + 1 : 0;
	if (state.lowHarmonyStreak === 2) log(state, 'sinking', 'bad');

	if (state.population <= 0) {
		state.outcome = 'lost_empty';
	} else if (state.lowHarmonyStreak >= BALANCE.sinkSeasons) {
		state.outcome = 'lost_sunk';
	} else if (state.turn >= BALANCE.totalTurns) {
		const reached = state.population >= BALANCE.populationGoal && value >= BALANCE.harmonyGoal;
		state.outcome = reached ? 'won' : 'lost_goal';
	}

	if (state.outcome === 'playing') {
		const random = createRandom(state.seed);
		rollEvent(state, random);
		state.seed = random.seed;
	}
}
