<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { onMount } from 'svelte';

	interface MatchNeedleProps {
		/** Exposure value at ISO 100, as a hand-held meter would read the scene. */
		ev: number;
	}

	let { ev }: MatchNeedleProps = $props();

	// The AT-1's scale does not need to be faithful, only legible: EV 0 is a
	// candlelit room, EV 18 a snowfield at noon, and every photo lands between.
	const EV_MIN = 0;
	const EV_MAX = 18;
	/** Half the swing in degrees either side of upright. */
	const SWEEP = 66;

	const PIVOT_X = 70;
	const PIVOT_Y = 72;
	const ARC_RADIUS = 56;
	const NEEDLE_LENGTH = 60;
	const LABEL_RADIUS = 42;
	const LABELS = [0, 6, 12, 18];

	const ticks = Array.from({ length: (EV_MAX - EV_MIN) / 2 + 1 }, (_, i) => EV_MIN + i * 2);

	function angleFor(value: number): number {
		return -SWEEP + ((value - EV_MIN) / (EV_MAX - EV_MIN)) * SWEEP * 2;
	}

	/** Point on a circle around the pivot; 0deg is straight up. */
	function polar(radius: number, degrees: number) {
		const radians = (degrees * Math.PI) / 180;
		return {
			x: PIVOT_X + radius * Math.sin(radians),
			y: PIVOT_Y - radius * Math.cos(radians)
		};
	}

	const arcStart = polar(ARC_RADIUS, -SWEEP);
	const arcEnd = polar(ARC_RADIUS, SWEEP);
	const arcPath = `M ${arcStart.x} ${arcStart.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

	// A real needle pins against its stop rather than leaving the scale, and a
	// missing EXIF field should rest it there instead of rendering NaN.
	let clamped = $derived(Number.isFinite(ev) ? Math.min(EV_MAX, Math.max(EV_MIN, ev)) : EV_MIN);
	let label = $derived(m.light_meter({ ev: Number.isFinite(ev) ? ev.toFixed(1) : '–' }));

	// The meter wakes at rest and swings up to the reading, like half-pressing
	// the shutter. Two frames, so the resting angle is painted before it moves
	// and the transition has something to start from.
	let awake = $state(false);
	let angle = $derived(awake ? angleFor(clamped) : angleFor(EV_MIN));

	onMount(() => {
		let second = 0;
		const first = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => (awake = true));
		});
		return () => {
			cancelAnimationFrame(first);
			cancelAnimationFrame(second);
		};
	});
</script>

<div class="match-needle" role="img" aria-label={label}>
	<svg viewBox="0 0 140 80" width="140" height="80" aria-hidden="true" focusable="false">
		<path class="match-needle-arc" d={arcPath} />

		{#each ticks as tick (tick)}
			{@const major = LABELS.includes(tick)}
			{@const outer = polar(ARC_RADIUS + (major ? 5 : 3), angleFor(tick))}
			{@const inner = polar(ARC_RADIUS - (major ? 5 : 2), angleFor(tick))}
			<line
				class="match-needle-tick"
				class:major
				x1={inner.x}
				y1={inner.y}
				x2={outer.x}
				y2={outer.y}
			/>
		{/each}

		{#each LABELS as value (value)}
			{@const at = polar(LABEL_RADIUS, angleFor(value))}
			<text
				class="match-needle-label"
				x={at.x}
				y={at.y}
				text-anchor="middle"
				dominant-baseline="middle">{value}</text
			>
		{/each}

		<!-- Drawn pointing straight up and rotated, so the transition animates
		     one angle instead of interpolating two endpoints. -->
		<g class="match-needle-needle" style:transform="rotate({angle}deg)">
			<line x1={PIVOT_X} y1={PIVOT_Y} x2={PIVOT_X} y2={PIVOT_Y - NEEDLE_LENGTH} />
		</g>
		<circle class="match-needle-pivot" cx={PIVOT_X} cy={PIVOT_Y} r="2.5" />
	</svg>
	<span class="match-needle-readout" aria-hidden="true">{label}</span>
</div>

<style lang="css">
	.match-needle {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--mm-s2);
		max-width: 100%;
	}

	svg {
		display: block;
		max-width: 100%;
		height: auto;
		overflow: visible;
	}

	.match-needle-arc {
		fill: none;
		stroke: var(--pi-line);
		stroke-width: 1;
	}

	.match-needle-tick {
		stroke: var(--pi-ink-subtle);
		stroke-width: 0.75;
		stroke-linecap: round;
	}

	.match-needle-tick.major {
		stroke: var(--pi-ink);
		stroke-width: 1;
	}

	.match-needle-label {
		fill: var(--pi-ink-subtle);
		font-family: var(--pi-font-display);
		font-size: 9px;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
	}

	/* transform-box: view-box makes the origin a point in SVG user units, so
	   the needle turns on the pivot rather than on its own bounding box. */
	.match-needle-needle {
		transform-box: view-box;
		transform-origin: 70px 72px;
		transition: transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.match-needle-needle line {
		stroke: var(--pi-ink);
		stroke-width: 1.25;
		stroke-linecap: round;
	}

	/* The pivot cap, so the needle reads as anchored: the same dot the
	   page's calls to action carry. */
	.match-needle-pivot {
		fill: var(--pi-ink);
	}

	.match-needle-readout {
		font-size: var(--mm-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--pi-ink-muted);
	}

	@media (prefers-reduced-motion: reduce) {
		.match-needle-needle {
			transition: none;
		}
	}
</style>
