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
 */

type InkOptions = {
	/** ms after the element comes into view, for staggering a group. */
	delay?: number;
	/** Displacement in px at the start; larger text can take more. */
	spread?: number;
};

const DURATION = 1100;
const SVG_NS = 'http://www.w3.org/2000/svg';

let defs: SVGDefsElement | null = null;
let counter = 0;

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
	noise.setAttribute('numOctaves', '2');
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
		let cleanupFilter: (() => void) | null = null;

		function reveal() {
			const id = `ink-${++counter}`;
			const { filter, displace, blur } = createFilter(id);
			getDefs().append(filter);
			node.style.filter = `url(#${id})`;
			node.dataset.inked = '';

			cleanupFilter = () => {
				node.style.filter = '';
				node.style.opacity = '';
				filter.remove();
			};

			const start = performance.now();
			frame = requestAnimationFrame(function step(now) {
				const t = Math.min((now - start) / DURATION, 1);
				const wet = 1 - easeOutCubic(t);
				displace.setAttribute('scale', String(spread * wet));
				blur.setAttribute('stdDeviation', String(8 * wet));
				node.style.opacity = String(Math.min(1, t * 2.2));
				if (t < 1) {
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
				timer = window.setTimeout(reveal, delay);
			},
			{ threshold: 0.15 }
		);
		observer.observe(node);

		return () => {
			observer.disconnect();
			clearTimeout(timer);
			cancelAnimationFrame(frame);
			cleanupFilter?.();
		};
	};
}
