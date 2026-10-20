// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** Photo open in the loupe, set by shallow routing on /photography. */
			photoId?: string;
			/** The loupe was opened from the index, so closing can go back. */
			fromIndex?: boolean;
		}
		// interface Platform {}
	}
}

export {};
