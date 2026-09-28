export type Terrain = 'meadow' | 'forest' | 'lake' | 'mountain' | 'barren';

export type BuildingId =
	| 'house'
	| 'farm'
	| 'garden'
	| 'coal'
	| 'wind'
	| 'solar'
	| 'mine'
	| 'sawmill'
	| 'waterworks'
	| 'recycling'
	| 'park';

/** Everything the player can do to a tile; `inspect` is the neutral pointer. */
export type ToolId = BuildingId | 'upgrade' | 'plant' | 'clear' | 'demolish' | 'inspect';

export type Season = 0 | 1 | 2 | 3;

export type Tile = {
	id: number;
	q: number;
	r: number;
	terrain: Terrain;
	building: BuildingId | null;
	/** Upgraded buildings swap in their `upgrade` stats. */
	upgraded: boolean;
	/** Ore left in a mountain; mines and coal plants dig it out. */
	ore: number;
	/** Forest growth 0–100; sawmills cut it, neighbouring forest regrows it. */
	vitality: number;
};

export type EffectKind = 'drought' | 'pests' | 'storm' | 'heatwave';

export type ActiveEffect = {
	kind: EffectKind;
	turnsLeft: number;
};

export type LogTone = 'good' | 'bad' | 'neutral';

export type LogEntry = {
	turn: number;
	/** Paraglide message key suffix, resolved in the component. */
	key: string;
	params?: Record<string, string | number>;
	tone: LogTone;
};

export type Outcome = 'playing' | 'won' | 'lost_sunk' | 'lost_empty' | 'lost_goal';

export type GameState = {
	turn: number;
	tiles: Tile[];
	materials: number;
	population: number;
	groundwater: number;
	pollution: number;
	nature: number;
	happiness: number;
	effects: ActiveEffect[];
	solarTech: number;
	windTech: number;
	/** Seasons in a row with harmony under the sinking threshold. */
	lowHarmonyStreak: number;
	harmonyHistory: number[];
	populationHistory: number[];
	log: LogEntry[];
	pendingEvent: string | null;
	lastEvent: string | null;
	outcome: Outcome;
	seed: number;
};

export type Flows = {
	foodProduction: number;
	foodDemand: number;
	waterCapacity: number;
	waterSupply: number;
	/** Groundwater drawn per unit delivered, averaged over all waterworks. */
	drainRate: number;
	waterDemand: number;
	energyProduction: number;
	energyDemand: number;
	materialsIncome: number;
	emissions: number;
	absorption: number;
	housing: number;
	parks: number;
	groundwaterRecharge: number;
};

export type Scores = {
	food: number;
	water: number;
	energy: number;
	nature: number;
	air: number;
	happiness: number;
};

/** A floating "+6" / "−4" over a tile after an action. */
export type Popup = { id: number; tileId: number; text: string; tone: 'good' | 'bad' };
