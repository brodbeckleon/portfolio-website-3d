import type { Attachment } from 'svelte/attachments';

/**
 * Ink reveal: text arrives blurred and run like fresh ink and dries sharp.
 *
 * Usage: `<h2 data-ink {@attach ink({ delay: 120 })}>`. The data-ink
 * attribute has to be in the markup itself, because the server render is
 * what paper-ink.css hides before first paint; the attachment only exists
 * in the browser.
 *
 * Only opacity, a CSS blur and a transform move, which the compositor
 * animates on the GPU from one raster of the text. The reveal used to run
 * each element through its own SVG filter (turbulence -> displacement ->
 * blur); Chrome rasterizes those on the CPU on every change, and with the
 * hero's dozen elements at once that was ~2.6 s of raster work in the first
 * seconds of a visit on a 2x screen, which is what made the start stutter.
 */

type InkOptions = {
	/**
	 * ms after the element comes into view (and the page has settled, see
	 * whenSettled), for staggering a group.
	 */
	delay?: number;
	/** How far the ink runs at the start; larger text can take more. */
	spread?: number;
};

const DURATION = 1100;
/** Share of the reveal over which the text fades in; the drying runs on. */
const FADE = 0.45;
/** Fast start, long soft landing: the ink settles rather than stops. */
const EASE_OUT_CUBIC = 'cubic-bezier(0.33, 1, 0.68, 1)';

/** Longest wait for the fonts before the intro starts anyway. */
const FONT_WAIT = 1500;
/** Longest wait for an idle moment once the fonts are in. */
const IDLE_WAIT = 400;

let settled: Promise<void> | null = null;

/**
 * Resolves once the page has stopped starting up: the fonts have arrived
 * (a face swapping in relayouts the text mid-reveal) and the browser has
 * had an idle moment after hydration. The first second of a visit is when
 * the page hydrates, lays out, swaps fonts and decodes the first photos;
 * the intro running on top of all that is what stuttered, while the same
 * animations on a quiet page run smoothly. Shared, so everything that waits
 * starts together, and anything revealed later in the visit goes at once.
 */
export function whenSettled(): Promise<void> {
	settled ??= Promise.race([
		document.fonts.ready,
		new Promise((resolve) => setTimeout(resolve, FONT_WAIT))
	]).then(
		() =>
			new Promise<void>((resolve) => {
				if ('requestIdleCallback' in window) {
					requestIdleCallback(() => resolve(), { timeout: IDLE_WAIT });
				} else {
					setTimeout(resolve, 50);
				}
			})
	);
	return settled;
}

export function ink({ delay = 0, spread = 60 }: InkOptions = {}): Attachment<HTMLElement> {
	return (node) => {
		// Without ink-ready (reduced motion, or the class never got set) the
		// text is already visible and stays plain.
		if (!document.documentElement.classList.contains('ink-ready')) {
			node.dataset.inked = '';
			return;
		}

		node.dataset.inkArmed = '';
		let timer = 0;
		let detached = false;
		let animations: Animation[] = [];

		function reveal() {
			// The spread that used to be the displacement in px sets how soft
			// and how wide the wet text starts: a few px of blur on a caption,
			// up to 10 on the hero title, and a slight sideways run.
			const blur = Math.min(10, Math.max(3, spread / 10));
			const run = 1 + spread / 3000;

			// Both start in the same frame as data-inked, so the text never
			// shows sharp in between.
			node.dataset.inked = '';
			animations = [
				node.animate([{ opacity: 0 }, { opacity: 1 }], {
					duration: DURATION * FADE,
					easing: 'linear'
				}),
				node.animate(
					[
						{ filter: `blur(${blur}px)`, transform: `scaleX(${run})` },
						{ filter: 'blur(0)', transform: 'none' }
					],
					{ duration: DURATION, easing: EASE_OUT_CUBIC }
				)
			];
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				whenSettled().then(() => {
					if (!detached) timer = window.setTimeout(reveal, delay);
				});
			},
			{ threshold: 0.15 }
		);
		observer.observe(node);

		return () => {
			detached = true;
			observer.disconnect();
			clearTimeout(timer);
			for (const animation of animations) animation.cancel();
		};
	};
}
