import { readFileSync } from 'node:fs';
(globalThis as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
const dir =
	'/Users/brodbeckleon/Documents/privateCodingFiles/portfolio-website-3d/app/src/components/games/wordle/';
const { initWordleChecker, checkGuess } = await import(dir + 'WordleChecker.ts');
const { findNextGuess } = await import(dir + 'WordleGuesser.ts');
for (const lang of ['english', 'german']) {
	const words = readFileSync(`static/game-assets/wordle/wordlist-${lang}.txt`, 'utf8')
		.split('\n')
		.map((w) => w.trim().toLowerCase())
		.filter((w) => /^[a-z]{5}$/u.test(w));
	let wins = 0,
		frames = 0,
		games = 40,
		fallback = 0;
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
			if (performance.now() - t0 > 3900) fallback++;
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
		`fallbacks ${fallback}`
	);
}
