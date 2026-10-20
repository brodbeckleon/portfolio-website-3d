<script lang="ts">
	import '@fontsource-variable/bodoni-moda/opsz.css';
	import '@fontsource/shippori-mincho/400.css';
	import TitleBar from '../TitleBar.svelte';
	import PaperGrain from './PaperGrain.svelte';
	import InkCursor from './InkCursor.svelte';
	import PhotoHero from './PhotoHero.svelte';
	import SeriesRow from './SeriesRow.svelte';
	import PhotoContact from './PhotoContact.svelte';
	import Loupe from './Loupe.svelte';
	import { m } from '$lib/paraglide/messages';
	import { browser } from '$app/environment';
	import { goto, pushState, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { WebEras } from '$lib/Types.ts';
	import { PHOTOS, SERIES, getPhoto } from '$lib/photos';

	interface PhotographyViewProps {
		/** Set by /photography/[id] when a photo URL is loaded directly. */
		routeId?: string;
	}

	let { routeId }: PhotographyViewProps = $props();

	// The header is the shared modern-minimal one; paper-ink.css re-points
	// its tokens at the ink, so it needs no era of its own.
	const web_era: WebEras = 'modern_minimal';
	let isMobile: boolean = $state(false);

	// Only series that have photos get a row, in SERIES order.
	const rows = SERIES.map((series) => ({
		series,
		photos: PHOTOS.filter((photo) => photo.series === series.id)
	})).filter((row) => row.photos.length > 0);

	// Shallow-routing state wins once the visitor moves through the loupe; on
	// a direct load there is none yet, so the route parameter decides.
	let openId = $derived(page.state.photoId ?? routeId ?? null);
	let openPhoto = $derived(openId ? getPhoto(openId) : undefined);

	function openFromIndex(id: string) {
		pushState(resolve('/photography/[id]', { id }), { photoId: id, fromIndex: true });
	}

	// Stepping through the loupe replaces the entry, so Back leaves the loupe
	// instead of rewinding through every photo seen.
	function selectInLoupe(id: string) {
		replaceState(resolve('/photography/[id]', { id }), { ...page.state, photoId: id });
	}

	function closeLoupe() {
		if (page.state.fromIndex) {
			history.back();
		} else {
			goto(resolve('/photography'));
		}
	}

	function checkIfMobile() {
		if (browser) {
			isMobile = window.innerWidth <= 768;
		}
	}

	onMount(() => {
		if (!browser) return;

		checkIfMobile();
		window.addEventListener('resize', checkIfMobile);

		return () => window.removeEventListener('resize', checkIfMobile);
	});
</script>

<svelte:head>
	{#if openPhoto}
		<title>{m.photo_page_title({ name: openPhoto.alt() })}</title>
		<meta property="og:title" content={openPhoto.alt()} />
		<meta property="og:image" content={new URL(openPhoto.image.img.src, page.url).href} />
		<meta property="og:image:width" content={String(openPhoto.image.img.w)} />
		<meta property="og:image:height" content={String(openPhoto.image.img.h)} />
		<meta property="og:image:alt" content={openPhoto.alt()} />
	{:else}
		<title>{m.photography()} · {m.leon_shinichi()}</title>
	{/if}
</svelte:head>

<div class="photography-page paper-ink modern-minimal-font">
	<PaperGrain />
	<InkCursor />

	<div class="photography-page__chrome">
		<TitleBar era={web_era} {isMobile} compact />
	</div>

	<main class="photography-page__content">
		<PhotoHero />

		{#each rows as row, index (row.series.id)}
			<SeriesRow series={row.series} photos={row.photos} {index} onOpen={openFromIndex} />
		{/each}

		<PhotoContact />
	</main>

	<Loupe photos={PHOTOS} {openId} onSelect={selectInLoupe} onClose={closeLoupe} />
</div>

<style lang="css">
	.photography-page {
		position: relative;
		width: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
		margin: 0;
		/* The grain is a fixed layer behind everything; this stacking context
		   keeps it below the content instead of below the whole document. */
		isolation: isolate;
	}

	.photography-page__chrome,
	.photography-page__content {
		position: relative;
		z-index: 1;
	}

	/* Above the content: the mobile action bar is fixed inside the header and
	   would otherwise slide under the page as it scrolls. */
	.photography-page__chrome {
		z-index: 2;
	}

	.photography-page__content {
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 768px) {
		/* Clear the fixed mobile action bar. */
		.photography-page__content {
			padding-bottom: 5.5rem;
		}

		/* The shared bar floats bare elsewhere; here its icons would drift
		   across the photos as they scroll past. A strip of the same grainy
		   paper, edge to edge under a dashed rule, keeps every picture clear
		   of chrome and reads as the bottom margin of the page. */
		.photography-page__chrome :global(.mobile-footer) {
			inset: auto 0 0;
			isolation: isolate;
			padding: var(--mm-s2) var(--pi-gutter) max(var(--mm-s2), env(safe-area-inset-bottom));
			border-top: 1px dashed var(--pi-line);
			background: var(--pi-paper);
		}

		.photography-page__chrome :global(.mobile-footer)::before {
			content: '';
			position: absolute;
			inset: 0;
			z-index: -1;
			background-image: var(--pi-grain-tile);
			background-size: var(--pi-grain-size);
			opacity: var(--pi-grain-opacity);
			mix-blend-mode: var(--pi-grain-blend);
			pointer-events: none;
		}
	}
</style>
