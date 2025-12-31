import {
	getCorrectChars,
	getContainedCharsWIncorrectPositions,
	getAvailableChars
} from './WordleChecker.ts';

export type LetterState = 'green' | 'yellow' | 'grey' | 'none';
export const columns: number = 5;

// helper: produce per-letter states based on WordleChecker's stored state
export async function getLetterStates(candidate: string): Promise<LetterState[]> {
	// normalize
	const word = candidate.toLowerCase();

	// read stored state from the checker module
	const correctChars = (await getCorrectChars()) ?? '-----';
	const containedMap =
		(await getContainedCharsWIncorrectPositions()) ?? new Map<string, number[]>();
	const availableChars = (await getAvailableChars()) ?? [];

	const states: LetterState[] = [];

	for (let i = 0; i < columns; i++) {
		const ch = word.charAt(i);

		// green: exact match recorded in correctChars
		if (correctChars.charAt(i) !== '-' && correctChars.charAt(i) === ch) {
			states.push('green');
			continue;
		}

		// yellow: the checker recorded this char as contained at this (candidate) position
		const positions = containedMap.get(ch);
		if (positions && positions.includes(i)) {
			states.push('yellow');
			continue;
		}

		// grey: checker removed this char from availableChars => not in target
		if (!availableChars.includes(ch)) {
			states.push('grey');
			continue;
		}

		// none: not yet resolved (should be rare after checkGuess)
		states.push('none');
	}

	return states;
}
