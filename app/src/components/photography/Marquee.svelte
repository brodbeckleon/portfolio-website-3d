<script lang="ts">
	import { Pause, Play } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';

	interface MarqueeProps {
		text: string;
	}

	let { text }: MarqueeProps = $props();

	// Each half has to be at least as wide as the band, or a gap opens before
	// the loop restarts. Four copies of a ~100-character line clear the
	// widest shell (96rem) with room to spare, even in the shortest locale.
	const COPIES = 4;
	const halves = [0, 1];
	const copies = Array.from({ length: COPIES }, (_, i) => i);

	// Hover alone cannot stop it for keyboard and touch users, and WCAG 2.2.2
	// wants a way to stop anything that keeps moving past five seconds.
	let paused = $state(false);
</script>

<!-- The moving copies are decoration; the sentence itself is read once. -->
<div class="marquee" class:paused>
	<span class="marquee__sr">{text}</span>
	<div class="marquee__track" aria-hidden="true">
		{#each halves as half (half)}
			<div class="marquee__half">
				{#each copies as copy (copy)}
					<span class="marquee__item">{text}</span>
					<span class="marquee__sep"></span>
				{/each}
			</div>
		{/each}
	</div>
	<button
		class="marquee__toggle"
		type="button"
		aria-pressed={paused}
		aria-label={paused ? m.marquee_play() : m.marquee_pause()}
		onclick={() => (paused = !paused)}
	>
		{#if paused}
			<Play size={12} aria-hidden="true" />
		{:else}
			<Pause size={12} aria-hidden="true" />
		{/if}
	</button>
</div>

<style lang="css">
	.marquee {
		position: relative;
		display: flex;
		align-items: center;
		height: 2.125rem;
		overflow: hidden;
		background-color: var(--pi-ink);
		color: var(--pi-paper);
		font-size: var(--mm-text-sm);
		line-height: 1;
		user-select: none;
	}

	.marquee__sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.marquee__track {
		display: flex;
		width: max-content;
		/* Two identical halves: sliding by exactly one half lands on a frame
		   indistinguishable from the start, so the loop has no seam. */
		animation: marquee-slide 56s linear infinite;
	}

	.marquee:hover .marquee__track,
	.marquee.paused .marquee__track {
		animation-play-state: paused;
	}

	/* Sits on the band's right end, on a patch of ink so the text slides
	   under it rather than through it. */
	.marquee__toggle {
		position: absolute;
		inset-block: 0;
		right: 0;
		display: grid;
		place-items: center;
		width: 2.125rem;
		padding: 0;
		border: 0;
		background-color: var(--pi-ink);
		box-shadow: -0.75rem 0 0.75rem var(--pi-ink);
		color: var(--pi-paper);
		cursor: pointer;
	}

	.marquee__toggle:focus-visible {
		outline: 2px solid var(--pi-paper);
		outline-offset: -4px;
	}

	.marquee__half {
		display: flex;
		flex: none;
		align-items: center;
	}

	.marquee__item {
		white-space: nowrap;
	}

	/* A printer's bullet between repeats, so the loop reads as one line. */
	.marquee__sep {
		flex: none;
		width: 4px;
		height: 4px;
		margin-inline: 1.75rem;
		border-radius: 50%;
		background-color: currentColor;
	}

	@keyframes marquee-slide {
		to {
			transform: translateX(-50%);
		}
	}

	/* Still: the first copy alone, cut with an ellipsis where the band ends. */
	@media (prefers-reduced-motion: reduce) {
		.marquee {
			padding-inline: var(--mm-s4);
		}

		.marquee__track {
			width: 100%;
			min-width: 0;
			animation: none;
		}

		.marquee__half {
			flex: 1;
			min-width: 0;
		}

		.marquee__half + .marquee__half,
		.marquee__item ~ .marquee__item,
		.marquee__sep {
			display: none;
		}

		.marquee__item {
			overflow: hidden;
			text-overflow: ellipsis;
		}

		/* Nothing moves, so there is nothing to pause. */
		.marquee__toggle {
			display: none;
		}
	}
</style>
