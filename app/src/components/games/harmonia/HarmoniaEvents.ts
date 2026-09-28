import { BALANCE, stat } from './HarmoniaConfig.ts';
import { pick, type Random } from './HarmoniaMap.ts';
import type { EffectKind, GameState, LogTone } from './HarmoniaTypes.ts';

type EventChoice = {
	id: string;
	tone: LogTone;
	apply: (state: GameState) => void;
};

type EventDef = {
	id: string;
	tone: LogTone;
	when: (state: GameState) => boolean;
	/** Instant events apply straight away; the others wait for a choice. */
	apply?: (state: GameState, random: Random) => void;
	choices?: EventChoice[];
};

const season = (state: GameState) => state.turn % 4;
const count = (state: GameState, building: string) =>
	state.tiles.filter((t) => t.building === building).length;
const housing = (state: GameState) =>
	state.tiles.reduce((sum, tile) => sum + stat(tile, 'housing'), 0);

function addEffect(state: GameState, kind: EffectKind) {
	state.effects.push({ kind, turnsLeft: 1 });
}

function shift(
	state: GameState,
	key: 'happiness' | 'nature' | 'pollution' | 'groundwater',
	by: number
) {
	state[key] = Math.min(100, Math.max(0, state[key] + by));
}

export const EVENTS: EventDef[] = [
	{
		id: 'drought',
		tone: 'bad',
		when: (s) => season(s) === 1,
		apply: (s) => addEffect(s, 'drought')
	},
	{
		id: 'pests',
		tone: 'bad',
		when: (s) => count(s, 'farm') >= 2,
		apply: (s) => addEffect(s, 'pests')
	},
	{
		id: 'storm',
		tone: 'neutral',
		when: (s) => season(s) >= 2,
		apply: (s) => addEffect(s, 'storm')
	},
	{
		id: 'heatwave',
		tone: 'bad',
		when: (s) => season(s) === 1,
		apply: (s) => addEffect(s, 'heatwave')
	},
	{
		id: 'wildfire',
		tone: 'bad',
		when: (s) =>
			season(s) === 1 &&
			(s.pollution >= 30 || s.groundwater < 35) &&
			s.tiles.some((t) => t.terrain === 'forest'),
		apply: (s, random) => {
			const forest = pick(
				s.tiles.filter((t) => t.terrain === 'forest'),
				random
			);
			forest.terrain = 'meadow';
			forest.building = null;
			forest.upgraded = false;
			forest.vitality = 0;
		}
	},
	{
		id: 'rain',
		tone: 'good',
		when: (s) => season(s) === 0 || season(s) === 2,
		apply: (s) => shift(s, 'groundwater', 20)
	},
	{
		id: 'birds',
		tone: 'good',
		when: (s) => s.nature >= 65,
		apply: (s) => shift(s, 'happiness', 8)
	},
	{
		id: 'smog',
		tone: 'bad',
		when: (s) => s.pollution >= 40,
		apply: (s) => shift(s, 'happiness', -10)
	},
	{
		id: 'festival',
		tone: 'good',
		when: (s) => s.happiness >= 60 && s.population >= 15,
		apply: (s) => shift(s, 'happiness', 6)
	},
	{
		id: 'tourists',
		tone: 'good',
		when: (s) => (s.harmonyHistory.at(-1) ?? 0) >= 70,
		apply: (s) => {
			s.materials += 8;
		}
	},
	{
		id: 'investor',
		tone: 'neutral',
		when: (s) => s.turn >= 3,
		choices: [
			{
				id: 'accept',
				tone: 'bad',
				apply: (s) => {
					s.materials += 15;
					shift(s, 'pollution', 12);
					shift(s, 'nature', -8);
				}
			},
			{ id: 'decline', tone: 'good', apply: (s) => shift(s, 'happiness', 4) }
		]
	},
	{
		id: 'grant',
		tone: 'good',
		when: (s) => s.turn >= 6 && s.solarTech + s.windTech < 3,
		choices: [
			{ id: 'solar', tone: 'good', apply: (s) => s.solarTech++ },
			{ id: 'wind', tone: 'good', apply: (s) => s.windTech++ }
		]
	},
	{
		id: 'families',
		tone: 'neutral',
		when: (s) => housing(s) - s.population >= 3,
		choices: [
			{
				id: 'accept',
				tone: 'good',
				apply: (s) => {
					s.population += Math.min(6, housing(s) - s.population);
					shift(s, 'happiness', 4);
				}
			},
			{ id: 'decline', tone: 'neutral', apply: (s) => shift(s, 'happiness', -3) }
		]
	},
	{
		id: 'timber',
		tone: 'neutral',
		when: (s) => s.tiles.filter((t) => t.terrain === 'forest' && !t.building).length >= 3,
		choices: [
			{
				id: 'accept',
				tone: 'bad',
				apply: (s) => {
					const forest = s.tiles
						.filter((t) => t.terrain === 'forest' && !t.building)
						.sort((a, b) => b.vitality - a.vitality)[0];
					forest.terrain = 'meadow';
					forest.vitality = 0;
					s.materials += 12;
				}
			},
			{ id: 'decline', tone: 'good', apply: (s) => shift(s, 'nature', 3) }
		]
	}
];

export function findEvent(id: string): EventDef | undefined {
	return EVENTS.find((e) => e.id === id);
}

export function rollEvent(state: GameState, random: Random) {
	if (random.next() >= BALANCE.eventChance) return;
	const eligible = EVENTS.filter((e) => e.id !== state.lastEvent && e.when(state));
	if (eligible.length === 0) return;

	const event = pick(eligible, random);
	state.lastEvent = event.id;
	if (event.choices) {
		state.pendingEvent = event.id;
		return;
	}
	event.apply!(state, random);
	state.log.push({ turn: state.turn, key: `event_${event.id}`, tone: event.tone });
}

export function resolveEvent(state: GameState, choiceId: string) {
	const event = state.pendingEvent ? findEvent(state.pendingEvent) : undefined;
	const choice = event?.choices?.find((c) => c.id === choiceId);
	if (!event || !choice) return;
	choice.apply(state);
	state.log.push({ turn: state.turn, key: `event_${event.id}_${choice.id}`, tone: choice.tone });
	state.pendingEvent = null;
}
