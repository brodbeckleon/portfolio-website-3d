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

let guesses: string[] = [];
let containedChars: string[] = [];
let containedCharsWIncorrectPositions: Map<string, number[]> = new Map();
let correctChars: string = '-----';
let availableChars: string[] = vokale.concat(konsonanten);

export async function initWordleChecker() {
	guesses = [];
	containedChars = [];
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

		if (checkWord.includes(char) && !containedChars.includes(char)) {
			containedChars.push(char);

			if (!containedCharsWIncorrectPositions.has(char)) {
				containedCharsWIncorrectPositions.set(char, []);
			}

			containedCharsWIncorrectPositions.get(char)!.push(i);
		}

		if (!checkWord.includes(char)) {
			availableChars = availableChars.filter((ch) => ch !== char);
		}
	}
}

export async function getGuesses(): Promise<string[]> {
	return guesses;
}

export async function setGuesses(values: string[]): Promise<void> {
	guesses = values;
}

export async function getContainedCharsWIncorrectPositions(): Promise<Map<string, number[]>> {
	return containedCharsWIncorrectPositions;
}

export async function getCorrectChars(): Promise<string> {
	return correctChars;
}

export async function getAvailableChars(): Promise<string[]> {
	return availableChars;
}
