<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import {
		Axe,
		CloudFog,
		Droplet,
		Droplets,
		Factory,
		Hammer,
		Heart,
		House,
		Leaf,
		Package,
		Pickaxe,
		Recycle,
		RotateCcw,
		Search,
		Shovel,
		SkipForward,
		Sparkles,
		Sprout,
		Star,
		Sun,
		TreeDeciduous,
		Trees,
		Undo2,
		Users,
		Wheat,
		Wind,
		Zap
	} from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import HarmoniaOrb from './HarmoniaOrb.svelte';
	import HarmoniaIsland from './HarmoniaIsland.svelte';
	import {
		BALANCE,
		BUILD_ORDER,
		BUILDINGS,
		PLANT_COST,
		SEASON_KEYS,
		stat,
		type BuildingDef
	} from './HarmoniaConfig.ts';
	import { findEvent, resolveEvent } from './HarmoniaEvents.ts';
	import {
		advanceSeason,
		applyAction,
		buildingOutput,
		checkAction,
		computeFlows,
		computeScores,
		harmony,
		newGame,
		ratios,
		stars,
		toolCost,
		toolRefund
	} from './HarmoniaSimulation.ts';
	import type {
		BuildingId,
		GameState,
		LogEntry,
		Popup,
		Season,
		Tile,
		ToolId
	} from './HarmoniaTypes.ts';

	type MessageFn = (inputs?: Record<string, unknown>) => string;
	const messages = m as unknown as Record<string, MessageFn | undefined>;

	/** Harmonia's copy is keyed dynamically (buildings, events, log lines). */
	function t(key: string, params: Record<string, string | number> = {}): string {
		return messages[`harmonia_${key}`]?.(params) ?? key;
	}

	const BEST_KEY = 'harmonia-best-score';
	const SAVE_KEY = 'harmonia-save-v1';

	const BUILDING_ICONS: Record<BuildingId, Component> = {
		house: House,
		farm: Wheat,
		garden: Sprout,
		coal: Factory,
		wind: Wind,
		solar: Sun,
		mine: Pickaxe,
		sawmill: Axe,
		waterworks: Droplets,
		recycling: Recycle,
		park: Trees
	};

	const LAND_TOOLS: { id: ToolId; icon: Component; colour: string }[] = [
		{ id: 'inspect', icon: Search, colour: '#7dd3fc' },
		{ id: 'upgrade', icon: Sparkles, colour: '#fbbf24' },
		{ id: 'plant', icon: TreeDeciduous, colour: '#22c55e' },
		{ id: 'clear', icon: Shovel, colour: '#b45309' },
		{ id: 'demolish', icon: Hammer, colour: '#ef4444' }
	];

	const COLOURS = {
		food: '#f5b50b',
		water: '#22b8f0',
		energy: '#facc15',
		nature: '#34c759',
		air: '#a5e4ff',
		happiness: '#ff6fa8',
		harmony: '#2dd4bf'
	};

	let game = $state<GameState | null>(null);
	let tool = $state<ToolId>('inspect');
	let hoveredId = $state<number | null>(null);
	let popups = $state<Popup[]>([]);
	let undoStack = $state<GameState[]>([]);
	let showIntro = $state(true);
	let bestScore = $state(0);
	let newBest = $state(false);
	let confirmRestart = $state(false);
	let sparkIndex = $state<number | null>(null);
	let popupId = 0;
	let confirmTimer: ReturnType<typeof setTimeout> | undefined;

	let flows = $derived(game ? computeFlows(game) : null);
	let supply = $derived(flows ? ratios(flows) : null);
	let scores = $derived(game && flows ? computeScores(game, flows) : null);
	let harmonyNow = $derived(game && flows ? harmony(game, flows) : 0);
	// After the last season the clock would read "year 11"; stay on the final winter.
	let displayTurn = $derived(game ? Math.min(game.turn, BALANCE.totalTurns - 1) : 0);
	let displayYear = $derived(Math.floor(displayTurn / 4) + 1);
	let season = $derived((displayTurn % 4) as Season);
	let seasonName = $derived(t(`season_${SEASON_KEYS[season]}`));
	let hoveredTile = $derived(game && hoveredId !== null ? game.tiles[hoveredId] : null);
	let pendingEvent = $derived(game?.pendingEvent ? findEvent(game.pendingEvent) : undefined);
	let latestNews = $derived(game ? game.log.filter((entry) => entry.turn === game!.turn) : []);
	let playing = $derived(game?.outcome === 'playing');
	let score = $derived(
		game ? game.harmonyHistory.reduce((sum, v) => sum + v, 0) + game.population * 10 : 0
	);
	let groundwaterTrend = $derived(
		flows ? flows.groundwaterRecharge - flows.waterSupply * flows.drainRate : 0
	);

	let validIds: ReadonlySet<number> = $derived(
		new Set(
			game && tool !== 'inspect'
				? game.tiles.filter((tile) => checkAction(game!, tool, tile).ok).map((tile) => tile.id)
				: []
		)
	);

	/** A running game survives a reload; anything odd in storage is ignored. */
	function loadSave(): GameState | null {
		try {
			const raw = localStorage.getItem(SAVE_KEY);
			if (!raw) return null;
			const saved = JSON.parse(raw) as GameState;
			const valid =
				saved?.outcome === 'playing' &&
				typeof saved.turn === 'number' &&
				Array.isArray(saved.tiles) &&
				saved.tiles.every((tile) => typeof tile.upgraded === 'boolean');
			return valid ? saved : null;
		} catch {
			return null;
		}
	}

	$effect(() => {
		if (!game) return;
		// Stringifying reads the whole state, so any change re-runs this.
		const serialised = JSON.stringify(game);
		try {
			if (game.outcome === 'playing') localStorage.setItem(SAVE_KEY, serialised);
			else localStorage.removeItem(SAVE_KEY);
		} catch {
			// Storage full or blocked: the game just won't resume after a reload.
		}
	});

	onMount(() => {
		const saved = loadSave();
		game = saved ?? newGame();
		if (saved) showIntro = false;
		try {
			bestScore = Number(localStorage.getItem(BEST_KEY)) || 0;
		} catch {
			// Private mode: the best score just isn't remembered.
		}

		const onKey = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
			if (event.key === 'Escape') {
				if (showIntro && game && game.turn > 0) showIntro = false;
				else tool = 'inspect';
				return;
			}
			if (showIntro || event.altKey) return;
			const key = event.key.toLowerCase();
			if (key === 'z' && !event.shiftKey) {
				event.preventDefault();
				undo();
			} else if (key === 'n' && !event.ctrlKey && !event.metaKey) {
				nextSeason();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			clearTimeout(confirmTimer);
		};
	});

	function fmt(value: number): string {
		return value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
	}

	function signed(value: number): string {
		return `${value > 0 ? '+' : value < 0 ? '−' : '±'}${fmt(Math.abs(value))}`;
	}

	function selectTool(next: ToolId) {
		tool = tool === next && next !== 'inspect' ? 'inspect' : next;
	}

	function showPopup(tileId: number, text: string, tone: Popup['tone']) {
		const id = ++popupId;
		popups.push({ id, tileId, text, tone });
		setTimeout(() => {
			popups = popups.filter((p) => p.id !== id);
		}, 1400);
	}

	function onTileClick(tile: Tile) {
		if (!game) return;
		if (tool === 'inspect') {
			hoveredId = tile.id;
			return;
		}
		const check = checkAction(game, tool, tile);
		if (!check.ok) return;

		const refund = toolRefund(tool, tile);
		const snapshot = $state.snapshot(game) as GameState;
		if (!applyAction(game, tool, tile.id)) return;
		undoStack.push(snapshot);
		if (refund > 0) showPopup(tile.id, `+${refund}`, 'good');
		else if (check.cost > 0) showPopup(tile.id, `−${check.cost}`, 'bad');
		// One building rarely goes twice on the same kind of spot in a row,
		// but tools stay armed so a row of turbines is quick to place.
		if (tool === 'upgrade' || tool === 'demolish') hoveredId = tile.id;
	}

	function undo() {
		const previous = undoStack.pop();
		if (previous) game = previous;
	}

	function nextSeason() {
		if (!game || !playing || game.pendingEvent) return;
		advanceSeason(game);
		undoStack = [];
		if (game.outcome !== 'playing') finish();
	}

	function choose(choiceId: string) {
		if (!game) return;
		resolveEvent(game, choiceId);
	}

	function finish() {
		tool = 'inspect';
		newBest = score > bestScore;
		if (!newBest) return;
		bestScore = score;
		try {
			localStorage.setItem(BEST_KEY, String(score));
		} catch {
			// Not persisted; the result still shows.
		}
	}

	function restart() {
		if (playing && !confirmRestart && game && game.turn > 0) {
			confirmRestart = true;
			clearTimeout(confirmTimer);
			confirmTimer = setTimeout(() => (confirmRestart = false), 3000);
			return;
		}
		confirmRestart = false;
		game = newGame();
		undoStack = [];
		tool = 'inspect';
		hoveredId = null;
		newBest = false;
		showIntro = false;
	}

	function logText(entry: LogEntry): string {
		const params = { ...entry.params };
		if (typeof params.building === 'string') params.building = t(`building_${params.building}`);
		return t(`log_${entry.key}`, params);
	}

	function toolName(id: ToolId): string {
		return id in BUILDINGS ? t(`building_${id}`) : t(`tool_${id}`);
	}

	function describeTile(tile: Tile): string {
		const building = tile.building ? t(`building_${tile.building}`) : t('nothing_built');
		return t('tile_label', { terrain: t(`terrain_${tile.terrain}`), building });
	}

	type Chip = { icon: Component; label: string; value: string; tone: 'good' | 'bad' | 'neutral' };

	function statChips(def: BuildingDef, upgraded: boolean): Chip[] {
		const tile = { building: def.id, upgraded };
		const chips: Chip[] = [];
		const add = (icon: Component, label: string, value: number, goodWhenPositive = true) => {
			if (!value) return;
			const good = goodWhenPositive ? value > 0 : value < 0;
			chips.push({ icon, label, value: signed(value), tone: good ? 'good' : 'bad' });
		};
		add(Users, t('housing'), stat(tile, 'housing'));
		add(Wheat, t('food'), stat(tile, 'food'));
		add(Droplet, t('water'), stat(tile, 'water') - stat(tile, 'waterUse'));
		add(Zap, t('energy'), stat(tile, 'energy') - stat(tile, 'energyUse'));
		add(Package, t('materials'), stat(tile, 'materials'));
		add(CloudFog, t('pollution'), stat(tile, 'emissions'), false);
		const nature = Math.round((def.natureWeight - 0.6) * 10);
		add(Leaf, t('nature'), nature);
		return chips;
	}

	function outputChips(tile: Tile): Chip[] {
		if (!game || !tile.building) return [];
		const output = buildingOutput(game, tile);
		const chips: Chip[] = [];
		const push = (icon: Component, label: string, value: number) => {
			if (value > 0) chips.push({ icon, label, value: `+${fmt(value)}`, tone: 'good' });
		};
		push(Wheat, t('food'), output.food);
		push(Droplet, t('water'), output.water);
		push(Zap, t('energy'), output.energy);
		push(Package, t('materials'), output.materials);
		push(Users, t('housing'), stat(tile, 'housing'));
		return chips;
	}

	function supplyWarning(ratio: number, wasteful: boolean): string {
		if (ratio < 1) return t('shortage');
		if (wasteful && ratio > 1.5) return t('waste');
		return '';
	}

	// Sparkline geometry for the end screen: one series, so no legend.
	const SPARK_W = 240;
	const SPARK_H = 70;
	const sparkX = (i: number, count: number) => (count <= 1 ? 0 : (i / (count - 1)) * SPARK_W);
	const sparkY = (value: number) => SPARK_H - (value / 100) * SPARK_H;
	let sparkPoints = $derived(
		game
			? game.harmonyHistory
					.map((v, i) => `${sparkX(i, game!.harmonyHistory.length)},${sparkY(v)}`)
					.join(' ')
			: ''
	);

	function onSparkMove(event: PointerEvent) {
		if (!game) return;
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const ratio = (event.clientX - rect.left) / rect.width;
		const count = game.harmonyHistory.length;
		sparkIndex = Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
	}

	function sparkLabel(index: number): string {
		const year = Math.floor(index / 4) + 1;
		const name = t(`season_${SEASON_KEYS[index % 4]}`);
		return `${t('year_season', { year, season: name })}: ${game?.harmonyHistory[index]}`;
	}
