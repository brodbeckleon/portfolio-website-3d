<script lang="ts">
	import { onMount } from 'svelte';
	import type { GameStates } from '$lib/Types.ts';
	import { m } from '$lib/paraglide/messages';
	import {
		getTargetWord,
		init as initWordleGame,
		isInWordList,
		setLanguage,
		type WordleLanguage
	} from './WordleGame.ts';
	import { checkGuess } from './WordleChecker.ts';
	import { SvelteMap } from 'svelte/reactivity';
	import { columns, getRowStates, type LetterState } from './WordleHelper.ts';
	import { findWord } from './WordleGuesser.ts';
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
	});

	function initWordle() {
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
		if (!guess) return;

		if (guess.length !== columns) {
			console.warn(`Please enter ${columns} letters`);
			return;
		}

		if (!(await isInWordList(guess))) {
			console.error('Word not in list');
			currentGuess = '';
			await updateWordleTableLetters();
			return;
		}

		guesses = [...guesses, guess];
		currentGuess = '';

		await updateWordleTableLetters();
		await updateWordleKeyboardStates();

		const lastGuess = guesses.at(guesses.length - 1);
		if (lastGuess === (await getTargetWord())) wordleGameState = 'won' as GameStates;
		if (guesses.length === 6) wordleGameState = 'lost' as GameStates;
	}

	function handleKeyPress(key: string) {
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

	async function findWordAutomatically() {
		const targetWord = await getTargetWord();

		await findWord(targetWord);
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
	<header style="display: flex; justify-content: center;">
		<h1>{m.wordle()}</h1>
	</header>

	<main
		class="wordle-main"
		style="opacity: {wordleGameState === 'playing' ? 1 : 0.3};
"
	>
		<!-- Table -->
		<section class="table" style="--columns: {columns}; --rows: {maxRows};">
			{#each tableState as row}
				<div class="board-row">
					{#each row as cell}
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
			{#each keyboardLayout as row, rowIndex}
				<div class="keyboard-row">
					{#if rowIndex === keyboardLayout.length - 1}
						<button
							class="key"
							onclick={() => handleKeyPress('Enter')}
							type="button"
							aria-label="Enter">Enter</button
						>
					{/if}

					{#each row as key}
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
							class="key"
							onclick={() => handleKeyPress('Backspace')}
							type="button"
							aria-label="Backspace"
						>
							<Delete size={18} strokeWidth={1.5} />
						</button>
					{/if}
					{#if rowIndex === keyboardLayout.length - 2}
						<button class="key" disabled onclick={findWordAutomatically} type="button">
							<BrainCircuit size={18} strokeWidth={1.5} />
						</button>
					{/if}
				</div>
			{/each}
		</section>
	</main>
	{#if wordleGameState !== 'playing'}
		<div
			style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: rgba(255, 255, 255, 0.3);"
		>
			<div
				class="modern-minimal-container"
				style="padding: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center;"
			>
				{#if wordleGameState === 'start'}
					<h4>{m.choose_language()}</h4>
					<div
						style="display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 12px"
					>
						<button
							class="modern-minimal-secondary-button"
							style="padding: 8px; width: 80px"
							onclick={() => setWordleLanguage('en')}
						>
							{m.english()}
						</button>
						<button
							class="modern-minimal-secondary-button"
							style="padding: 8px; width: 80px"
							onclick={() => setWordleLanguage('de')}
						>
							{m.german()}
						</button>
					</div>
				{:else if wordleGameState === 'won'}
					<h3>{m.you_won()}</h3>
					<button
						class="modern-minimal-secondary-button"
						style="padding: 8px; width: 100px"
						onclick={() => restartGame()}
					>
						{m.try_again()}
					</button>
				{:else if wordleGameState === 'lost'}
					<h3>{m.you_lost()}</h3>
					<button
						class="modern-minimal-secondary-button"
						style="padding: 8px; width: 100px"
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
		max-width: 520px;
		margin: 0 auto;
		font-family: system-ui, sans-serif;
	}
	.table {
		display: grid;
		gap: 8px;
		margin: 16px 0;
	}
	.board-row {
		display: flex;
		gap: 8px;
		justify-content: center;
	}
	.cell {
		width: 48px;
		height: 56px;
		border: 2px solid #ddd;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		text-transform: uppercase;
	}
	.cell[data-state='green'] {
		background: #6aaa64;
		color: white;
		border-color: #6aaa64;
	}
	.cell[data-state='yellow'] {
		background: #c9b458;
		color: white;
		border-color: #c9b458;
	}
	.cell[data-state='grey'] {
		background: #787c7e;
		color: white;
		border-color: #787c7e;
	}
	.keyboard {
		margin-top: 12px;
	}
	.keyboard-row {
		display: flex;
		gap: 8px;
		justify-content: center;
		margin: 6px 0;
	}
	.key {
		min-width: 36px;
		height: 36px;
		padding: 10px 8px;
		border-radius: 6px;
		border: none;
		font-weight: 600;
		text-transform: uppercase;
		cursor: pointer;
	}
	.key[data-state='green'] {
		background: #6aaa64;
		color: white;
	}
	.key[data-state='yellow'] {
		background: #c9b458;
		color: white;
	}
	.key[data-state='grey'] {
		background: #787c7e;
		color: white;
	}
</style>
