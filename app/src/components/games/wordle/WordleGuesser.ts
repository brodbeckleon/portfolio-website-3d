import {
	getAvailableChars,
	getContainedCharsWIncorrectPositions,
	getCorrectChars
} from './WordleChecker.ts';
import { columns } from './WordleHelper.ts';

// Random assembly rarely hits a real word, so each frame tries a batch and only
// the last attempt is shown. The minimum keeps the search visible even when it
// gets lucky early; the maximum falls back to picking from the word list.
const attemptsPerFrame = 150;
const minSearchMs = 700;
const maxSearchMs = 4000;

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
	const wordSet = new Set(words);
	const constraints = getConstraints();
	const isNewWord = (word: string) =>
		wordSet.has(word) && !guessed.includes(word) && fitsConstraints(word, constraints);

	const start = performance.now();
	let found: string | null = null;

	return new Promise((resolve) => {
		const step = () => {
			if (isCancelled()) {
				resolve(null);
				return;
			}

			let candidate = '';
			for (let i = 0; i < attemptsPerFrame && !found; i++) {
				candidate = buildString(constraints);
				if (isNewWord(candidate)) found = candidate;
			}
			// Keep scrambling for show until the minimum search time has passed.
			if (found) candidate = buildString(constraints);

			const elapsed = performance.now() - start;

			if (!found && elapsed > maxSearchMs) {
				const remaining = words.filter(isNewWord);
				found = remaining[Math.floor(Math.random() * remaining.length)] ?? null;
				if (!found) {
					resolve(null);
					return;
				}
			}

			if (found && elapsed >= minSearchMs) {
				resolve(found);
				return;
			}

			onCandidate(candidate);
			requestAnimationFrame(step);
		};

		requestAnimationFrame(step);
	});
}
