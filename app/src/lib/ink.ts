import type { Attachment } from 'svelte/attachments';

/**
 * Ink reveal: text arrives smeared like fresh ink and dries sharp.
 *
 * Usage: `<h2 data-ink {@attach ink({ delay: 120 })}>`. The data-ink
 * attribute has to be in the markup itself, because the server render is
 * what paper-ink.css hides before first paint; the attachment only exists
 * in the browser.
 *
 * Each element gets its own SVG filter (turbulence -> displacement -> blur)
 * whose strength runs down to zero. Afterwards the filter is removed
 * entirely: a filtered element repaints on every frame, sharp text does not.
 *
 * While it is wet, the element is also lifted onto a compositor layer of its
 * own. Chrome rasterizes SVG filters on the CPU, and without the layer each
 * filter change repainted the big shared page layer around the element, for
 * every element of the hero at once: ~2.6 s of raster work in the first
 * seconds of a visit on a 2x screen, which was the stutter at the start.
 * With the layer only the element itself is redrawn, about a tenth of that.
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

const DURATION = 1100;
/**
 * ms between filter updates. Every update re-runs the whole filter chain in
 * software, and the hero reveals a dozen elements at once; at ~30 fps the
 * smear still reads as fluid.
 */
const FRAME_GAP = 30;
/** Displacement in px below which the smear is invisible and the filter goes. */
const DRY = 0.5;
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

function createFilter(id: string) {
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
	noise.setAttribute('seed', String(counter % 97));
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
		let frame = 0;
		let timer = 0;
		let detached = false;
		let cleanupFilter: (() => void) | null = null;

		function reveal() {
			const id = `ink-${++counter}`;
			const { filter, displace, blur } = createFilter(id);
			getDefs().append(filter);
			node.style.filter = `url(#${id})`;
			// Its own layer for as long as the filter runs; see the top.
			node.style.willChange = 'transform';
			node.dataset.inked = '';

			cleanupFilter = () => {
				node.style.filter = '';
				node.style.opacity = '';
				node.style.willChange = '';
				filter.remove();
			};

			const start = performance.now();
			let drawn = -Infinity;
			frame = requestAnimationFrame(function step(now) {
				const t = Math.min((now - start) / DURATION, 1);
				const wet = 1 - easeOutCubic(t);
				if (now - drawn >= FRAME_GAP) {
					drawn = now;
					displace.setAttribute('scale', String(spread * wet));
					blur.setAttribute('stdDeviation', String(8 * wet));
					node.style.opacity = String(Math.min(1, t * 2.2));
				}
				// The ease's long tail is sub-pixel; stop as soon as nothing shows.
				if (t < 1 && spread * wet > DRY) {
					frame = requestAnimationFrame(step);
				} else {
					cleanupFilter?.();
					cleanupFilter = null;
				}
			});
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
			cancelAnimationFrame(frame);
			cleanupFilter?.();
		};
	};
}
