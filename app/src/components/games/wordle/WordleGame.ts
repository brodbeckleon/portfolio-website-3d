import { initWordleChecker } from './WordleChecker.ts';

export type WordleLanguage = 'en' | 'de';

const germanFilePath = 'game-assets/wordle/wordlist-german.txt';
const englishFilePath = 'game-assets/wordle/wordlist-english.txt';

export let filePath: string = englishFilePath;

let words: string[] = [];

let targetWord: string = '';

export async function init(): Promise<void> {
	words = [];
	targetWord = '';
	try {
		const response = await fetch(filePath);

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
		console.log(targetWord);
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

export async function setLanguage(language: WordleLanguage): Promise<void> {
	switch (language) {
		case 'en': {
			filePath = englishFilePath;
			break;
		}
		case 'de': {
			filePath = germanFilePath;
			break;
		}
		default: {
			console.error('Error setting language:', language);
			break;
		}
	}
}
