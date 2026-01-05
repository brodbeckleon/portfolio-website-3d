export type LetterState = 'green' | 'yellow' | 'grey' | 'none';
export const columns: number = 5;

export async function getRowStates(guess: string, target: string): Promise<LetterState[]> {
	const states: LetterState[] = Array(columns).fill('grey');

	const t: (string | null)[] = target.split('');
	const g: (string | null)[] = guess.split('');

	for (let i: number = 0; i < columns; i++) {
		if (g[i] === t[i]) {
			states[i] = 'green';
			t[i] = null;
			g[i] = null;
		}
	}

	for (let i: number = 0; i < columns; i++) {
		const char: string | null = g[i];
		if (char !== null) {
			const idx = t.indexOf(char);
			if (idx !== -1) {
				states[i] = 'yellow';
				t[idx] = null;
			}
		}
	}

	return states;
}
