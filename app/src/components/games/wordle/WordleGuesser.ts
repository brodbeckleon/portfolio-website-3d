import {
	checkGuess,
	getAvailableChars,
	getCorrectChars,
	getContainedCharsWIncorrectPositions,
	getGuesses,
	setGuesses
} from './WordleChecker.ts';
import { filePath } from './WordleGame.ts';

export async function findWord(targetWord: string) {
	console.log('starting to find word');

	try {
		const response = await fetch(filePath);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const text = await response.text();

		const words = text
			.split('\n')
			.map((w) => w.trim().toLowerCase())
			.filter((w) => /^[a-z]{5}$/u.test(w));
		console.log('words fetched and filtered to length of 5 words');

		for (let i = 0; i < 6; i++) {
			console.log('Starting guess: \t\t', i + 1);
			const wordCandidate = await buildString(words);

			await checkGuess(wordCandidate, targetWord);

			if (wordCandidate === targetWord) {
				console.log('Wort found');
				console.log(wordCandidate);
				break;
			} else {
				console.log('Guess ' + (i + 1) + ': \t\t\t\t', wordCandidate);
				console.log('Correct Chars:\t\t', getCorrectChars());
				console.log(
					'Contained Chars with incorrect Position:\t\n',
					await getContainedCharsWIncorrectPositions()
				);
				console.log('Available chars:\t', await getAvailableChars());

				const guesses = await getGuesses();
				guesses.push(wordCandidate);
				await setGuesses(guesses);
			}
		}

		if ((await getGuesses()).length === 6) {
			console.log('Word not found.');
		}
	} catch (error) {
		console.error('Error loading word list:', error);
	}
}

async function buildString(words: string[]): Promise<string> {
	let string: string = await getCorrectChars();
	while (true) {
		for (let i: number = 0; i < 5; i++) {
			if (string.charAt(i) === '-') {
				let charToInsert: string = '';
				while (true) {
					const randomIndex: number = Math.floor(
						Math.random() * (await getAvailableChars()).length
					);
					charToInsert = (await getAvailableChars())[randomIndex];

					let unavailableIndexes: number[] = [];
					if ((await getContainedCharsWIncorrectPositions()).has(charToInsert)) {
						unavailableIndexes =
							(await getContainedCharsWIncorrectPositions()).get(charToInsert) ?? [];
					}
					if (!unavailableIndexes.includes(i)) break;
				}

				string = string.substring(0, i) + charToInsert + string.substring(i + 1);
			}
		}
		if (words.includes(string) && !(await getGuesses()).includes(string)) {
			break;
		} else {
			string = await getCorrectChars();
		}
	}
	return string;
}
