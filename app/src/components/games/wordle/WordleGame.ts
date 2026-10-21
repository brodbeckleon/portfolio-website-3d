import { initWordleChecker } from './WordleChecker.ts';
// Pre-filtered from the full dictionaries in assets-src/wordlists with the
// same filter parseWords applies, in the same order and with the duplicates
// kept, so the game sees exactly the words (and the odds) it always had. ?url
// gives them hashed names, so browsers can cache them for good.
import deUrl from './words/de.txt?url';
import enUrl from './words/en.txt?url';

export type WordleLanguage = 'en' | 'de';

const wordListUrls: Record<WordleLanguage, string> = { en: enUrl, de: deUrl };

type WordList = { words: string[]; wordSet: Set<string> };

// One load per language for the whole visit: a new game in the same language
// reuses the list instead of fetching and parsing it again. A failed load is
// dropped so the next pick retries instead of replaying the error.
const wordLists = new Map<WordleLanguage, Promise<WordList>>();

let language: WordleLanguage = 'en';

let words: string[] = [];
let wordSet = new Set<string>();

let targetWord: string = '';

// Still worth running on the compact lists: it costs well under a millisecond
// and keeps them working if a Windows checkout turns the line endings to CRLF.
function parseWords(text: string): string[] {
	return text
		.split('\n')
		.map((w) => w.trim().toLowerCase())
		.filter((w) => /^[a-z]{5}$/u.test(w));
}

async function fetchWordList(url: string): Promise<WordList> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const list = parseWords(await response.text());
	return { words: list, wordSet: new Set(list) };
}

function loadWordList(lang: WordleLanguage): Promise<WordList> {
	const cached = wordLists.get(lang);
	if (cached) return cached;

	const loading = fetchWordList(wordListUrls[lang]);
	wordLists.set(lang, loading);
	loading.catch(() => wordLists.delete(lang));
	return loading;
}

export async function init(): Promise<void> {
	words = [];
	wordSet = new Set();
	targetWord = '';
	try {
		({ words, wordSet } = await loadWordList(language));

		const randomIndex: number = Math.floor(Math.random() * words.length);
		targetWord = words[randomIndex];
	} catch (error) {
		console.error('Error loading word list:', error);
	}

	await initWordleChecker();
}

export function getWords(): string[] {
	return words;
}

export async function getTargetWord(): Promise<string> {
	return targetWord;
}

export async function isInWordList(word: string): Promise<boolean> {
	return wordSet.has(word);
}

export async function setLanguage(lang: WordleLanguage): Promise<void> {
	switch (lang) {
		case 'en':
		case 'de': {
			language = lang;
			break;
		}
		default: {
			console.error('Error setting language:', lang);
			break;
		}
	}
}
