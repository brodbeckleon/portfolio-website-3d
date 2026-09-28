<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { GameStates } from '$lib/Types.ts';
	import { m } from '$lib/paraglide/messages';
	import {
		getTargetWord,
		getWords,
		init as initWordleGame,
		isInWordList,
		setLanguage,
		type WordleLanguage
	} from './WordleGame.ts';
	import { checkGuess } from './WordleChecker.ts';
	import { SvelteMap } from 'svelte/reactivity';
	import { columns, getRowStates, type LetterState } from './WordleHelper.ts';
	import { findNextGuess } from './WordleGuesser.ts';
	import { BrainCircuit, Delete } from '@lucide/svelte';

	type tableCell = { char: string; state: LetterState };

	let wordleGameState: GameStates = $state('start');
	let guesses: string[] = $state([]);
	let currentGuess: string = $state('');

	const keyboardLayout: string[][] = [
		['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
		['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
		['y', 'x', 'c', 'v', 'b', 'n', 'm']
	];

	const keyboardState = new SvelteMap<string, LetterState>();
	let tableState: tableCell[][] = $state([]);

	const maxRows = 6;

	let solving: boolean = $state(false);
	// Bumped to cancel a running solver (restart, stop, unmount).
	let solveRun = 0;

	let shakingRow: number = $state(-1);
	let notice: string = $state('');
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const onKey = (e: KeyboardEvent) => {
			const k = e.key;
			if (k === 'Enter') {
				handleKeyPress('Enter');
			} else if (k === 'Backspace') {
				handleKeyPress('Backspace');
			} else if (/^[a-zA-Z]$/.test(k)) {
				handleKeyPress(k.toLowerCase());
			}
		};

		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	onMount(() => {
		initWordle();
		return () => {
			solveRun++;
			clearTimeout(noticeTimer);
		};
	});

	function initWordle() {
		solveRun++;
		solving = false;
		currentGuess = '';

		for (const row of keyboardLayout) {
			for (const char of row) {
				keyboardState.set(char, 'none');
			}
		}

		guesses = [];
		tableState = [];

		tableState = Array.from({ length: maxRows }, () =>
			Array.from({ length: columns }, () => ({ char: '', state: 'none' as LetterState }))
		);
	}

	async function updateWordleTableLetters() {
		for (let r = 0; r < maxRows; r++) {
			for (let c = 0; c < columns; c++) {
				const cell = tableState[r][c];
				if (r < guesses.length) {
					cell.char = guesses[r][c];
				} else if (r === guesses.length) {
					cell.char = currentGuess[c] ?? '';
					cell.state = 'none';
				} else {
					cell.char = '';
					cell.state = 'none';
				}
			}
		}
		await updateWordleTableStates();
	}

	async function updateWordleTableStates() {
		const target = await getTargetWord();

		for (let i = 0; i < guesses.length; i++) {
			const rowStates = await getRowStates(guesses[i], target);

			for (let j = 0; j < columns; j++) {
				tableState[i][j].state = rowStates[j];
			}

			await checkGuess(guesses[i], target);
		}
	}

	async function updateWordleKeyboardStates() {
		const target = await getTargetWord();

		for (const guess of guesses) {
			const rowStates = await getRowStates(guess, target);

			for (let i = 0; i < guess.length; i++) {
				const char = guess[i];
				const newState = rowStates[i];
				const currentState = keyboardState.get(char) ?? 'none';

				if (letterStatePrecedence(newState) > letterStatePrecedence(currentState)) {
					keyboardState.set(char, newState);
				}
			}
		}
	}

	const letterStatePrecedence = (s: LetterState) =>
		s === 'green' ? 3 : s === 'yellow' ? 2 : s === 'grey' ? 1 : 0;

	async function submitWord() {
		const guess = currentGuess.trim().toLowerCase();

		if (guess.length !== columns) {
			rejectGuess(m.not_enough_letters());
			return;
		}

		if (!(await isInWordList(guess))) {
			rejectGuess(m.not_in_word_list());
			return;
		}

		guesses = [...guesses, guess];
		currentGuess = '';

		await updateWordleTableLetters();
		await updateWordleKeyboardStates();

		const lastGuess = guesses.at(guesses.length - 1);
		if (lastGuess === (await getTargetWord())) wordleGameState = 'won' as GameStates;
		else if (guesses.length === maxRows) wordleGameState = 'lost' as GameStates;
	}

	function rejectGuess(text: string) {
		// Reset first so a repeated rejection restarts the animation.
		shakingRow = -1;
		requestAnimationFrame(() => (shakingRow = guesses.length));

		notice = text;
		clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => (notice = ''), 1500);
	}

	function handleKeyPress(key: string) {
		if (solving || wordleGameState !== 'playing') return;

		if (key === 'Enter') {
			submitWord();
			return;
		}

		if (key === 'Backspace') {
			currentGuess = currentGuess.slice(0, -1);
			updateWordleTableLetters();
			return;
		}

		if (/^[a-z]$/.test(key) && currentGuess.length < columns) {
			currentGuess = currentGuess + key;
			updateWordleTableLetters();
		}
	}

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	function stopSolver() {
		solveRun++;
		solving = false;
		currentGuess = '';
		updateWordleTableLetters();
	}

	async function findWordAutomatically() {
		if (solving) {
			stopSolver();
			return;
		}
		if (wordleGameState !== 'playing') return;

		const run = ++solveRun;
		const isCancelled = () => run !== solveRun || wordleGameState !== 'playing';
		solving = true;

		while (!isCancelled()) {
			const guess = await findNextGuess(
				getWords(),
				guesses,
				(candidate) => {
					currentGuess = candidate;
					updateWordleTableLetters();
				},
				isCancelled
			);
			if (!guess || isCancelled()) break;

			currentGuess = guess;
			await submitWord();
			await wait(450);
		}

		if (run === solveRun) solving = false;
	}

	async function setWordleLanguage(lang: WordleLanguage) {
		await setLanguage(lang);
		await initWordleGame();

		wordleGameState = 'playing';
	}

	function restartGame() {
		initWordle();
		wordleGameState = 'start';
	}
</script>

<div class="wordle-app">
	<header class="wordle-header">
		<h3 class="modern-minimal-subheading">{m.wordle()}</h3>
	</header>

	<main class="wordle-main" class:is-idle={wordleGameState !== 'playing'}>
		<!-- Table -->
		<section class="table" style="--columns: {columns}; --rows: {maxRows};">
			{#if notice}
				<p class="wordle-notice" role="status" transition:fade={{ duration: 150 }}>{notice}</p>
			{/if}
			{#each tableState as row, rowIndex (rowIndex)}
				<div
					class="board-row"
					class:is-shaking={rowIndex === shakingRow}
					class:is-searching={solving && rowIndex === guesses.length}
					onanimationend={() => (shakingRow = -1)}
				>
					{#each row as cell, cellIndex (cellIndex)}
						{@const { char, state } = cell}
						<div class="cell" data-state={state}>
							<span class="cell-char">{char}</span>
						</div>
					{/each}
				</div>
			{/each}
		</section>

		<!-- Keyboard -->
		<section class="keyboard">
			{#each keyboardLayout as row, rowIndex (rowIndex)}
				<div class="keyboard-row">
					{#if rowIndex === keyboardLayout.length - 1}
						<button
							class="key key--wide"
							onclick={() => handleKeyPress('Enter')}
							type="button"
							aria-label="Enter">Enter</button
						>
					{/if}

					{#each row as key (key)}
						<button
							class="key"
							data-state={keyboardState.get(key) ?? 'none'}
							type="button"
							aria-label={`Key ${key}`}
							onclick={() => handleKeyPress(key)}
						>
							{key}
						</button>
					{/each}

					{#if rowIndex === keyboardLayout.length - 1}
						<button
							class="key key--wide"
							onclick={() => handleKeyPress('Backspace')}
							type="button"
							aria-label="Backspace"
						>
							<Delete size={18} strokeWidth={1.5} />
						</button>
					{/if}
					{#if rowIndex === keyboardLayout.length - 2}
						<button
							class="key"
							class:is-active={solving}
							disabled={wordleGameState !== 'playing'}
							onclick={findWordAutomatically}
							type="button"
							aria-label={m.solve_automatically()}
							aria-pressed={solving}
							title={m.solve_automatically()}
						>
							<BrainCircuit size={18} strokeWidth={1.5} />
						</button>
					{/if}
				</div>
			{/each}
		</section>
	</main>
	{#if wordleGameState !== 'playing'}
		<div class="wordle-overlay">
			<div class="modern-minimal-container wordle-dialog">
				{#if wordleGameState === 'start'}
					<h4 class="wordle-dialog-title">{m.choose_language()}</h4>
					<div class="wordle-dialog-actions">
						<button
							class="modern-minimal-secondary-button wordle-dialog-button"
							onclick={() => setWordleLanguage('en')}
						>
							{m.english()}
						</button>
						<button
							class="modern-minimal-secondary-button wordle-dialog-button"
							onclick={() => setWordleLanguage('de')}
						>
							{m.german()}
						</button>
					</div>
				{:else if wordleGameState === 'won'}
					<h4 class="wordle-dialog-title">{m.you_won()}</h4>
					<button
						class="modern-minimal-secondary-button wordle-dialog-button"
						onclick={() => restartGame()}
					>
						{m.try_again()}
					</button>
				{:else if wordleGameState === 'lost'}
					<h4 class="wordle-dialog-title">{m.you_lost()}</h4>
					<button
						class="modern-minimal-secondary-button wordle-dialog-button"
						onclick={() => restartGame()}
					>
						{m.try_again()}
					</button>
				{:else}
					error
				{/if}
			</div>
		</div>
	{/if}
</div>

<style lang="css">
	.wordle-app {
		--wordle-gap: clamp(0.25rem, 1.2vw, 0.5rem);

		position: relative;
		width: 100%;
		max-width: 520px;
		margin: 0 auto;
		font-family: var(--mm-font-sans);
	}

	.wordle-header {
		display: flex;
		justify-content: center;
		margin-bottom: var(--mm-s5);
	}

	.wordle-main {
		transition: opacity var(--mm-duration) var(--mm-ease);
	}

	.wordle-main.is-idle {
		opacity: 0.75;
	}

	.table {
		position: relative;
		display: grid;
		gap: var(--wordle-gap);
		margin: 0 0 var(--mm-s5);
	}

	.board-row {
		display: flex;
		gap: var(--wordle-gap);
		justify-content: center;
	}

	/* Fluid so the board and keyboard fit a phone instead of forcing the page
	   to scroll sideways. */
	.cell {
		width: clamp(2.25rem, 11vw, 3rem);
		height: clamp(2.75rem, 13vw, 3.5rem);
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 2px solid var(--mm-border-strong);
		border-radius: var(--mm-radius-sm);
		color: var(--mm-text);
		font-size: clamp(1.125rem, 5vw, 1.5rem);
		font-weight: 600;
		line-height: 1;
		text-transform: uppercase;
		transition:
			background-color var(--mm-duration) var(--mm-ease),
			border-color var(--mm-duration) var(--mm-ease),
			color var(--mm-duration) var(--mm-ease);
	}

	.cell[data-state='green'] {
		background: var(--mm-tile-correct);
		border-color: var(--mm-tile-correct);
		color: var(--mm-tile-correct-ink);
	}

	.cell[data-state='yellow'] {
		background: var(--mm-tile-present);
		border-color: var(--mm-tile-present);
		color: var(--mm-tile-present-ink);
	}

	.cell[data-state='grey'] {
		background: var(--mm-tile-absent);
		border-color: var(--mm-tile-absent);
		color: var(--mm-tile-absent-ink);
	}

	.board-row.is-shaking {
		animation: wordle-shake 400ms var(--mm-ease);
	}

	@keyframes wordle-shake {
		10%,
		90% {
			transform: translateX(-1px);
		}
		20%,
		80% {
			transform: translateX(2px);
		}
		30%,
		50%,
		70% {
			transform: translateX(-4px);
		}
		40%,
		60% {
			transform: translateX(4px);
		}
	}

	.board-row.is-searching .cell {
		border-color: var(--mm-accent);
		color: var(--mm-text-muted);
		transition: none;
	}

	.wordle-notice {
		position: absolute;
		top: var(--mm-s3);
		left: 50%;
		z-index: 1;
		transform: translateX(-50%);
		margin: 0;
		padding: var(--mm-s2) var(--mm-s4);
		background: var(--mm-text);
		border-radius: var(--mm-radius-sm);
		color: var(--mm-bg);
		font-size: 0.875rem;
		font-weight: 600;
		white-space: nowrap;
		pointer-events: none;
	}

	.keyboard {
		display: flex;
		flex-direction: column;
		gap: var(--wordle-gap);
	}

	.keyboard-row {
		display: flex;
		width: 100%;
		gap: var(--wordle-gap);
		justify-content: center;
		margin: 0;
	}

	/* Keys share the row width instead of claiming a fixed minimum, so the
	   keyboard fits any phone without forcing a sideways scroll. */
	.key {
		flex: 1 1 0;
		min-width: 0;
		max-width: 2.75rem;
		height: clamp(2.25rem, 9vw, 2.5rem);
		padding: 0 0.125rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--mm-surface-2);
		border: 1px solid var(--mm-border);
		border-radius: var(--mm-radius-sm);
		color: var(--mm-text-muted);
		font-family: inherit;
		font-size: clamp(0.625rem, 2.6vw, 0.875rem);
		font-weight: 500;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			background-color var(--mm-duration) var(--mm-ease),
			color var(--mm-duration) var(--mm-ease);
	}

	.key.is-active {
		background: var(--mm-accent-wash);
		border-color: var(--mm-accent);
		color: var(--mm-accent);
	}

	.key--wide {
		flex-grow: 1.8;
		max-width: 4.5rem;
	}

	.key:hover:not(:disabled) {
		background: var(--mm-surface);
		color: var(--mm-text);
	}

	.key:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.key:focus-visible {
		outline: 2px solid var(--mm-accent);
		outline-offset: 2px;
	}

	.key[data-state='green'] {
		background: var(--mm-tile-correct);
		border-color: var(--mm-tile-correct);
		color: var(--mm-tile-correct-ink);
	}

	.key[data-state='yellow'] {
		background: var(--mm-tile-present);
		border-color: var(--mm-tile-present);
		color: var(--mm-tile-present-ink);
	}

	.key[data-state='grey'] {
		background: var(--mm-tile-absent);
		border-color: var(--mm-tile-absent);
		color: var(--mm-tile-absent-ink);
	}

	.wordle-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background: var(--mm-scrim);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
	}

	.wordle-dialog {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--mm-s4);
		padding: var(--mm-s5);
	}

	.wordle-dialog-title {
		margin: 0;
		font-size: var(--mm-text-lg);
		font-weight: 600;
		letter-spacing: var(--mm-tracking-tight);
		color: var(--mm-text);
	}

	.wordle-dialog-actions {
		display: flex;
		gap: var(--mm-s3);
	}

	.wordle-dialog-button {
		min-width: 6rem;
		padding: var(--mm-s2) var(--mm-s4);
		height: 2.25rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.wordle-main,
		.cell,
		.key {
			transition: none;
		}

		.board-row.is-shaking {
			animation: none;
		}
	}
</style>
