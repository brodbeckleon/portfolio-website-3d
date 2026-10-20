import {
	getAvailableChars,
	getContainedCharsWIncorrectPositions,
	getCorrectChars
} from './WordleChecker.ts';
import { columns } from './WordleHelper.ts';

// The guess is chosen up front; the scramble of letters still in play only runs
// this long so the search stays visible.
const minSearchMs = 700;

type Constraints = {
	pools: string[][];
	requiredChars: string[];
};

function getConstraints(): Constraints {
	const correctChars = getCorrectChars();
	const misplaced = getContainedCharsWIncorrectPositions();
	const available = getAvailableChars();

	const pools = Array.from({ length: columns }, (_, i) => {
		const fixed = correctChars.charAt(i);
		if (fixed !== '-') return [fixed];
		return available.filter((char) => !(misplaced.get(char) ?? []).includes(i));
	});

	return { pools, requiredChars: [...misplaced.keys()] };
}

function buildString({ pools }: Constraints): string {
	let string = '';
	for (const pool of pools) {
		string += pool[Math.floor(Math.random() * pool.length)];
	}
	return string;
}

function fitsConstraints(word: string, { pools, requiredChars }: Constraints): boolean {
	for (let i = 0; i < columns; i++) {
		if (!pools[i].includes(word.charAt(i))) return false;
	}
	return requiredChars.every((char) => word.includes(char));
}

export function findNextGuess(
	words: string[],
	guessed: string[],
	onCandidate: (candidate: string) => void,
	isCancelled: () => boolean
): Promise<string | null> {
	const constraints = getConstraints();
	// guessed is the game's $state array: copied once, so the filter below does
	// not go through its proxy for every word in the list.
	const guessedWords = new Set(guessed);
	// Searching by random assembly made every buildable string equally likely,
	// so its first hit was a uniform pick among the distinct words that fit. A
	// uniform pick from those words directly gives the same odds without the
	// seconds-long stalls when the letters rarely line up.
	const remaining = [...new Set(words)].filter(
		(word) => !guessedWords.has(word) && fitsConstraints(word, constraints)
	);
	const found = remaining[Math.floor(Math.random() * remaining.length)] ?? null;

	const start = performance.now();

	return new Promise((resolve) => {
		const step = () => {
			if (isCancelled()) {
				resolve(null);
				return;
			}

			if (performance.now() - start >= minSearchMs) {
				resolve(found);
				return;
			}

			onCandidate(buildString(constraints));
			requestAnimationFrame(step);
		};

		requestAnimationFrame(step);
	});
}
