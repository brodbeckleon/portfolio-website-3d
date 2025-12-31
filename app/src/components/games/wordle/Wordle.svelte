<script lang="ts">
    import {onMount} from 'svelte';
    import type {GameStates} from '$lib/Types.ts';
    import {init as initWordleGame, isInWordList} from './WordleGame.ts';
    import {checkGuess} from './WordleChecker.ts';
    import {SvelteMap} from 'svelte/reactivity';
    import {columns, getLetterStates, type LetterState} from './WordleHelper.ts';

    let wordleGameState: GameStates = $state('start');
	let guesses: string[] = [];

	const keyboardLayout: string[][] = [
		['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
		['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
		['y', 'x', 'c', 'v', 'b', 'n', 'm']
	];

	const keyboardState = new SvelteMap<string, LetterState>();
	for (const row of keyboardLayout) {
		for (const char of row) {
			keyboardState.set(char, 'none');
		}
	}

	type tableCell = {
		char: string;
		state: LetterState;
	};

	let tableState: tableCell[][] = $state();

	onMount(() => initWordleGame());

	async function updateWordleGame(isValid: boolean) {
		await updateWordleTable();
		await updateWordleKeyboard();
	}

	async function submitWord() {
		if (guesses.length === 0) return;

		const guess = guesses[guesses.length - 1];

		if (guess.length !== columns) {
			console.warn('warning', `Please enter ${columns} letters`);
			return;
		}

		let isValid = false;

		if (await isInWordList(guess)) {
			isValid = true;
			await checkGuess(guess);
			await updateWordleGame(isValid);
		} else {
			console.error('error', 'Word not in list');
			guesses[guesses.length - 1] = '';
		}
	}

	async function updateWordleTable() {
		tableState = await Promise.all(
            guesses.map(async (guess) => {
                const states = await getLetterStates(guess);

                const row: tableCell[] = guess.split('').map((char, i) => ({
                    char: char,
                    state: states[i]
                }));

                return row;
            })
        );
	}

	const letterStatePrecedence = (s: LetterState) =>
		s === 'green' ? 3 : s === 'yellow' ? 2 : s === 'grey' ? 1 : 0;

	async function updateWordleKeyboard() {
		const guess = guesses[guesses.length - 1];
		const result = await getLetterStates(guess);

		result.forEach((state: LetterState, i: number) => {
			const char = guess[i];
			const current = keyboardState.get(char) ?? 'none';

			if (letterStatePrecedence(state) > letterStatePrecedence(current)) {
				keyboardState.set(char, state);
			}
		});
	}
</script>
