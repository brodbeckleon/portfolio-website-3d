const vokale: string[] = ['e', 'u', 'i', 'o', 'a'];

const konsonanten: string[] = [
	'q',
	'w',
	'r',
	't',
	'z',
	'p',
	's',
	'd',
	'f',
	'g',
	'h',
	'j',
	'k',
	'l',
	'y',
	'x',
	'c',
	'v',
	'b',
	'n',
	'm'
];

let containedCharsWIncorrectPositions: Map<string, number[]> = new Map();
let correctChars: string = '-----';
let availableChars: string[] = vokale.concat(konsonanten);

export async function initWordleChecker() {
	containedCharsWIncorrectPositions = new Map();
	correctChars = '-----';
	availableChars = vokale.concat(konsonanten);
}

export async function checkGuess(candidate: string, targetWord: string) {
	const checkWord = targetWord;

	for (let i: number = 0; i < 5; i++) {
		if (candidate.charAt(i) === checkWord.charAt(i)) {
			correctChars =
				correctChars.substring(0, i) + candidate.charAt(i) + correctChars.substring(i + 1);
		}
	}

	for (let i: number = 0; i < 5; i++) {
		const char: string = candidate.charAt(i);

		if (correctChars.charAt(i) !== '-') {
			continue;
		}

		if (checkWord.includes(char)) {
			const positions = containedCharsWIncorrectPositions.get(char) ?? [];
			if (!positions.includes(i)) positions.push(i);
			containedCharsWIncorrectPositions.set(char, positions);
		} else {
			availableChars = availableChars.filter((ch) => ch !== char);
		}
	}
}

export function getContainedCharsWIncorrectPositions(): Map<string, number[]> {
	return containedCharsWIncorrectPositions;
}

export function getCorrectChars(): string {
	return correctChars;
}

export function getAvailableChars(): string[] {
	return availableChars;
}
