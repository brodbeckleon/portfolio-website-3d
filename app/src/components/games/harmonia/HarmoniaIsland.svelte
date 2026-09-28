<script lang="ts">
	import { Axe, Droplets, Pickaxe, Recycle, Trees } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import { BALANCE, BUILDINGS } from './HarmoniaConfig.ts';
	import { hexDistance } from './HarmoniaMap.ts';
	import { hasEffect, seasonOf } from './HarmoniaSimulation.ts';
	import type { BuildingId, GameState, Popup, Tile, ToolId } from './HarmoniaTypes.ts';

	interface IslandProps {
		game: GameState;
		harmony: number;
		tool: ToolId;
		validIds: ReadonlySet<number>;
		hoveredId: number | null;
		popups: Popup[];
		describe: (tile: Tile) => string;
		onTileClick: (tile: Tile) => void;
	}

	let {
		game,
		harmony,
		tool,
		validIds,
		hoveredId = $bindable(),
		popups,
		describe,
		onTileClick
	}: IslandProps = $props();

	const HEX = 34;
	const SQUASH = 0.62;
	const THICK = 12;
	const SQRT3 = Math.sqrt(3);

	const tileX = (t: Tile) => HEX * SQRT3 * (t.q + t.r / 2);
	const tileY = (t: Tile) => HEX * 1.5 * t.r * SQUASH;

	const corners = Array.from({ length: 6 }, (_, i) => {
		const angle = (Math.PI / 180) * (60 * i - 30);
		return [HEX * Math.cos(angle), HEX * Math.sin(angle) * SQUASH] as const;
	});
	const hexPoints = corners.map(([x, y]) => `${x},${y}`).join(' ');
	const innerHexPoints = (scale: number) =>
		corners.map(([x, y]) => `${x * scale},${y * scale}`).join(' ');
	// Right, bottom and left lower edges, extruded downwards: the tile's visible side.
	const sidePoints = [
		...corners.slice(0, 4),
		...corners
			.slice(0, 4)
			.reverse()
			.map(([x, y]) => [x, y + THICK] as const)
	]
		.map(([x, y]) => `${x},${y}`)
		.join(' ');

	/** Pollinator badges and other orb buildings; the rest get drawn art. */
	const ORB_ICONS: Partial<Record<BuildingId, Component>> = {
		mine: Pickaxe,
		sawmill: Axe,
		waterworks: Droplets,
		recycling: Recycle,
		park: Trees
	};

	const PALETTES = [
		{
			meadow: ['#b4ef72', '#5cbf3a'],
			canopy: ['#a6f283', '#2f9e45'],
			forest: ['#6cc04a', '#2b7f2f']
		},
		{
			meadow: ['#a3e55f', '#44a52f'],
			canopy: ['#7be062', '#1d8638'],
			forest: ['#5cb040', '#236f28']
		},
		{
			meadow: ['#d3d869', '#93a83a'],
			canopy: ['#ffc861', '#d9661f'],
			forest: ['#a8a24a', '#6e6a26']
		},
		{
			meadow: ['#e9f4ee', '#b3cfc0'],
			canopy: ['#eef8f4', '#93b8ad'],
			forest: ['#cfe3d9', '#8fb0a1']
		}
	];

	let season = $derived(seasonOf(game));
	let palette = $derived(PALETTES[season]);
	let winter = $derived(season === 3);
	let ordered = $derived([...game.tiles].sort((a, b) => a.r - b.r || a.q - b.q));

	let sink = $derived(Math.min(55, Math.max(0, 62 - harmony) * 1.1));
	let saturation = $derived(0.35 + (Math.min(100, harmony) / 100) * 0.85);
	let smog = $derived((game.pollution / 100) * 0.55);
	let showBirds = $derived(game.nature >= 55);
	let showDolphins = $derived(harmony >= 75);
	let showRainbow = $derived(harmony >= 82);
	let storm = $derived(hasEffect(game, 'storm'));
	let drought = $derived(hasEffect(game, 'drought'));
	let heatwave = $derived(hasEffect(game, 'heatwave'));
	let lakeLevel = $derived(0.45 + Math.min(1, game.groundwater / 60) * 0.55);

	let waterfallLake = $derived(
		game.groundwater > 25
			? game.tiles
					.filter(
						(t) => t.terrain === 'lake' && t.r >= 1 && hexDistance(t.q, t.r) === BALANCE.mapRadius
					)
					.sort((a, b) => b.r - a.r)[0]
			: undefined
	);

	let ghost = $derived.by(() => {
		if (hoveredId === null || !validIds.has(hoveredId)) return null;
		const tile = game.tiles[hoveredId];
		if (tool in BUILDINGS) return { tile, building: tool as BuildingId, upgraded: false };
		if (tool === 'upgrade' && tile.building)
			return { tile, building: tile.building, upgraded: true };
		return null;
	});

	function onKey(event: KeyboardEvent, tile: Tile) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onTileClick(tile);
		}
	}

	// Fixed pseudo-random flower spots so meadows don't flicker between renders.
	const flowerSpots = (tile: Tile) =>
		[0, 1, 2, 3].map((i) => {
			const seed = Math.sin(tile.id * 12.9898 + i * 78.233) * 43758.5453;
			const f = seed - Math.floor(seed);
			const g = (seed * 7.13) % 1;
			return {
				x: (f - 0.5) * 36,
				y: (Math.abs(g) - 0.5) * 18,
				colour: ['#ff7eb6', '#ffe45c', '#ffffff', '#c084fc'][i]
			};
		});