</script>

<div class="harmonia">
	{#if game && flows && supply && scores}
		<header class="harmonia__hud">
			<div class="hud__title">
				<h3 class="hud__name">{t('title')}</h3>
				<p class="hud__date">{t('year_season', { year: displayYear, season: seasonName })}</p>
				<div
					class="hud__progress"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={BALANCE.totalTurns}
					aria-valuenow={game.turn}
					aria-label={t('seasons_left', { count: BALANCE.totalTurns - game.turn })}
				>
					<div
						class="hud__progress-fill"
						style="width: {(game.turn / BALANCE.totalTurns) * 100}%"
					></div>
				</div>
				<p class="hud__small">{t('seasons_left', { count: BALANCE.totalTurns - game.turn })}</p>
			</div>

			<div class="hud__chips">
				<div class="chip" title={t('goal')}>
					<Users size={16} />
					<span>
						<strong>{game.population}</strong> / {flows.housing}
						<small>{t('goal')}: {BALANCE.populationGoal}</small>
					</span>
				</div>
				<div class="chip">
					<Package size={16} />
					<span>
						<strong>{game.materials}</strong>
						{t('materials')}
						<small>{t('per_season', { value: `+${Math.round(flows.materialsIncome)}` })}</small>
					</span>
				</div>
				<div class="chip" class:chip--warn={game.groundwater < 30}>
					<Droplets size={16} />
					<span>
						<strong>{Math.round(game.groundwater)} %</strong>
						{t('groundwater')}
						<small>{t('per_season', { value: signed(groundwaterTrend) })}</small>
					</span>
				</div>
				{#each game.effects as effect (effect.kind)}
					<div class="chip chip--effect">{t(`effect_${effect.kind}`)}</div>
				{/each}
			</div>

			<div class="hud__harmony">
				<HarmoniaOrb
					value={harmonyNow}
					label={t('harmony')}
					detail={`${harmonyNow} / ${BALANCE.harmonyGoal}`}
					colour={harmonyNow >= BALANCE.harmonyGoal ? COLOURS.harmony : '#f59e0b'}
					icon={Sparkles}
					size={76}
				/>
			</div>
		</header>

		{#if playing && game.lowHarmonyStreak > 0}
			<div class="banner banner--danger" role="alert" transition:fade>
				{t('sinking_warning', {
					threshold: BALANCE.sinkThreshold,
					count: BALANCE.sinkSeasons - game.lowHarmonyStreak
				})}
			</div>
		{/if}

		<div class="harmonia__orbs frutiger-aero-container">
			<HarmoniaOrb
				value={scores.food}
				label={t('food')}
				detail={t('supply_of', {
					supply: fmt(flows.foodProduction),
					demand: fmt(flows.foodDemand)
				})}
				colour={COLOURS.food}
				icon={Wheat}
				warning={supplyWarning(supply.food, true)}
			/>
			<HarmoniaOrb
				value={scores.water}
				label={t('water')}
				detail={t('supply_of', {
					supply: fmt(Math.min(flows.waterCapacity, game.groundwater)),
					demand: fmt(flows.waterDemand)
				})}
				colour={COLOURS.water}
				icon={Droplet}
				warning={supplyWarning(supply.waterDelivered, false)}
			/>
			<HarmoniaOrb
				value={scores.energy}
				label={t('energy')}
				detail={t('supply_of', {
					supply: fmt(flows.energyProduction),
					demand: fmt(flows.energyDemand)
				})}
				colour={COLOURS.energy}
				icon={Zap}
				warning={supplyWarning(supply.energy, true)}
			/>
			<HarmoniaOrb
				value={scores.nature}
				label={t('nature')}
				detail={`${Math.round(game.nature)} %`}
				colour={COLOURS.nature}
				icon={Leaf}
			/>
			<HarmoniaOrb
				value={scores.air}
				label={t('air')}
				detail={`${Math.round(scores.air)} %`}
				colour={COLOURS.air}
				icon={Wind}
			/>
			<HarmoniaOrb
				value={scores.happiness}
				label={t('happiness')}
				detail={`${Math.round(game.happiness)} %`}
				colour={COLOURS.happiness}
				icon={Heart}
			/>
		</div>

		<div class="harmonia__board">
			<div class="board__scene">
				<HarmoniaIsland
					{game}
					harmony={harmonyNow}
					{tool}
					{validIds}
					bind:hoveredId
					{popups}
					describe={describeTile}
					{onTileClick}
				/>

				<section class="panel news frutiger-aero-container" aria-live="polite">
					<h4 class="panel-title">{t('news')}</h4>
					{#if latestNews.length === 0}
						<p class="news__empty">{t('no_news')}</p>
					{:else}
						<ul>
							{#each latestNews as entry, i (i)}
								<li class="news__item news__item--{entry.tone}">{logText(entry)}</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>

			<aside class="board__side">
				<section class="panel palette frutiger-aero-container">
					<h4 class="panel-title">{t('build')}</h4>
					<div class="palette__grid">
						{#each BUILD_ORDER as id (id)}
							{@const def = BUILDINGS[id]}
							{@const Icon = BUILDING_ICONS[id]}
							<button
								type="button"
								class="frutiger-aero-button tool"
								class:active={tool === id}
								class:tool--poor={game.materials < def.cost}
								style="--tool-colour: {def.colour}"
								aria-pressed={tool === id}
								disabled={!playing}
								onclick={() => selectTool(id)}
							>
								<span class="tool__orb"><Icon size={18} strokeWidth={2.4} /></span>
								<span class="tool__name">{t(`building_${id}`)}</span>
								<span class="tool__cost"><Package size={11} /> {def.cost}</span>
							</button>
						{/each}
					</div>
					<h4 class="panel-title">{t('actions')}</h4>
					<div class="palette__grid palette__grid--land">
						{#each LAND_TOOLS as landTool (landTool.id)}
							{@const Icon = landTool.icon}
							<button
								type="button"
								class="frutiger-aero-button tool"
								class:active={tool === landTool.id}
								style="--tool-colour: {landTool.colour}"
								aria-pressed={tool === landTool.id}
								disabled={!playing}
								onclick={() => selectTool(landTool.id)}
							>
								<span class="tool__orb"><Icon size={18} strokeWidth={2.4} /></span>
								<span class="tool__name">{t(`tool_${landTool.id}`)}</span>
								{#if landTool.id === 'plant'}
									<span class="tool__cost"><Package size={11} /> {PLANT_COST.meadow}</span>
								{/if}
							</button>
						{/each}
					</div>
				</section>

				<section class="panel info frutiger-aero-container" aria-live="polite">
					{#if hoveredTile}
						{@const check = checkAction(game, tool, hoveredTile)}
						<h4 class="info__title">
							{describeTile(hoveredTile)}
							{#if hoveredTile.upgraded}<span class="badge"><Star size={11} /> {t('upgraded')}</span
								>{/if}
						</h4>
						{#if hoveredTile.terrain === 'mountain'}
							<p class="info__line">{t('ore_left', { count: hoveredTile.ore })}</p>
						{/if}
						{#if hoveredTile.terrain === 'forest'}
							<p class="info__line">
								{t('forest_health', { count: Math.round(hoveredTile.vitality) })}
							</p>
						{/if}
						{#if hoveredTile.building}
							{@const chips = outputChips(hoveredTile)}
							{#if chips.length}
								<p class="info__label">{t('produces')}</p>
								<div class="chips">
									{#each chips as chip, i (i)}
										{@const Icon = chip.icon}
										<span class="stat stat--{chip.tone}" title={chip.label}
											><Icon size={12} /> {chip.value}</span
										>
									{/each}
								</div>
							{/if}
						{/if}
						{#if tool !== 'inspect'}
							{#if check.ok}
								{@const refund = toolRefund(tool, hoveredTile)}
								<p class="info__verdict info__verdict--ok">
									{toolName(tool)} · {refund > 0
										? t('refund', { count: refund })
										: `${t('cost')}: ${toolCost(tool, hoveredTile)}`}
								</p>
							{:else}
								<p class="info__verdict info__verdict--no">{t(`reason_${check.reason}`)}</p>
							{/if}
						{/if}
					{:else if tool in BUILDINGS}
						{@const def = BUILDINGS[tool as BuildingId]}
						<h4 class="info__title">{t(`building_${def.id}`)}</h4>
						<p class="info__desc">{t(`building_${def.id}_desc`)}</p>
						<div class="chips">
							<span class="stat stat--neutral"><Package size={12} /> {t('cost')} {def.cost}</span>
							{#each statChips(def, false) as chip, i (i)}
								{@const Icon = chip.icon}
								<span class="stat stat--{chip.tone}" title={chip.label}
									><Icon size={12} /> {chip.value}</span
								>
							{/each}
						</div>
						<p class="info__line">
							{t('builds_on')}: {def.terrains.map((terrain) => t(`terrain_${terrain}`)).join(', ')}
						</p>
						{#if def.upgrade}
							<p class="info__upgrade">
								<Sparkles size={12} />
								{t(`upgrade_${def.id}`)} ({def.upgrade.cost})
							</p>
						{/if}
					{:else}
						<h4 class="info__title">{toolName(tool)}</h4>
						<p class="info__desc">{t(`tool_${tool}_desc`)}</p>
					{/if}
				</section>

				<div class="actions">
					<button
						type="button"
						class="frutiger-aero-button btn btn--primary btn--big"
						onclick={nextSeason}
						disabled={!playing || !!game.pendingEvent}
					>
						<SkipForward size={18} />
						{t('next_season')}
					</button>
					<div class="actions__row">
						<button
							type="button"
							class="frutiger-aero-button btn"
							onclick={undo}
							disabled={undoStack.length === 0}
						>
							<Undo2 size={15} />
							{t('undo')}
						</button>
						<button
							type="button"
							class="frutiger-aero-button btn"
							onclick={() => (showIntro = true)}
						>
							{t('help')}
						</button>
						<button
							type="button"
							class="frutiger-aero-button btn"
							class:btn--warn={confirmRestart}
							onclick={restart}
						>
							<RotateCcw size={15} />
							{confirmRestart ? '?' : ''}
							{t('new_island')}
						</button>
					</div>
				</div>
			</aside>
		</div>

		{#if pendingEvent?.choices}
			<div class="overlay" transition:fade={{ duration: 200 }}>
				<div
					class="dialog frutiger-aero-container"
					role="dialog"
					aria-modal="true"
					aria-labelledby="harmonia-event-title"
					transition:scale={{ start: 0.9, duration: 250 }}
				>
					<p class="dialog__eyebrow">
						{t('year_season', { year: displayYear, season: seasonName })}
					</p>
					<h3 id="harmonia-event-title" class="dialog__title">
						{t(`event_${pendingEvent.id}_title`)}
					</h3>
					<p class="dialog__body">{t(`event_${pendingEvent.id}_body`)}</p>
					<div class="dialog__choices">
						{#each pendingEvent.choices as choice, i (choice.id)}
							<button
								type="button"
								class="frutiger-aero-button btn"
								class:btn--primary={i === 0}
								onclick={() => choose(choice.id)}
							>
								{t(`event_${pendingEvent.id}_${choice.id}`)}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		{#if !playing}
			{@const earned = game.outcome === 'won' ? stars(harmonyNow) : 0}
			<div class="overlay" transition:fade={{ duration: 300 }}>
				<div
					class="dialog dialog--wide frutiger-aero-container"
					role="dialog"
					aria-modal="true"
					aria-labelledby="harmonia-end-title"
					transition:scale={{ start: 0.9, duration: 300 }}
				>
					<h3 id="harmonia-end-title" class="dialog__title">{t(`${game.outcome}_title`)}</h3>
					{#if game.outcome === 'won'}
						<div class="stars" aria-label={t('stars', { count: earned })}>
							{#each [1, 2, 3] as n (n)}
								<span class="star" class:star--on={n <= earned}><Star size={34} /></span>
							{/each}
						</div>
					{/if}
					<p class="dialog__body">
						{t(`${game.outcome}_body`, {
							population: BALANCE.populationGoal,
							harmony: BALANCE.harmonyGoal
						})}
					</p>
					<dl class="results">
						<div>
							<dt>{t('final_harmony')}</dt>
							<dd>{harmonyNow}</dd>
						</div>
						<div>
							<dt>{t('final_population')}</dt>
							<dd>{game.population}</dd>
						</div>
						<div>
							<dt>{t('score')}</dt>
							<dd>{score}</dd>
						</div>
					</dl>
					<p class="dialog__best">
						{#if newBest}<strong>{t('new_best')}</strong> ·{/if}
						{t('best_score', { score: bestScore })}
					</p>

					<figure class="spark">
						<figcaption>{t('harmony_over_time')}</figcaption>
						<svg
							viewBox="-4 -6 {SPARK_W + 8} {SPARK_H + 12}"
							onpointermove={onSparkMove}
							onpointerleave={() => (sparkIndex = null)}
							role="img"
							aria-label={t('harmony_over_time')}
						>
							<line
								x1="0"
								x2={SPARK_W}
								y1={sparkY(BALANCE.harmonyGoal)}
								y2={sparkY(BALANCE.harmonyGoal)}
								class="spark__goal"
							/>
							<polygon points="0,{SPARK_H} {sparkPoints} {SPARK_W},{SPARK_H}" class="spark__area" />
							<polyline points={sparkPoints} class="spark__line" />
							{#if sparkIndex !== null}
								{@const x = sparkX(sparkIndex, game.harmonyHistory.length)}
								<line x1={x} x2={x} y1="0" y2={SPARK_H} class="spark__cross" />
								<circle
									cx={x}
									cy={sparkY(game.harmonyHistory[sparkIndex])}
									r="4"
									class="spark__dot"
								/>
							{/if}
						</svg>
						<p class="spark__tooltip">
							{sparkIndex !== null
								? sparkLabel(sparkIndex)
								: `${t('goal')}: ${BALANCE.harmonyGoal}`}
						</p>
					</figure>

					<button
						type="button"
						class="frutiger-aero-button btn btn--primary btn--big"
						onclick={restart}
					>
						<RotateCcw size={18} />
						{t('play_again')}
					</button>
				</div>
			</div>
		{/if}

		{#if showIntro}
			<div class="overlay" transition:fade={{ duration: 250 }}>
				<div
					class="dialog dialog--wide frutiger-aero-container"
					role="dialog"
					aria-modal="true"
					aria-labelledby="harmonia-intro-title"
					transition:scale={{ start: 0.92, duration: 300 }}
				>
					<p class="dialog__eyebrow">{t('tagline')}</p>
					<h3 id="harmonia-intro-title" class="dialog__title dialog__title--hero">{t('title')}</h3>
					<p class="dialog__body">
						{t('intro_body', {
							population: BALANCE.populationGoal,
							harmony: BALANCE.harmonyGoal,
							years: BALANCE.totalTurns / 4
						})}
					</p>
					<ul class="rules">
						<li><SkipForward size={16} /> {t('intro_rule_1')}</li>
						<li><Sparkles size={16} /> {t('intro_rule_2')}</li>
						<li><Droplets size={16} /> {t('intro_rule_3')}</li>
						<li><Zap size={16} /> {t('intro_rule_4')}</li>
					</ul>
					<p class="dialog__hint">{t('shortcuts')}</p>
					<button
						type="button"
						class="frutiger-aero-button btn btn--primary btn--big"
						onclick={() => {
							showIntro = false;
							if (game && game.turn === 0) tool = 'wind';
						}}
					>
						{game.turn === 0 ? t('start') : t('close')}
					</button>
				</div>
			</div>
		{/if}
	{:else}
		<div class="harmonia__loading"><Sparkles size={28} /></div>
	{/if}
</div>

<style>
	.harmonia {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 0 1rem;
		min-height: 24rem;
	}

	/* --- Shared Aero pieces ------------------------------------------------
	   Two materials, kept apart on purpose: panes are frosted glass you look
	   through, buttons are raised gel you press. Both sit on the site's
	   frutiger-aero-container / frutiger-aero-button and only refine them. */

	.panel,
	.harmonia__orbs,
	.dialog {
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.32);
		border-top-color: rgba(255, 255, 255, 0.6);
		background: linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0.16),
			rgba(255, 255, 255, 0.06) 45%,
			rgba(0, 30, 60, 0.16)
		);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.35),
			inset 0 -1px 0 rgba(255, 255, 255, 0.12),
			0 10px 24px -6px rgba(0, 25, 50, 0.35);
		/* The drop-shadow filter from the base class drew the hard lower edge. */
		filter: none;
	}

	.panel::before,
	.harmonia__orbs::before,
	.dialog::before {
		height: 38%;
		border-radius: 14px 14px 0 0;
		opacity: 0.55;
	}

	.panel {
		padding: 0.8rem 0.8rem 0.9rem;
	}

	/* Keep text above the container's glossy ::before cap. */
	.panel > *,
	.dialog > * {
		position: relative;
		z-index: 2;
	}

	/* A pane's caption sits on a hairline, like a Vista window section. */
	.panel-title {
		margin: 0 0 0.6rem;
		padding-bottom: 0.35rem;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(225, 250, 255, 0.95) !important;
		border-bottom: 1px solid transparent;
		border-image: linear-gradient(to right, rgba(255, 255, 255, 0.55), transparent) 1;
	}

	/* Gel: a bright upper half, a hard gloss line and a lit lower rim. */
	.btn,
	.tool {
		font: inherit;
		border: 1px solid rgba(255, 255, 255, 0.75);
		border-bottom-color: rgba(0, 50, 90, 0.45);
		text-shadow: 0 1px 2px rgba(0, 30, 60, 0.6);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.9),
			inset 0 -3px 6px rgba(255, 255, 255, 0.18),
			0 2px 5px rgba(0, 30, 60, 0.35);
		transition:
			background 0.2s,
			box-shadow 0.2s,
			transform 0.1s;
		animation: none;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		border-radius: 999px;
		background: linear-gradient(to bottom, #9fe0ff 0%, #4fb4ea 49%, #258fd0 50%, #4cc0f2 100%);
	}

	.btn:hover:not(:disabled) {
		background: linear-gradient(to bottom, #c2ecff 0%, #66c6f5 49%, #35a2e2 50%, #6dd4ff 100%);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.95),
			inset 0 -3px 6px rgba(255, 255, 255, 0.25),
			0 0 12px rgba(120, 220, 255, 0.75),
			0 2px 5px rgba(0, 30, 60, 0.35);
	}

	.btn:active:not(:disabled),
	.tool:active:not(:disabled) {
		transform: translateY(1px);
		box-shadow:
			inset 0 2px 5px rgba(0, 30, 60, 0.45),
			0 1px 2px rgba(0, 30, 60, 0.3);
	}

	.btn:disabled,
	.tool:disabled {
		opacity: 0.45;
		cursor: default;
		animation: none;
	}

	.btn--primary {
		border-bottom-color: rgba(10, 70, 10, 0.5);
		background: linear-gradient(to bottom, #c4f7a6 0%, #6fd24f 49%, #3fae28 50%, #76e04e 100%);
	}

	.btn--primary:hover:not(:disabled) {
		background: linear-gradient(to bottom, #dcffc6 0%, #86e066 49%, #4fc236 50%, #8ff066 100%);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.95),
			inset 0 -3px 6px rgba(255, 255, 255, 0.25),
			0 0 14px rgba(150, 255, 120, 0.8),
			0 2px 5px rgba(0, 30, 60, 0.35);
	}

	.btn--warn,
	.btn--warn:hover:not(:disabled) {
		border-bottom-color: rgba(110, 50, 0, 0.5);
		background: linear-gradient(to bottom, #ffe0a6 0%, #fbb440 49%, #e48c10 50%, #ffc451 100%);
	}

	.btn--big {
		width: 100%;
		padding: 0.75rem 1.2rem;
		font-size: 1rem;
	}

	.btn--primary.btn--big:not(:disabled) {
		animation: go-glow 2.8s ease-in-out infinite;
	}

	/* --- HUD ------------------------------------------------------------------ */

	.harmonia__hud {
		display: grid;
		grid-template-columns: minmax(10rem, 1fr) auto auto;
		align-items: center;
		gap: 1rem;
	}

	.hud__title {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.hud__name {
		margin: 0;
		font-size: 1.6rem;
		letter-spacing: 0.02em;
		background: linear-gradient(to bottom, #ffffff 30%, #c9f6ff 60%, #7fe0ff);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter: drop-shadow(0 2px 3px rgba(0, 40, 80, 0.5));
		text-shadow: none;
	}

	.hud__date {
		margin: 0;
		font-size: 0.9rem;
	}

	.hud__small {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 400;
		opacity: 0.8;
	}

	.hud__progress {
		height: 8px;
		max-width: 16rem;
		border-radius: 999px;
		background: rgba(0, 30, 60, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.4);
		overflow: hidden;
	}

	.hud__progress-fill {
		height: 100%;
		background: linear-gradient(to bottom, #b6f59a, #34c759);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
		transition: width 0.6s ease;
	}

	.hud__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: flex-end;
	}

	/* Read-outs, not controls: flat frosted pills without any bevel. */
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.75rem;
		font-size: 0.78rem;
		border-radius: 999px;
		background: rgba(0, 35, 70, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.22);
	}

	.chip span {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: 0.3rem;
	}

	.chip small {
		font-size: 0.66rem;
		font-weight: 400;
		opacity: 0.85;
	}

	.chip--warn {
		background: rgba(200, 70, 30, 0.45);
		border-color: rgba(255, 190, 160, 0.55);
	}

	.chip--effect {
		background: rgba(220, 140, 20, 0.4);
		border-color: rgba(255, 225, 150, 0.55);
	}

	.banner {
		padding: 0.6rem 1rem;
		border-radius: 10px;
		font-size: 0.85rem;
		text-align: center;
	}

	.banner--danger {
		background: linear-gradient(to bottom, rgba(255, 120, 100, 0.65), rgba(190, 30, 30, 0.55));
		border: 1px solid rgba(255, 255, 255, 0.5);
		animation: go-glow 1.6s ease-in-out infinite;
	}

	.harmonia__orbs {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.5rem;
		padding: 0.8rem 0.4rem 0.7rem;
	}

	.harmonia__orbs > :global(*) {
		position: relative;
		z-index: 2;
	}

	/* --- Board ---------------------------------------------------------------- */

	.harmonia__board {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(16rem, 19rem);
		gap: 1rem;
		align-items: start;
	}

	.board__scene {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		min-width: 0;
	}

	.board__scene :global(.island-scene) {
		border: 1px solid rgba(255, 255, 255, 0.55);
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	.board__side {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		min-width: 0;
	}

	.palette__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.6rem, 1fr));
		gap: 0.35rem;
		margin-bottom: 0.7rem;
	}

	.palette__grid--land {
		margin-bottom: 0;
	}

	.tool {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.45rem 0.2rem 0.4rem;
		min-width: 0;
		border-radius: 10px;
		background: linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0.4) 0%,
			rgba(255, 255, 255, 0.16) 49%,
			rgba(255, 255, 255, 0.04) 50%,
			rgba(255, 255, 255, 0.18) 100%
		);
	}

	.tool:hover:not(:disabled) {
		transform: translateY(-1px);
		background: linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0.55) 0%,
			rgba(255, 255, 255, 0.24) 49%,
			rgba(255, 255, 255, 0.1) 50%,
			rgba(255, 255, 255, 0.28) 100%
		);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.95),
			0 0 12px rgba(120, 220, 255, 0.65),
			0 3px 6px rgba(0, 30, 60, 0.35);
	}

	/* The armed tool lights up as aqua gel, like a pressed Vista toolbar key. */
	.tool.active,
	.tool.active:hover:not(:disabled) {
		transform: none;
		animation: none;
		border-color: rgba(220, 255, 255, 0.95);
		background: linear-gradient(to bottom, #b4f0ff 0%, #52c6ee 49%, #1d9bd6 50%, #56d0fa 100%);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.95),
			0 0 0 2px rgba(150, 240, 255, 0.45),
			0 0 16px rgba(120, 220, 255, 0.85);
	}

	.tool--poor {
		opacity: 0.55;
	}

	.tool__orb {
		position: relative;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: radial-gradient(
			circle at 35% 30%,
			rgba(255, 255, 255, 0.95),
			var(--tool-colour) 45%,
			color-mix(in srgb, var(--tool-colour) 65%, black)
		);
		border: 1px solid rgba(255, 255, 255, 0.7);
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35);
		color: white;
	}

	.tool__orb :global(svg) {
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
	}

	.tool__name {
		font-size: 0.66rem;
		line-height: 1.15;
		text-align: center;
		overflow-wrap: break-word;
	}

	.tool__cost {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.62rem;
		font-weight: 400;
		opacity: 0.9;
	}

	.info {
		min-height: 8.5rem;
	}

	.info__title {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0 0.4rem;
		font-size: 0.95rem;
	}

	.info__desc,
	.info__line,
	.info__upgrade,
	.info__label {
		margin: 0.35rem 0 0;
		font-size: 0.78rem;
		font-weight: 400;
		line-height: 1.45;
	}

	.info__label {
		font-weight: 700;
		opacity: 0.85;
	}

	.info__upgrade {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: #fff3b0;
	}

	.info__verdict {
		margin: 0.6rem 0 0;
		padding: 0.35rem 0.6rem;
		border-radius: 8px;
		font-size: 0.78rem;
	}

	.info__verdict--ok {
		background: rgba(80, 220, 120, 0.3);
		border: 1px solid rgba(180, 255, 200, 0.6);
	}

	.info__verdict--no {
		background: rgba(255, 110, 90, 0.28);
		border: 1px solid rgba(255, 190, 180, 0.6);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.1rem 0.45rem;
		font-size: 0.65rem;
		border-radius: 999px;
		color: #5a3b00;
		text-shadow: none;
		background: linear-gradient(to bottom, #fff3b0, #fbbf24);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.45rem;
	}

	.stat {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.15rem 0.45rem;
		font-size: 0.72rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		font-variant-numeric: tabular-nums;
	}

	.stat--good {
		background: rgba(60, 200, 110, 0.35);
	}

	.stat--bad {
		background: rgba(240, 90, 70, 0.35);
	}

	.stat--neutral {
		background: rgba(255, 255, 255, 0.15);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.actions__row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.actions__row .btn {
		flex: 1 1 auto;
		padding-inline: 0.6rem;
		font-size: 0.72rem;
	}

	.news ul {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.news__item,
	.news__empty {
		margin: 0;
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		font-size: 0.8rem;
		font-weight: 400;
		line-height: 1.4;
	}

	.news__item::before {
		content: '';
		flex: none;
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, white, #9ca3af);
		box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
	}

	.news__item--good::before {
		background: radial-gradient(circle at 35% 30%, white, #34c759);
	}

	.news__item--bad::before {
		background: radial-gradient(circle at 35% 30%, white, #ef4444);
	}

	/* --- Dialogs -------------------------------------------------------------- */

	.overlay {
		position: absolute;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: start center;
		padding: 3rem 1rem 1rem;
		background: radial-gradient(
			circle at 50% 30%,
			rgba(120, 220, 255, 0.25),
			rgba(0, 20, 50, 0.55)
		);
		border-radius: 12px;
	}

	.dialog {
		position: sticky;
		top: 5rem;
		width: min(26rem, 100%);
		padding: 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		text-align: center;
		/* Under the container's own gradient: enough depth to read on the scene. */
		background-color: rgba(12, 70, 115, 0.78);
	}

	.dialog--wide {
		width: min(32rem, 100%);
	}

	.dialog__eyebrow {
		margin: 0;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		opacity: 0.85;
	}

	.dialog__title {
		margin: 0;
		font-size: 1.4rem;
	}

	.dialog__title--hero {
		font-size: 2.4rem;
		background: linear-gradient(to bottom, #ffffff 30%, #c9f6ff 60%, #7fe0ff);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter: drop-shadow(0 2px 4px rgba(0, 40, 80, 0.6));
		text-shadow: none;
	}

	.dialog__body {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 400;
		line-height: 1.55;
	}

	.dialog__choices {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.dialog__choices .btn {
		padding: 0.7rem 1rem;
		font-size: 0.9rem;
	}

	.dialog__hint {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 400;
		opacity: 0.8;
	}

	.dialog__best {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 400;
	}

	.rules {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		text-align: left;
	}

	.rules li {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		font-size: 0.84rem;
		font-weight: 400;
		line-height: 1.45;
	}

	.rules :global(svg) {
		flex: none;
		margin-top: 0.15rem;
		color: #bafff5;
	}

	.stars {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
	}

	.star {
		color: rgba(255, 255, 255, 0.3);
	}

	.star--on {
		color: #ffd84d;
		filter: drop-shadow(0 0 8px rgba(255, 220, 90, 0.9));
	}

	.star--on :global(svg) {
		fill: #ffe27a;
	}

	.results {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin: 0;
	}

	.results div {
		padding: 0.5rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.results dt {
		font-size: 0.66rem;
		font-weight: 400;
		opacity: 0.85;
	}

	.results dd {
		margin: 0.15rem 0 0;
		font-size: 1.3rem;
		font-variant-numeric: tabular-nums;
	}

	.spark {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.spark figcaption,
	.spark__tooltip {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 400;
		opacity: 0.9;
	}

	.spark svg {
		width: 100%;
		height: auto;
		touch-action: none;
	}

	.spark__goal {
		stroke: rgba(255, 255, 255, 0.45);
		stroke-width: 1;
		stroke-dasharray: 4 4;
	}

	.spark__area {
		fill: rgba(150, 255, 240, 0.18);
	}

	.spark__line {
		fill: none;
		stroke: #bafff5;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.spark__cross {
		stroke: rgba(255, 255, 255, 0.6);
		stroke-width: 1;
	}

	.spark__dot {
		fill: #bafff5;
		stroke: #0b4f7a;
		stroke-width: 2;
	}

	.harmonia__loading {
		display: grid;
		place-items: center;
		min-height: 20rem;
		opacity: 0.7;
	}

	@keyframes go-glow {
		0%,
		100% {
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.7),
				0 2px 6px rgba(0, 0, 0, 0.3),
				0 0 0 rgba(120, 255, 120, 0);
		}
		50% {
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.7),
				0 2px 6px rgba(0, 0, 0, 0.3),
				0 0 16px rgba(140, 255, 120, 0.75);
		}
	}

	@media (max-width: 860px) {
		.harmonia {
			padding: 0 0.5rem;
		}

		.harmonia__hud {
			grid-template-columns: 1fr auto;
		}

		.hud__chips {
			grid-column: 1 / -1;
			grid-row: 2;
			justify-content: flex-start;
		}

		.harmonia__orbs {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			row-gap: 0.8rem;
		}

		.harmonia__board {
			grid-template-columns: minmax(0, 1fr);
		}

		.palette__grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	@media (max-width: 420px) {
		.results dd {
			font-size: 1.05rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.btn--primary.btn--big:not(:disabled),
		.banner--danger {
			animation: none;
		}
	}
</style>
