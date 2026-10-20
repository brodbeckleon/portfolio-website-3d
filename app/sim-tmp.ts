import { readFileSync } from 'node:fs';
Object.assign(globalThis, { requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0) });
const dir = new URL('./src/components/games/wordle/', import.meta.url);
const { initWordleChecker, checkGuess } = await import(new URL('WordleChecker.ts', dir).href);
const { findNextGuess } = await import(new URL('WordleGuesser.ts', dir).href);
for (const lang of ['en', 'de']) {
	const words = readFileSync(new URL(`words/${lang}.txt`, dir), 'utf8')
		.split('\n')
		.map((w) => w.trim().toLowerCase())
		.filter((w) => /^[a-z]{5}$/u.test(w));
	const games = 40;
	let wins = 0,
		frames = 0,
		slowestGuessMs = 0;
	for (let g = 0; g < games; g++) {
		await initWordleChecker();
		const target = words[Math.floor(Math.random() * words.length)];
		const guesses: string[] = [];
		for (let r = 0; r < 6; r++) {
			const t0 = performance.now();
			const guess = await findNextGuess(
				words,
				guesses,
				() => frames++,
				() => false
			);
			slowestGuessMs = Math.max(slowestGuessMs, performance.now() - t0);
			if (!guess) {
				console.log('null guess!', target, guesses);
				break;
			}
			guesses.push(guess);
			await checkGuess(guess, target);
			if (guess === target) {
				wins++;
				break;
			}
		}
	}
	console.log(
		lang,
		`wins ${wins}/${games}`,
		`avg frames/game ${(frames / games).toFixed(0)}`,
		`slowest guess ${slowestGuessMs.toFixed(0)} ms`
	);
}