</script>

{#snippet orbBadge(building: BuildingId, upgraded: boolean)}
	{@const Icon = ORB_ICONS[building]!}
	<ellipse cx="0" cy="3" rx="11" ry="4" fill="rgba(0,0,0,0.25)" />
	<g transform="translate(0,-14)">
		<circle r="12" fill="url(#orb-{building})" stroke="rgba(255,255,255,0.8)" stroke-width="1" />
		<ellipse cx="0" cy="-6" rx="8" ry="4.5" fill="url(#gloss)" />
		<Icon x={-7} y={-7} size={14} color="white" strokeWidth={2.6} />
		{#if upgraded}
			<circle r="14" fill="none" stroke="#ffd966" stroke-width="2" />
		{/if}
	</g>
{/snippet}

{#snippet buildingArt(building: BuildingId, upgraded: boolean)}
	{#if building === 'house'}
		{#if upgraded}
			<ellipse cx="0" cy="6" rx="16" ry="5" fill="rgba(0,0,0,0.25)" />
			<rect
				x="-11"
				y="-30"
				width="22"
				height="36"
				rx="3"
				fill="url(#glass-tower)"
				stroke="rgba(255,255,255,0.8)"
			/>
			{#each [-22, -14, -6, 2] as y (y)}
				<line x1="-8" x2="8" y1={y} y2={y} stroke="rgba(255,255,255,0.55)" stroke-width="1.2" />
			{/each}
			<ellipse cx="0" cy="-30" rx="11" ry="3.5" fill="#58c24a" />
			<circle cx="-4" cy="-33" r="3" fill="#7be062" />
			<circle cx="4" cy="-32" r="2.5" fill="#4caf50" />
		{:else}
			{#each [[-10, -1], [9, 3]] as [x, y] (x)}
				<g transform="translate({x},{y})">
					<ellipse cx="0" cy="2" rx="9" ry="3" fill="rgba(0,0,0,0.22)" />
					<rect x="-7" y="-9" width="14" height="11" rx="1.5" fill="url(#house-wall)" />
					<polygon points="-9,-8 0,-17 9,-8" fill="url(#roof)" />
					<rect x="-3.5" y="-6" width="3" height="3" fill="#8fe3ff" />
					<rect x="1.5" y="-6" width="3" height="3" fill="#8fe3ff" />
				</g>
			{/each}
		{/if}
	{:else if building === 'farm'}
		<g clip-path="url(#hex-clip)">
			{#each [-24, -14, -4, 6, 16] as offset (offset)}
				<line
					x1={offset - 20}
					y1="-16"
					x2={offset + 20}
					y2="16"
					stroke={season === 3 ? '#d8cfa8' : '#f3cf3b'}
					stroke-width="5"
					stroke-linecap="round"
					opacity="0.9"
				/>
			{/each}
		</g>
		{#if upgraded}
			<path
				d="M-14,4 V-6 A14,10 0 0 1 14,-6 V4 Z"
				fill="rgba(210,245,255,0.55)"
				stroke="white"
				stroke-width="1.2"
			/>
			<line x1="0" y1="-16" x2="0" y2="4" stroke="white" stroke-width="0.8" />
			<ellipse cx="-5" cy="-10" rx="5" ry="2.5" fill="rgba(255,255,255,0.7)" />
		{:else}
			<g transform="translate(10,-2)">
				<rect x="-5" y="-8" width="10" height="9" fill="#d9483b" />
				<polygon points="-6,-7 0,-13 6,-7" fill="#9b2c22" />
				<rect x="-1.5" y="-4" width="3" height="5" fill="#fff3d6" />
			</g>
		{/if}
	{:else if building === 'garden'}
		{#each [[-14, -4, '#ff7eb6'], [-6, 2, '#ffe45c'], [2, -6, '#ff9f43'], [10, 0, '#c084fc'], [-2, 8, '#ff5e5e'], [14, 8, '#ffe45c']] as [x, y, colour] (`${x}${y}`)}
			<circle cx={x} cy={y} r="3.2" fill="#2f9e45" />
			<circle cx={x} cy={Number(y) - 1.5} r="2" fill={String(colour)} />
		{/each}
		<g transform="translate(-2,-6)">
			<rect x="-1" y="-2" width="2" height="7" fill="#7a4a22" />
			<circle cx="0" cy="-6" r={upgraded ? 8 : 6} fill="url(#canopy)" />
			{#if upgraded}
				<circle cx="-3" cy="-7" r="1.6" fill="#ff5e5e" />
				<circle cx="3" cy="-4" r="1.6" fill="#ffb13b" />
			{/if}
		</g>
	{:else if building === 'wind'}
		<g transform="scale({upgraded ? 1.3 : 1})">
			<ellipse cx="0" cy="2" rx="6" ry="2.5" fill="rgba(0,0,0,0.25)" />
			<path d="M-1.6,2 L-0.8,-34 L0.8,-34 L1.6,2 Z" fill="url(#pole)" />
			<g transform="translate(0,-34)">
				<g class="spin" style="animation-duration: {storm ? 0.9 : 2.8}s">
					<circle r="17" fill="none" />
					{#each [0, 120, 240] as angle (angle)}
						<path
							d="M-1.5,0 Q-2,-9 0,-17 Q2,-9 1.5,0 Z"
							fill="white"
							stroke="#c9d6e3"
							stroke-width="0.5"
							transform="rotate({angle})"
						/>
					{/each}
				</g>
				<circle r="2.4" fill="#eef4f8" stroke="#9fb2c4" stroke-width="0.6" />
			</g>
		</g>
	{:else if building === 'solar'}
		{#each upgraded ? [-10, -2, 6, 14] : [-8, 1, 10] as y (y)}
			<g transform="translate(0,{y})">
				<polygon
					points="-18,0 -12,-7 16,-7 10,0"
					fill="url(#panel)"
					stroke="#dbeafe"
					stroke-width="0.8"
				/>
				<line
					x1="-15"
					y1="-3.5"
					x2="13"
					y2="-3.5"
					stroke="rgba(255,255,255,0.45)"
					stroke-width="0.6"
				/>
				<line x1="-2" y1="0" x2="4" y2="-7" stroke="rgba(255,255,255,0.35)" stroke-width="0.6" />
			</g>
		{/each}
	{:else if building === 'coal'}
		<ellipse cx="0" cy="4" rx="16" ry="5" fill="rgba(0,0,0,0.3)" />
		<rect x="-14" y="-12" width="20" height="16" rx="1.5" fill="url(#concrete)" />
		<rect x="7" y="-30" width="6" height="34" fill="url(#chimney)" />
		<rect x="7" y="-24" width="6" height="3" fill="#dc2626" />
		<rect x="-10" y="-7" width="4" height="4" fill="#fde68a" />
		<rect x="-3" y="-7" width="4" height="4" fill="#fde68a" />
		<g transform="translate(10,-32)" class="smoke" class:smoke--filtered={upgraded}>
			<circle r="5" />
			<circle r="6" />
			<circle r="7" />
		</g>
	{:else}
		{@render orbBadge(building, upgraded)}
	{/if}
{/snippet}

<svg
	class="island-scene"
	viewBox="-260 -205 520 425"
	style="filter: saturate({saturation});"
	aria-hidden="false"
>
	<defs>
		<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={storm ? '#50708f' : '#2aa7ef'} />
			<stop offset="0.55" stop-color={storm ? '#9fb4c6' : '#8fdcff'} />
			<stop offset="1" stop-color={drought ? '#ffeab5' : '#e8fbff'} />
		</linearGradient>
		<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0" stop-color="#fffef2" />
			<stop offset="0.35" stop-color={heatwave ? '#ffd45c' : '#fff6b8'} stop-opacity="0.95" />
			<stop offset="1" stop-color={heatwave ? '#ff9d2e' : '#fff6b8'} stop-opacity="0" />
		</radialGradient>
		<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#6fe3ff" />
			<stop offset="0.4" stop-color="#16a4d8" />
			<stop offset="1" stop-color="#0a5d9c" />
		</linearGradient>
		<linearGradient id="rock" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#9a6a3a" />
			<stop offset="0.5" stop-color="#6b4424" />
			<stop offset="1" stop-color="#3a2413" />
		</linearGradient>
		<linearGradient id="soil-side" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#8f5e2e" />
			<stop offset="1" stop-color="#5b3a1c" />
		</linearGradient>
		<linearGradient id="stone-side" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#8a8378" />
			<stop offset="1" stop-color="#5a544b" />
		</linearGradient>
		<linearGradient id="t-meadow" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={palette.meadow[0]} />
			<stop offset="1" stop-color={palette.meadow[1]} />
		</linearGradient>
		<linearGradient id="t-forest" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={palette.forest[0]} />
			<stop offset="1" stop-color={palette.forest[1]} />
		</linearGradient>
		<linearGradient id="t-lake" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={winter ? '#e6fcff' : '#9af5ff'} />
			<stop offset="1" stop-color={winter ? '#8ccbe2' : '#1596d4'} />
		</linearGradient>
		<linearGradient id="t-shore" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#f3dfae" />
			<stop offset="1" stop-color="#d2b27a" />
		</linearGradient>
		<linearGradient id="t-mountain" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#bdb6a8" />
			<stop offset="1" stop-color="#8d8577" />
		</linearGradient>
		<linearGradient id="t-barren" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#d9bd8f" />
			<stop offset="1" stop-color="#a1804f" />
		</linearGradient>
		<linearGradient id="peak" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#d7d1c6" />
			<stop offset="0.5" stop-color="#9c9486" />
			<stop offset="1" stop-color="#6d665b" />
		</linearGradient>
		<linearGradient id="tile-gloss" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="white" stop-opacity="0.45" />
			<stop offset="0.5" stop-color="white" stop-opacity="0.05" />
			<stop offset="1" stop-color="white" stop-opacity="0" />
		</linearGradient>
		<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="white" stop-opacity="0.9" />
			<stop offset="1" stop-color="white" stop-opacity="0.05" />
		</linearGradient>
		<radialGradient id="canopy" cx="0.35" cy="0.3" r="0.75">
			<stop offset="0" stop-color={palette.canopy[0]} />
			<stop offset="1" stop-color={palette.canopy[1]} />
		</radialGradient>
		<radialGradient id="bubble" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0.6" stop-color="white" stop-opacity="0.05" />
			<stop offset="0.92" stop-color="white" stop-opacity="0.55" />
			<stop offset="1" stop-color="white" stop-opacity="0.9" />
		</radialGradient>
		<linearGradient id="house-wall" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fffaf0" />
			<stop offset="1" stop-color="#e8d9bd" />
		</linearGradient>
		<linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#ff9a6b" />
			<stop offset="1" stop-color="#d9481f" />
		</linearGradient>
		<linearGradient id="glass-tower" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#b8f1ff" />
			<stop offset="0.5" stop-color="#4cc3e6" />
			<stop offset="1" stop-color="#1b7fae" />
		</linearGradient>
		<linearGradient id="pole" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#ffffff" />
			<stop offset="1" stop-color="#b9c7d4" />
		</linearGradient>
		<linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#6aa9ff" />
			<stop offset="0.5" stop-color="#1d4ed8" />
			<stop offset="1" stop-color="#172f85" />
		</linearGradient>
		<linearGradient id="concrete" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#b6bcc6" />
			<stop offset="1" stop-color="#6b7280" />
		</linearGradient>
		<linearGradient id="chimney" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#d1d5db" />
			<stop offset="1" stop-color="#6b7280" />
		</linearGradient>
		<linearGradient id="waterfall" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#d9fbff" stop-opacity="0.95" />
			<stop offset="1" stop-color="#7fdcff" stop-opacity="0.1" />
		</linearGradient>
		<linearGradient id="swoosh" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#ffffff" stop-opacity="0" />
			<stop offset="0.5" stop-color="#e9fff0" stop-opacity="0.6" />
			<stop offset="1" stop-color="#b8ffda" stop-opacity="0" />
		</linearGradient>
		{#each Object.values(BUILDINGS) as def (def.id)}
			<radialGradient id="orb-{def.id}" cx="0.35" cy="0.3" r="0.8">
				<stop offset="0" stop-color="white" stop-opacity="0.9" />
				<stop offset="0.35" stop-color={def.colour} />
				<stop offset="1" stop-color={def.colour} stop-opacity="0.95" />
			</radialGradient>
		{/each}
		<clipPath id="hex-clip">
			<polygon points={innerHexPoints(0.82)} />
		</clipPath>
	</defs>

	<!-- Sky -->
	<rect x="-260" y="-205" width="520" height="425" fill="url(#sky)" />
	<g class="sun" transform="translate(185,-150)">
		<circle r={heatwave ? 95 : 70} fill="url(#sun)" />
		<g class="sun__rays">
			{#each Array.from({ length: 12 }, (_, i) => i * 30) as angle (angle)}
				<path d="M0,0 L-5,-120 L5,-120 Z" fill="white" opacity="0.12" transform="rotate({angle})" />
			{/each}
		</g>
	</g>
	<g opacity="0.55">
		<circle cx="120" cy="-95" r="10" fill="#fffbe0" opacity="0.4" />
		<circle cx="70" cy="-50" r="5" fill="#c8f7ff" opacity="0.5" />
		<circle cx="20" cy="-8" r="14" fill="none" stroke="#fff6c8" stroke-width="1.5" opacity="0.35" />
	</g>

	<path
		d="M-260,-40 C-150,-120 20,-10 260,-110 L260,-80 C40,10 -150,-80 -260,-10 Z"
		fill="url(#swoosh)"
		class="swoosh"
	/>
	<path
		d="M-260,10 C-120,-60 60,40 260,-50 L260,-38 C60,56 -130,-40 -260,22 Z"
		fill="url(#swoosh)"
		opacity="0.6"
		class="swoosh swoosh--slow"
	/>

	{#if showRainbow}
		<g opacity="0.32" fill="none" stroke-width="7">
			{#each ['#ff5e5e', '#ffb13b', '#ffe45c', '#5ee06a', '#3fa9ff', '#8b5cf6'] as colour, i (colour)}
				<path d="M-230,120 A{230 - i * 7},{210 - i * 7} 0 0 1 {230 - i * 14},120" stroke={colour} />
			{/each}
		</g>
	{/if}

	<g class="clouds" fill="white">
		<g class="cloud" style="animation-duration: 70s; animation-delay: -20s">
			<ellipse cx="0" cy="-150" rx="38" ry="14" opacity="0.9" />
			<ellipse cx="22" cy="-160" rx="24" ry="14" opacity="0.9" />
			<ellipse cx="-20" cy="-156" rx="18" ry="10" opacity="0.85" />
		</g>
		<g class="cloud" style="animation-duration: 95s; animation-delay: -60s">
			<ellipse cx="0" cy="-110" rx="30" ry="10" opacity="0.7" />
			<ellipse cx="16" cy="-117" rx="18" ry="10" opacity="0.7" />
		</g>
		{#if storm}
			<g class="cloud" style="animation-duration: 40s" fill="#5b6b7c">
				<ellipse cx="0" cy="-165" rx="70" ry="22" opacity="0.85" />
				<ellipse cx="40" cy="-175" rx="40" ry="20" opacity="0.8" />
			</g>
		{/if}
	</g>

	{#if showBirds}
		<g class="birds" fill="none" stroke="#1e3a5f" stroke-width="1.6" stroke-linecap="round">
			{#each [[0, -120, 0], [18, -128, -1.2], [34, -116, -0.6]] as [x, y, delay] (x)}
				<path
					class="bird"
					style="animation-delay: {delay}s"
					d="M{x - 6},{y} Q{x - 3},{y - 4} {x},{y} Q{x + 3},{y - 4} {x + 6},{y}"
				/>
			{/each}
		</g>
	{/if}

	<!-- Sea -->
	<rect x="-260" y="150" width="520" height="70" fill="url(#sea)" />
	<rect x="-260" y="150" width="520" height="3" fill="white" opacity="0.6" />
	<g class="shimmer" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.5">
		<line x1="-200" y1="170" x2="-160" y2="170" />
		<line x1="-60" y1="185" x2="-10" y2="185" />
		<line x1="90" y1="168" x2="130" y2="168" />
		<line x1="170" y1="198" x2="220" y2="198" />
	</g>
	{#if showDolphins}
		<g class="dolphin">
			<path
				d="M0,0 C8,-9 26,-10 36,-3 C39,-1 42,1 45,3 C41,3 38,2 35,1 C30,5 22,7 14,6 L9,12 L8,6 C4,5 1,3 0,0 Z M18,-8 L22,-16 L26,-7 Z"
				fill="#3b9ed8"
				stroke="#d6f4ff"
				stroke-width="0.8"
			/>
		</g>
	{/if}

	<!-- The floating island -->
	<g class="island" style="transform: translateY({sink}px)">
		<g class="island__bob">
			<path
				d="M-208,-8 C-205,60 -150,105 -80,138 C-40,158 -15,178 5,182 C25,176 45,150 90,128 C160,96 206,55 208,-8 Z"
				fill="url(#rock)"
			/>
			<path
				d="M-190,20 C-120,70 -40,80 20,72 M-150,70 C-90,105 -20,110 40,100 M-60,125 C-20,135 20,132 60,120"
				fill="none"
				stroke="rgba(0,0,0,0.18)"
				stroke-width="2"
			/>
			<path
				d="M-200,0 C-196,50 -160,88 -110,112"
				fill="none"
				stroke="rgba(255,255,255,0.22)"
				stroke-width="4"
				stroke-linecap="round"
			/>
			<g stroke="#5b3a1c" stroke-width="1.4" fill="none" opacity="0.8">
				<path d="M-120,110 q4,14 -2,26 q-4,8 2,16" />
				<path d="M60,118 q-3,12 3,22" />
				<path d="M-30,150 q3,10 -1,20" />
			</g>

			{#if waterfallLake}
				<g transform="translate({tileX(waterfallLake)},{tileY(waterfallLake) + HEX * SQUASH})">
					<rect
						x="-5"
						y="0"
						width="10"
						height={175 - tileY(waterfallLake)}
						fill="url(#waterfall)"
					/>
					<line
						class="waterfall-flow"
						x1="0"
						y1="0"
						x2="0"
						y2={175 - tileY(waterfallLake)}
						stroke="white"
						stroke-width="3"
						stroke-dasharray="6 10"
						opacity="0.7"
					/>
				</g>
			{/if}

			{#each ordered as tile (tile.id)}
				{@const valid = validIds.has(tile.id)}
				{@const hovered = hoveredId === tile.id}
				<g
					class="tile"
					class:tile--valid={valid}
					class:tile--dim={tool !== 'inspect' && !valid}
					transform="translate({tileX(tile)},{tileY(tile)})"
					role="button"
					tabindex="0"
					aria-label={describe(tile)}
					onclick={() => onTileClick(tile)}
					onkeydown={(event) => onKey(event, tile)}
					onpointerenter={() => (hoveredId = tile.id)}
					onpointerleave={() => (hoveredId = hoveredId === tile.id ? null : hoveredId)}
					onfocus={() => (hoveredId = tile.id)}
					onblur={() => (hoveredId = hoveredId === tile.id ? null : hoveredId)}
				>
					<polygon
						points={sidePoints}
						fill={tile.terrain === 'mountain' ? 'url(#stone-side)' : 'url(#soil-side)'}
					/>
					{#if tile.terrain === 'lake'}
						<polygon points={hexPoints} fill="url(#t-shore)" />
						<polygon points={innerHexPoints(0.92 * lakeLevel)} fill="url(#t-lake)" />
						<ellipse
							cx="-6"
							cy="-4"
							rx={10 * lakeLevel}
							ry={2.5 * lakeLevel}
							fill="white"
							opacity="0.55"
						/>
						<ellipse
							class="ripple"
							cx="6"
							cy="4"
							rx="5"
							ry="1.6"
							fill="none"
							stroke="white"
							stroke-width="0.8"
						/>
					{:else}
						<polygon points={hexPoints} fill="url(#t-{tile.terrain})" />
					{/if}
					<polygon
						points={hexPoints}
						fill="url(#tile-gloss)"
						stroke="rgba(255,255,255,0.35)"
						stroke-width="0.8"
					/>

					{#if tile.terrain === 'meadow' && !tile.building}
						{#if season === 0 && game.nature >= 40}
							{#each flowerSpots(tile) as spot, i (i)}
								<circle cx={spot.x} cy={spot.y} r="1.6" fill={spot.colour} />
							{/each}
						{:else}
							<path
								d="M-10,4 l2,-5 l2,5 M8,-2 l2,-5 l2,5 M-2,-8 l2,-4 l2,4"
								stroke="rgba(30,90,30,0.45)"
								stroke-width="1"
								fill="none"
							/>
						{/if}
					{:else if tile.terrain === 'barren' && !tile.building}
						<path
							d="M-14,-2 l6,3 l4,-4 l7,5 M4,8 l5,-3 l6,2"
							stroke="rgba(90,60,30,0.5)"
							stroke-width="1"
							fill="none"
						/>
					{:else if tile.terrain === 'mountain'}
						<polygon points="-20,6 -4,-28 12,6" fill="url(#peak)" />
						<polygon points="2,8 14,-14 26,8" fill="url(#peak)" opacity="0.9" />
						<polygon
							points={winter ? '-12,-11 -4,-28 4,-11 0,-14 -5,-10' : '-8,-19 -4,-28 0,-19 -3,-21'}
							fill="white"
						/>
						{#if tile.ore > 0 && tile.ore < BALANCE.mountainOre}
							<rect x="-12" y="12" width="24" height="3" rx="1.5" fill="rgba(0,0,0,0.3)" />
							<rect
								x="-12"
								y="12"
								width={(24 * tile.ore) / BALANCE.mountainOre}
								height="3"
								rx="1.5"
								fill="#fbbf24"
							/>
						{/if}
					{:else if tile.terrain === 'forest'}
						{@const scale = 0.45 + tile.vitality / 180}
						{#each [[-12, -2], [11, -5], [1, 7]] as [x, y] (x)}
							<g transform="translate({x},{y}) scale({scale})">
								<ellipse cx="0" cy="1" rx="7" ry="2.5" fill="rgba(0,0,0,0.22)" />
								<rect x="-1.5" y="-7" width="3" height="8" fill="#7a4a22" />
								<circle cx="0" cy="-14" r="10" fill="url(#canopy)" />
								<ellipse cx="-3" cy="-19" rx="5" ry="3" fill="white" opacity="0.35" />
							</g>
						{/each}
					{/if}

					{#if winter && tile.terrain !== 'lake'}
						<polygon points={innerHexPoints(0.9)} fill="white" opacity="0.28" />
					{/if}

					{#if tile.building && !(ghost && ghost.tile.id === tile.id && ghost.upgraded)}
						<g class="building">
							{@render buildingArt(tile.building, tile.upgraded)}
						</g>
					{/if}

					{#if ghost && ghost.tile.id === tile.id}
						<g class="ghost">
							{@render buildingArt(ghost.building, ghost.upgraded)}
						</g>
					{/if}

					{#if valid}
						<polygon points={hexPoints} class="tile__valid" />
					{/if}
					{#if hovered}
						<polygon points={hexPoints} class="tile__hover" />
					{/if}
				</g>
			{/each}

			{#each popups as popup (popup.id)}
				{@const tile = game.tiles[popup.tileId]}
				<text
					class="popup"
					class:popup--bad={popup.tone === 'bad'}
					x={tileX(tile)}
					y={tileY(tile) - 30}
					text-anchor="middle">{popup.text}</text
				>
			{/each}
		</g>
	</g>

	{#if storm}
		<g class="rain" stroke="rgba(220,235,255,0.6)" stroke-width="1.2">
			{#each Array.from({ length: 24 }, (_, i) => i) as i (i)}
				<line
					x1={-250 + i * 22}
					y1={-200 + (i % 5) * 30}
					x2={-256 + i * 22}
					y2={-186 + (i % 5) * 30}
				/>
			{/each}
		</g>
	{/if}

	<rect
		x="-260"
		y="-205"
		width="520"
		height="425"
		fill="#7a6a58"
		opacity={smog}
		pointer-events="none"
	/>

	<g class="bubbles" pointer-events="none">
		{#each [[-220, 9, 0], [-150, 5, 3], [-80, 7, 6], [140, 6, 1.5], [200, 10, 4.5], [230, 4, 7]] as [x, r, delay] (x)}
			<g class="bubble" style="animation-delay: {-delay}s">
				<circle cx={x} cy="210" {r} fill="url(#bubble)" />
				<circle cx={x - r * 0.35} cy={210 - r * 0.4} r={r * 0.22} fill="white" opacity="0.9" />
			</g>
		{/each}
	</g>
</svg>

<style>
	.island-scene {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 12px;
		transition: filter 1.2s ease;
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}

	.island {
		transition: transform 1.6s cubic-bezier(0.3, 0.7, 0.3, 1);
	}

	.island__bob {
		animation: bob 7s ease-in-out infinite;
	}

	.tile {
		cursor: pointer;
		outline: none;
	}

	.tile--dim {
		opacity: 0.72;
	}

	.tile__valid {
		fill: rgba(150, 255, 240, 0.16);
		stroke: #b9fff6;
		stroke-width: 1.6;
		animation: valid-pulse 1.8s ease-in-out infinite;
		pointer-events: none;
	}

	.tile__hover {
		fill: rgba(255, 255, 255, 0.18);
		stroke: white;
		stroke-width: 2.4;
		filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.9));
		pointer-events: none;
	}

	.tile:focus-visible .tile__hover {
		stroke: #fde047;
	}

	.ghost {
		opacity: 0.6;
		pointer-events: none;
	}

	.building,
	.ghost {
		pointer-events: none;
	}

	.spin {
		transform-box: fill-box;
		transform-origin: center;
		animation: spin 2.8s linear infinite;
	}

	.smoke circle {
		fill: rgba(120, 120, 120, 0.55);
		transform-box: fill-box;
		transform-origin: center;
		animation: smoke 3.6s ease-out infinite;
	}

	.smoke circle:nth-child(2) {
		animation-delay: -1.2s;
	}

	.smoke circle:nth-child(3) {
		animation-delay: -2.4s;
	}

	.smoke--filtered circle {
		fill: rgba(245, 248, 250, 0.55);
	}

	.popup {
		font-size: 13px;
		font-weight: 700;
		fill: #eafff0;
		stroke: rgba(0, 60, 20, 0.55);
		stroke-width: 3px;
		paint-order: stroke;
		animation: popup 1.4s ease-out forwards;
		pointer-events: none;
	}

	.popup--bad {
		fill: #ffe4e0;
		stroke: rgba(120, 20, 10, 0.55);
	}

	.cloud {
		animation: drift 80s linear infinite;
	}

	.sun__rays {
		transform-box: fill-box;
		transform-origin: center;
		animation: spin 90s linear infinite;
	}

	.swoosh {
		animation: swoosh 9s ease-in-out infinite alternate;
	}

	.swoosh--slow {
		animation-duration: 13s;
	}

	.bird {
		animation: fly 26s linear infinite;
	}

	.dolphin {
		transform-box: fill-box;
		transform-origin: center;
		animation: dolphin 9s ease-in-out infinite;
	}

	.shimmer line {
		animation: shimmer 4s ease-in-out infinite alternate;
	}

	.ripple {
		transform-box: fill-box;
		transform-origin: center;
		animation: ripple 3s ease-out infinite;
	}

	.waterfall-flow {
		animation: flow 0.8s linear infinite;
	}

	.bubble {
		animation: rise 11s linear infinite;
	}

	.rain line {
		animation: rain 0.6s linear infinite;
	}

	@keyframes bob {
		0%,
		100% {
			transform: translateY(-3px);
		}
		50% {
			transform: translateY(4px);
		}
	}

	@keyframes valid-pulse {
		0%,
		100% {
			stroke-opacity: 0.45;
		}
		50% {
			stroke-opacity: 1;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes smoke {
		0% {
			transform: translate(0, 0) scale(0.4);
			opacity: 0.9;
		}
		100% {
			transform: translate(18px, -38px) scale(1.8);
			opacity: 0;
		}
	}

	@keyframes popup {
		0% {
			transform: translateY(6px);
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		100% {
			transform: translateY(-26px);
			opacity: 0;
		}
	}

	@keyframes drift {
		from {
			transform: translateX(-330px);
		}
		to {
			transform: translateX(330px);
		}
	}

	@keyframes swoosh {
		from {
			transform: translateY(-6px);
			opacity: 0.7;
		}
		to {
			transform: translateY(8px);
			opacity: 1;
		}
	}

	@keyframes fly {
		from {
			transform: translate(-300px, 20px);
		}
		50% {
			transform: translate(0, -10px);
		}
		to {
			transform: translate(300px, 15px);
		}
	}

	@keyframes dolphin {
		0%,
		55% {
			transform: translate(-150px, 190px) rotate(-40deg);
			opacity: 0;
		}
		60% {
			opacity: 1;
		}
		75% {
			transform: translate(-100px, 140px) rotate(0deg);
		}
		90% {
			transform: translate(-50px, 190px) rotate(45deg);
			opacity: 1;
		}
		100% {
			transform: translate(-40px, 200px) rotate(50deg);
			opacity: 0;
		}
	}

	@keyframes shimmer {
		from {
			opacity: 0.2;
			transform: translateX(-6px);
		}
		to {
			opacity: 0.7;
			transform: translateX(6px);
		}
	}

	@keyframes ripple {
		from {
			transform: scale(0.4);
			opacity: 0.9;
		}
		to {
			transform: scale(1.6);
			opacity: 0;
		}
	}

	@keyframes flow {
		to {
			stroke-dashoffset: -16;
		}
	}

	@keyframes rise {
		from {
			transform: translateY(0);
			opacity: 0;
		}
		10% {
			opacity: 0.9;
		}
		to {
			transform: translateY(-420px);
			opacity: 0;
		}
	}

	@keyframes rain {
		from {
			transform: translate(0, 0);
		}
		to {
			transform: translate(-6px, 30px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.island__bob,
		.spin,
		.smoke circle,
		.cloud,
		.sun__rays,
		.swoosh,
		.bird,
		.dolphin,
		.shimmer line,
		.ripple,
		.waterfall-flow,
		.bubble,
		.rain line,
		.tile__valid {
			animation: none;
		}

		.popup {
			animation-duration: 0.01s;
		}
	}
</style>
