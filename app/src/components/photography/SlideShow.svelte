<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { Image } from '$lib/Types.ts';
	import { onMount } from 'svelte';

	interface SlideShowProps {
		images: Image[];
	}
	let { images }: SlideShowProps = $props();

	let elapsedTime: number = $state(0);
	const duration: number = 5000;

	let imageShowingIndex = $state(0);
	let image = $derived(images[imageShowingIndex]);

	let imageContainerRef: HTMLDivElement | undefined = $state();

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

	<div class="image-wrapper" bind:this={imageContainerRef}>
		<img
			class="slide-show-image"
			alt={image.name}
			src={image.path}
			style:border-radius={imageContainerRef &&
			imageContainerRef.scrollHeight > imageContainerRef.clientHeight
				? '0'
				: 'var(--mm-radius)'}
		/>
	</div>

	<button class="slide-show-button" type="button" onclick={nextSlide} aria-label="go to next slide">
		<ChevronRight />
	</button>
</div>

<style lang="css">
	.image-gallery-container {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		height: 80vh;
		width: 100%;
		gap: 1rem;
	}

	.image-wrapper {
		height: 100%;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: var(--mm-radius);
		overflow: hidden;
		background-color: transparent;
	}

	.slide-show-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		display: block;
	}

	.slide-show-button {
		background-color: var(--mm-bg);
		border-radius: var(--mm-radius);
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		z-index: 10;
	}

	.slide-show-button:hover {
		background-color: rgba(255, 255, 255, 0.4);
	}

	.slide-show-button:active {
		background-color: rgba(255, 255, 255, 0.3);
	}
</style>
