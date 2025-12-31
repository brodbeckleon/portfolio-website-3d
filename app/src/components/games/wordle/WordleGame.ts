import { initWordleChecker } from './WordleChecker.ts';

export const germanFilePath = 'game-assets/wordle/wordlist-german.txt';

let words: string[] = [];

let targetWord: string = '';

export async function init(): Promise<void> {
	try {
		const response = await fetch(germanFilePath);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const text = await response.text();

		words = text
			.split('\n')
			.map((w) => w.trim().toLowerCase())
			.filter((w) => /^[a-z]{5}$/u.test(w));

		const randomIndex: number = Math.floor(Math.random() * words.length);
		targetWord = words[randomIndex];
	} catch (error) {
		console.error('Error loading word list:', error);
	}

	await initWordleChecker();
}

export async function getTargetWord(): Promise<string> {
	return targetWord;
}

export async function isInWordList(word: string): Promise<boolean> {
	return words.includes(word);
}
