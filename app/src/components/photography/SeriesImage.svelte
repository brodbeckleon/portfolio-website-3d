<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { m } from '$lib/paraglide/messages';
	import type { Photo } from '$lib/photos';

	interface SeriesImageProps {
		photo: Photo;
		/** Worked out by the caller for its layout slot; srcset is 400-1600. */
		sizes: string;
		onOpen: (id: string) => void;
		/** For the first cover on the page, which sits just under the hero. */
		eager?: boolean;
	}

	let { photo, sizes, onOpen, eager = false }: SeriesImageProps = $props();

	// The intrinsic ratio, for callers that size a slot by it (equal-height
	// rows, a height cap on portrait covers) without waiting for the image.
	let ratio = $derived(photo.image.img.w / photo.image.img.h);

	// Set by the attachment; in the markup so the styles that read them stay.
	let armed = $state(false);
	let shown = $state(false);

	/**
	 * Shutter reveal: the frame opens top to bottom the first time it comes
	 * into view, like the focal-plane shutter on the home page's camera.
	 *
	 * Same contract as $lib/ink: data-shutter is in the server markup, and
	 * html.ink-ready (motion allowed, JS on its way) hides it until this
	 * attachment arms it. Without ink-ready the photo is simply there.
	 */
	const shutter: Attachment<HTMLElement> = (node) => {
		if (!document.documentElement.classList.contains('ink-ready')) return;

		armed = true;
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				shown = true;
			},
			{ threshold: 0.2 }
		);
		observer.observe(node);

		return () => observer.disconnect();
	};
</script>

<button
	type="button"
	class="series-image"
	style:--ratio={ratio}
	aria-label={m.open_photo({ name: photo.alt() })}
	onclick={() => onOpen(photo.id)}
	data-shutter
	data-armed={armed ? '' : undefined}
	data-shown={shown ? '' : undefined}
	{@attach shutter}
>
	<enhanced:img src={photo.image} alt={photo.alt()} {sizes} loading={eager ? 'eager' : 'lazy'} />
</button>

<style lang="css">
	.series-image {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}

	/* The shutter and the hover clip live on the picture, not the button: a
	   clip-path on the observed element hides it from IntersectionObserver,
	   and it would cut off the focus outline. Paper-2 only shows while the
	   file is still loading; nothing is ever drawn over the photo itself. */
	.series-image :global(picture) {
		display: block;
		overflow: hidden;
		background-color: var(--pi-paper-2);
	}

	/* Full frame, always: the photo's own ratio, never a crop. */
	.series-image :global(img) {
		display: block;
		width: 100%;
		height: auto;
		transform-origin: 50% 40%;
		transition: transform 900ms var(--pi-ease-out);
	}

	/* A breath of a lift, kept inside the frame by the overflow clip. Only
	   on real hover: a tap would otherwise leave the zoom stuck on touch. */
	@media (hover: hover) {
		.series-image:hover :global(img) {
			transform: scale(1.015);
		}
	}

	.series-image:focus-visible :global(img) {
		transform: scale(1.015);
	}

	.series-image:focus-visible {
		outline: 2px solid var(--pi-ink);
		outline-offset: 4px;
	}

	/* Everything that hides or moves the frame sits behind no-preference,
	   so a switch to reduced motion mid-visit (ink-ready is already on by
	   then) can never leave a photo clipped shut. */
	@media (prefers-reduced-motion: no-preference) {
		/* Closed until the attachment arms it. If it never does, the
		   failsafe opens the frame after a few seconds rather than
		   leaving a blank. */
		:global(html.ink-ready) .series-image[data-shutter]:not([data-armed]) :global(picture) {
			clip-path: inset(0 0 100% 0);
			animation: series-image-failsafe 0s linear 6s forwards;
		}

		:global(html.ink-ready) .series-image[data-armed]:not([data-shown]) :global(picture) {
			clip-path: inset(0 0 100% 0);
		}

		/* Animations rather than transitions, so the reveal can be slow
		   while the hover stays quick. */
		.series-image[data-armed][data-shown] :global(picture) {
			animation: series-image-open 900ms var(--pi-ease-out);
		}

		.series-image[data-armed][data-shown] :global(img) {
			animation: series-image-settle 1400ms var(--pi-ease-out);
		}
	}

	@keyframes series-image-open {
		from {
			clip-path: inset(0 0 100% 0);
		}
		to {
			clip-path: inset(0);
		}
	}

	@keyframes series-image-settle {
		from {
			transform: scale(1.04);
		}
		to {
			transform: scale(1);
		}
	}

	@keyframes series-image-failsafe {
		to {
			clip-path: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.series-image :global(img) {
			transition: none;
		}

		.series-image:hover :global(img),
		.series-image:focus-visible :global(img) {
			transform: none;
		}
	}
</style>
