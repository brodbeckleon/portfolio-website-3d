import type { Attachment } from 'svelte/attachments';

/**
 * Ink reveal: text arrives smeared like fresh ink and dries sharp.
 *
 * Usage: `<h2 data-ink {@attach ink({ delay: 120 })}>`. The data-ink
 * attribute has to be in the markup itself, because the server render is
 * what paper-ink.css hides before first paint; the attachment only exists
 * in the browser.
 *
 * The smear is an SVG filter (turbulence -> displacement -> blur), but it is
 * never animated. Browsers draw these filters on the CPU, again on every
 * change: Safari managed a few frames a second with the hero's dozen
 * elements smearing at once. Instead each element gets a few aria-hidden
 * copies laid over it, each with the smear frozen at one wetness (STAGES)
 * and drawn once, and the reveal cross-fades from the wettest copy through
 * the drier ones to the element itself, which sharpens through a CSS blur.
 * Opacity and a CSS blur are all that move, and the compositor runs those
 * on the GPU. Afterwards the copies and their filters are removed.
 */

type InkOptions = {
	/**
	 * ms after the element comes into view (and the page has settled, see
	 * whenSettled), for staggering a group.
	 */
	delay?: number;
	/** Displacement in px at the start; larger text can take more. */
	spread?: number;
};

/** ms from the first smear to dry, sharp text. */
const DURATION = 1800;
/** Wetness of the frozen smear copies cross-faded through during a reveal. */
const STAGES = [1, 0.55, 0.28, 0.12];
/** Keyframes per reveal; the curves between them are linear. */
const SAMPLES = 40;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Longest wait for the fonts before the intro starts anyway. */
const FONT_WAIT = 1500;
/** Longest wait for an idle moment once the fonts are in. */
const IDLE_WAIT = 400;

let defs: SVGDefsElement | null = null;
let counter = 0;
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

function getDefs(): SVGDefsElement {
	if (defs?.isConnected) return defs;
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('aria-hidden', 'true');
	svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
	defs = document.createElementNS(SVG_NS, 'defs');
	svg.append(defs);
	document.body.append(svg);
	return defs;
}

function createFilter(id: string, seed: number) {
	const filter = document.createElementNS(SVG_NS, 'filter');
	filter.id = id;
	// Room for the smear to spill past the text box without being clipped.
	filter.setAttribute('x', '-20%');
	filter.setAttribute('y', '-40%');
	filter.setAttribute('width', '140%');
	filter.setAttribute('height', '180%');

	const noise = document.createElementNS(SVG_NS, 'feTurbulence');
	noise.setAttribute('type', 'fractalNoise');
	noise.setAttribute('baseFrequency', '0.012 0.06');
	// A second octave only adds detail finer than the blur on top of it
	// leaves, and roughly doubled the noise work in every frame.
	noise.setAttribute('numOctaves', '1');
	noise.setAttribute('seed', String(seed));
	noise.setAttribute('result', 'noise');

	const displace = document.createElementNS(SVG_NS, 'feDisplacementMap');
	displace.setAttribute('in', 'SourceGraphic');
	displace.setAttribute('in2', 'noise');
	displace.setAttribute('xChannelSelector', 'R');
	displace.setAttribute('yChannelSelector', 'G');
	displace.setAttribute('result', 'smeared');

	const blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
	blur.setAttribute('in', 'smeared');

	filter.append(noise, displace, blur);
	return { filter, displace, blur };
}

/** Fast start, long soft landing: the ink settles rather than stops. */
function easeOutCubic(t: number) {
	return 1 - (1 - t) ** 3;
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
		let cleanup: (() => void) | null = null;

		function reveal() {
			const seed = ++counter % 97;
			const parent = node.parentElement;
			if (!parent) return;

			// Wetness over the reveal, sampled for the keyframes.
			const times = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
			const wets = times.map((t) => 1 - easeOutCubic(t));
			const envelope = times.map((t) => Math.min(1, t * 2.2));

			// How much of stage k shows at wetness w: a tent between its
			// neighbours, so two adjacent stages always add up to one.
			const levels = [...STAGES, 0];
			const weight = (k: number, w: number) => {
				const here = levels[k];
				const wetter = levels[k - 1];
				const drier = levels[k + 1];
				if (w >= here)
					return wetter === undefined ? 1 : Math.max(0, (wetter - w) / (wetter - here));
				return drier === undefined ? 1 : Math.max(0, (w - drier) / (here - drier));
			};

			const copies: HTMLElement[] = [];
			const filters: SVGFilterElement[] = [];
			STAGES.forEach((level, k) => {
				const id = `ink-${counter}-${k}`;
				const { filter, displace, blur } = createFilter(id, seed);
				displace.setAttribute('scale', String(spread * level));
				blur.setAttribute('stdDeviation', String(8 * level));
				getDefs().append(filter);
				filters.push(filter);

				const copy = node.cloneNode(true) as HTMLElement;
				for (const el of [copy, ...copy.querySelectorAll<HTMLElement>('[id]')])
					el.removeAttribute('id');
				delete copy.dataset.ink;
				delete copy.dataset.inkArmed;
				copy.setAttribute('aria-hidden', 'true');
				copy.inert = true;
				Object.assign(copy.style, {
					position: 'absolute',
					left: `${node.offsetLeft}px`,
					top: `${node.offsetTop}px`,
					width: `${node.offsetWidth}px`,
					height: `${node.offsetHeight}px`,
					margin: '0',
					boxSizing: 'border-box',
					pointerEvents: 'none',
					filter: `url(#${id})`,
					willChange: 'opacity',
					opacity: '0'
				});
				node.after(copy);
				copies.push(copy);
			});

			node.dataset.inked = '';
			const timing = { duration: DURATION, easing: 'linear', fill: 'forwards' as const };
			animations = copies.map((copy, k) =>
				copy.animate(
					times.map((_, i) => ({ opacity: envelope[i] * weight(k, wets[i]) })),
					timing
				)
			);
			animations.push(
				node.animate(
					times.map((_, i) => ({
						opacity: envelope[i] * weight(STAGES.length, wets[i]),
						filter: `blur(${(8 * wets[i]).toFixed(2)}px)`
					})),
					timing
				)
			);

			cleanup = () => {
				for (const animation of animations) animation.cancel();
				for (const copy of copies) copy.remove();
				for (const filter of filters) filter.remove();
				animations = [];
			};
			animations.at(-1)!.finished.then(
				() => cleanup?.(),
				() => {}
			);
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
			cleanup?.();
		};
	};
}
