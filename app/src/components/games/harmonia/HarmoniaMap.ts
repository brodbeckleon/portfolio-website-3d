import { BALANCE } from './HarmoniaConfig.ts';
import type { Terrain, Tile } from './HarmoniaTypes.ts';

const DIRECTIONS: [number, number][] = [
	[1, 0],
	[1, -1],
	[0, -1],
	[-1, 0],
	[-1, 1],
	[0, 1]
];

/** mulberry32: small, fast and good enough to make a seed replayable. */
export function createRandom(seed: number) {
	let state = seed >>> 0;
	return {
		next(): number {
			state = (state + 0x6d2b79f5) >>> 0;
			let t = state;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		},
		get seed(): number {
			return state;
		}
	};
}

export type Random = ReturnType<typeof createRandom>;

export function pick<T>(items: T[], random: Random): T {
	return items[Math.floor(random.next() * items.length)];
}

export function hexDistance(q: number, r: number): number {
	return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

function tileDistance(a: Tile, b: Tile): number {
	return hexDistance(a.q - b.q, a.r - b.r);
}

export function neighbours(tiles: Tile[], tile: Tile): Tile[] {
	const result: Tile[] = [];
	for (const [dq, dr] of DIRECTIONS) {
		const found = tiles.find((t) => t.q === tile.q + dq && t.r === tile.r + dr);
		if (found) result.push(found);
	}
	return result;
}

export function forestNeighbours(tiles: Tile[], tile: Tile): number {
	return neighbours(tiles, tile).filter((t) => t.terrain === 'forest').length;
}

function growCluster(
	tiles: Tile[],
	start: Tile,
	size: number,
	terrain: Terrain,
	random: Random,
	allowed: (tile: Tile) => boolean
) {
	const cluster: Tile[] = [start];
	start.terrain = terrain;
	while (cluster.length < size) {
		const frontier = cluster
			.flatMap((tile) => neighbours(tiles, tile))
			.filter((tile) => tile.terrain === 'meadow' && allowed(tile));
		if (frontier.length === 0) return;
		const next = pick(frontier, random);
		next.terrain = terrain;
		cluster.push(next);
	}
}

/**
 * A round island: a lake on one rim, a mountain range on the far rim and two
 * woods in between, with a small hamlet already standing near the middle.
 */
export function generateIsland(random: Random): Tile[] {
	const radius = BALANCE.mapRadius;
	const tiles: Tile[] = [];
	for (let r = -radius; r <= radius; r++) {
		for (let q = -radius; q <= radius; q++) {
			if (hexDistance(q, r) > radius) continue;
			tiles.push({
				id: tiles.length,
				q,
				r,
				terrain: 'meadow',
				building: null,
				upgraded: false,
				ore: 0,
				vitality: 0
			});
		}
	}

	const rim = tiles.filter((t) => hexDistance(t.q, t.r) === radius);
	const centre = tiles.find((t) => t.q === 0 && t.r === 0)!;
	const lakeStart = pick(rim, random);
	growCluster(tiles, lakeStart, 4, 'lake', random, (t) => hexDistance(t.q, t.r) >= 2);

	const farRim = rim.filter((t) => tileDistance(t, lakeStart) >= radius + 1);
	const mountainStart = pick(farRim, random);
	growCluster(tiles, mountainStart, 5, 'mountain', random, (t) => hexDistance(t.q, t.r) >= 2);

	for (const size of [6, 5]) {
		const candidates = tiles.filter(
			(t) => t.terrain === 'meadow' && t !== centre && hexDistance(t.q, t.r) >= 2
		);
		growCluster(tiles, pick(candidates, random), size, 'forest', random, (t) => t !== centre);
	}

	for (const tile of tiles) {
		if (tile.terrain === 'mountain') tile.ore = BALANCE.mountainOre;
		if (tile.terrain === 'forest') tile.vitality = 100;
	}

	centre.building = 'house';
	const farmSpot = neighbours(tiles, centre).find((t) => t.terrain === 'meadow');
	if (farmSpot) farmSpot.building = 'farm';
	const lakes = tiles.filter((t) => t.terrain === 'lake');
	const nearestLake = lakes.sort((a, b) => tileDistance(a, centre) - tileDistance(b, centre))[0];
	nearestLake.building = 'waterworks';

	return tiles;
}
