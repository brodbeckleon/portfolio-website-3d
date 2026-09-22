<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { Image } from '$lib/Types.ts';
	import { m } from '$lib/paraglide/messages';
	import { onMount } from 'svelte';

	interface SlideShowProps {
		images: Image[];
	}
	let { images }: SlideShowProps = $props();

	let elapsedTime: number = $state(0);
	const duration: number = 5000;

	let imageShowingIndex = $state(0);
	let image = $derived(images[imageShowingIndex]);

	const goToSlide = (index: number) => {
		elapsedTime = 0;
		imageShowingIndex = index;
	};

	const nextSlide = () => {
		elapsedTime = 0;
		if (imageShowingIndex === images.length - 1) {
			imageShowingIndex = 0;
		} else {
			imageShowingIndex += 1;
		}
	};

	const prevSlide = () => {
		elapsedTime = 0;
		if (imageShowingIndex === 0) {
			imageShowingIndex = images.length - 1;
		} else {
			imageShowingIndex -= 1;
		}
	};

	onMount(() => {
		let last_time = performance.now();

		let frame = requestAnimationFrame(function update(time) {
			frame = requestAnimationFrame(update);

			const delta = Math.min(time - last_time, duration - elapsedTime);
			elapsedTime += delta;
			last_time = time;

			if (elapsedTime >= duration) {
				elapsedTime = 0;
				nextSlide();
			}
		});

		return () => {
			cancelAnimationFrame(frame);
		};
	});
</script>

<div class="image-gallery-container">
	<button
		class="slide-show-button"
		type="button"
		onclick={prevSlide}
		aria-label="go to previous slide"
	>
		<ChevronLeft />
	</button>

	<div class="image-wrapper">
		<img class="slide-show-image" alt={image.name} src={image.path} />
	</div>

	<button class="slide-show-button" type="button" onclick={nextSlide} aria-label="go to next slide">
		<ChevronRight />
	</button>
</div>

<div class="slide-show-indicators" role="tablist" aria-label={m.photography()}>
	{#each images as item, index (item.path)}
		<button
			type="button"
			class="slide-show-dot"
			role="tab"
			aria-selected={index === imageShowingIndex}
			aria-label={item.name}
			onclick={() => goToSlide(index)}
		>
			<span
				class="slide-show-dot__fill"
				style:transform="scaleX({index === imageShowingIndex ? elapsedTime / duration : 0})"
			></span>
		</button>
	{/each}
</div>

<style lang="css">
	.image-gallery-container {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		height: min(72vh, 42rem);
		width: 100%;
		gap: var(--mm-s4);
	}

	/* No frame behind the photo: the image itself carries the radius, so a
	   portrait shot does not sit inside a visible letterbox band. */
	.image-wrapper {
		height: 100%;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.slide-show-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		display: block;
		border-radius: var(--mm-radius-lg);
	}

	.slide-show-indicators {
		display: flex;
		justify-content: center;
		gap: var(--mm-s2);
		margin-top: var(--mm-s5);
	}

	.slide-show-dot {
		position: relative;
		width: 2.5rem;
		height: 1rem;
		padding: 0;
		display: flex;
		align-items: center;
		background: none;
		border: 0;
		cursor: pointer;
	}

	.slide-show-dot::before {
		content: '';
		position: absolute;
		width: 2.5rem;
		height: 2px;
		border-radius: 999px;
		background: var(--mm-border-strong);
	}

	.slide-show-dot__fill {
		position: relative;
		width: 2.5rem;
		height: 2px;
		border-radius: 999px;
		background: var(--mm-accent);
		transform-origin: left center;
		transform: scaleX(0);
	}

	.slide-show-dot:focus-visible {
		outline: 2px solid var(--mm-accent);
		outline-offset: 2px;
		border-radius: var(--mm-radius-sm);
	}

	.slide-show-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		padding: var(--mm-s2);
		background-color: var(--mm-surface);
		border: 1px solid var(--mm-border);
		border-radius: var(--mm-radius-md);
		color: var(--mm-text-muted);
		cursor: pointer;
		z-index: 10;
		transition:
			background-color var(--mm-duration) var(--mm-ease),
			border-color var(--mm-duration) var(--mm-ease),
			color var(--mm-duration) var(--mm-ease);
	}

	.slide-show-button:hover {
		background-color: var(--mm-surface-2);
		border-color: var(--mm-border-strong);
		color: var(--mm-text);
	}

	.slide-show-button:active {
		background-color: var(--mm-accent-wash);
	}

	.slide-show-button:focus-visible {
		outline: 2px solid var(--mm-accent);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.slide-show-button {
			transition: none;
		}
	}
</style>
