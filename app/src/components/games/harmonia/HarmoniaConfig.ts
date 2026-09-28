import type { BuildingId, Season, Terrain, Tile } from './HarmoniaTypes.ts';

export type StatKey =
	| 'food'
	| 'water'
	| 'energy'
	| 'materials'
	| 'housing'
	| 'waterUse'
	| 'energyUse'
	| 'emissions'
	/** Groundwater drawn per unit of water delivered. */
	| 'drain';

export type UpgradeDef = { cost: number } & Partial<Record<StatKey, number>>;

export type BuildingDef = {
	id: BuildingId;
	cost: number;
	terrains: Terrain[];
	/** Base output per season, before seasons, tech and events. */
	food?: number;
	water?: number;
	energy?: number;
	materials?: number;
	housing?: number;
	/** Groundwater drawn per unit of water delivered. */
	drain?: number;
	/** Upkeep per season. */
	waterUse?: number;
	energyUse?: number;
	oreUse?: number;
	/** Positive pollutes, negative cleans. */
	emissions?: number;
	/** How much of the tile's wildlife survives next to this building, 0–1. */
	natureWeight: number;
	/** Orb colour of the building badge on the island. */
	colour: string;
	/** Denser or cleaner second level; unlisted stats keep their base value. */
	upgrade?: UpgradeDef;
};

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
	house: {
		id: 'house',
		cost: 6,
		terrains: ['meadow', 'barren'],
		housing: 10,
		energyUse: 0.5,
		natureWeight: 0.1,
		colour: '#f59e0b',
		upgrade: { cost: 12, housing: 22, energyUse: 1 }
	},
	farm: {
		id: 'farm',
		cost: 4,
		terrains: ['meadow'],
		food: 6,
		waterUse: 1.5,
		emissions: 1,
		natureWeight: 0.15,
		colour: '#eab308',
		upgrade: { cost: 10, food: 10, waterUse: 1, energyUse: 1.5 }
	},
	garden: {
		id: 'garden',
		cost: 5,
		terrains: ['meadow'],
		food: 3,
		waterUse: 0.5,
		natureWeight: 0.55,
		colour: '#ec4899',
		upgrade: { cost: 6, food: 5 }
	},
	coal: {
		id: 'coal',
		cost: 8,
		terrains: ['mountain'],
		energy: 10,
		oreUse: 1,
		emissions: 4,
		natureWeight: 0,
		colour: '#64748b',
		upgrade: { cost: 10, energy: 9, emissions: 1.5 }
	},
	wind: {
		id: 'wind',
		cost: 6,
		terrains: ['meadow', 'mountain', 'barren'],
		energy: 3,
		natureWeight: 0.4,
		colour: '#38bdf8',
		upgrade: { cost: 8, energy: 5 }
	},
	solar: {
		id: 'solar',
		cost: 7,
		terrains: ['meadow', 'barren'],
		energy: 4,
		natureWeight: 0.2,
		colour: '#2563eb',
		upgrade: { cost: 8, energy: 6 }
	},
	mine: {
		id: 'mine',
		cost: 3,
		terrains: ['mountain'],
		materials: 4,
		oreUse: 2,
		energyUse: 1,
		emissions: 2,
		natureWeight: 0,
		colour: '#a16207'
	},
	sawmill: {
		id: 'sawmill',
		cost: 3,
		terrains: ['forest'],
		materials: 3,
		energyUse: 0.5,
		natureWeight: 0.6,
		colour: '#92400e'
	},
	waterworks: {
		id: 'waterworks',
		cost: 5,
		terrains: ['lake'],
		water: 8,
		drain: 0.6,
		energyUse: 1,
		natureWeight: 0.5,
		colour: '#06b6d4',
		upgrade: { cost: 8, water: 10, drain: 0.35, energyUse: 1.5 }
	},
	recycling: {
		id: 'recycling',
		cost: 8,
		terrains: ['meadow', 'barren'],
		materials: 2,
		energyUse: 1,
		emissions: -2,
		natureWeight: 0.1,
		colour: '#10b981',
		upgrade: { cost: 10, materials: 3, emissions: -3.5 }
	},
	park: {
		id: 'park',
		cost: 3,
		terrains: ['meadow', 'barren'],
		natureWeight: 0.75,
		colour: '#22c55e'
	}
};

/** A building's effective value for one stat, upgrade included. */
export function stat(tile: Pick<Tile, 'building' | 'upgraded'>, key: StatKey): number {
	if (!tile.building) return 0;
	const def = BUILDINGS[tile.building];
	const upgraded = tile.upgraded ? def.upgrade?.[key] : undefined;
	return upgraded ?? def[key] ?? 0;
}

export function investedCost(tile: Pick<Tile, 'building' | 'upgraded'>): number {
	if (!tile.building) return 0;
	const def = BUILDINGS[tile.building];
	return def.cost + (tile.upgraded ? (def.upgrade?.cost ?? 0) : 0);
}

export const BUILD_ORDER: BuildingId[] = [
	'house',
	'farm',
	'garden',
	'waterworks',
	'wind',
	'solar',
	'coal',
	'mine',
	'sawmill',
	'recycling',
	'park'
];

/** Planting a forest is cheap on meadow but a quarry has to be refilled first. */
export const PLANT_COST: Partial<Record<Terrain, number>> = { meadow: 2, barren: 4 };
export const CLEAR_YIELD = 6;

export const NATURE_WEIGHT: Record<Terrain, number> = {
	meadow: 0.6,
	forest: 1,
	lake: 0.8,
	mountain: 0.6,
	barren: 0
};

export const SEASONS: Season[] = [0, 1, 2, 3];
export const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'] as const;
export const SOLAR_FACTOR = [1, 1.4, 0.8, 0.4];
export const WIND_FACTOR = [1, 0.7, 1.2, 1.4];
export const RAIN = [14, 5, 11, 8];
/** Heating in winter, cooling in summer. */
export const ENERGY_DEMAND_FACTOR = [1, 1.05, 1, 1.2];

export const BALANCE = {
	mapRadius: 3,
	totalTurns: 40,
	startMaterials: 22,
	startPopulation: 8,
	startGroundwater: 70,
	startHappiness: 70,
	mountainOre: 26,
	foodPerPerson: 0.5,
	waterPerPerson: 0.3,
	energyPerPerson: 0.25,
	baseMaterials: 1,
	/** Every this many residents run one more workshop. */
	peoplePerMaterial: 15,
	/** Consumption per head creeps up every season, as wealth does. */
	demandGrowth: 0.01,
	/** Rain thins out a little every season: the climate is shifting. */
	rainDecline: 0.008,
	forestRecharge: 0.5,
	forestAbsorption: 0.35,
	pollutionDecay: 0.1,
	natureScale: 135,
	natureInertia: 0.25,
	happinessInertia: 0.35,
	sawmillCut: 10,
	forestRegrowth: 3,
	forestNeighbourRegrowth: 2,
	gardenForestBonus: 1,
	populationGoal: 60,
	harmonyGoal: 60,
	sinkThreshold: 25,
	sinkSeasons: 4,
	eventChance: 0.45
} as const;

export const STAR_THRESHOLDS = [60, 72, 82];
