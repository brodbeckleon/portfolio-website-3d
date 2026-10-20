<script lang="ts">
	import TitleBar from '../../components/TitleBar.svelte';
	import { m } from '$lib/paraglide/messages';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { WebEras, Image } from '$lib/Types.ts';
	import SlideShow from '../../components/photography/SlideShow.svelte';

	// Imported through Vite so the photos are content-hashed into /_app/immutable
	// and cached for good. The JPEGs are the untouched originals; the AVIFs are
	// made from them by scripts/optimize-images.mjs, at a quality that keeps the
	// film grain, and are what every current browser picks.
	import daikokuJpg from '$lib/assets/photography/Daikoku-Toyota-Chaser.jpg';
	import daikokuAvif from '$lib/assets/photography/Daikoku-Toyota-Chaser.avif';
	import moriJpg from '$lib/assets/photography/MoriArtMuseum-TokyoTower.jpg';
	import moriAvif from '$lib/assets/photography/MoriArtMuseum-TokyoTower.avif';
	import uetlibergJpg from '$lib/assets/photography/Ueteliberg-Kindergarten.jpg';
	import uetlibergAvif from '$lib/assets/photography/Ueteliberg-Kindergarten.avif';

	const web_era: WebEras = 'modern_minimal';
	let isMobile: boolean = $state(false);

	const images: Image[] = [
		{
			name: m.alt_daikoku_toyota_chaser(),
			path: daikokuJpg,
			avif: daikokuAvif
		},
		{
			name: m.alt_tokyo_tower_mori_art_museum(),
			path: moriJpg,
			avif: moriAvif
		},
		{
			name: m.alt_ueteliberg_kindergarten(),
			path: uetlibergJpg,
			avif: uetlibergAvif
		}
	];

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

<div class="photography-page modern-minimal-background modern-minimal-font">
	<TitleBar era={web_era} {isMobile} compact />

	<main class="photography-page-content site-shell">
		<section class="modern-minimal-section">
			<header class="modern-minimal-section-header">
				<p class="modern-minimal-eyebrow">{m.photography()}</p>
				<h2 class="modern-minimal-display">{m.my_journey()}</h2>
			</header>
			<div class="modern-minimal-prose">
				<p>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. In facilisis non libero at
					dignissim. Phasellus semper nisl sed nisi pretium, eu volutpat est imperdiet. Vestibulum
					gravida sem eget erat pharetra, eu fringilla ante vestibulum. Sed eu justo eget libero
					tristique scelerisque imperdiet non dui.
				</p>
				<p>
					Pellentesque neque sapien, tempus at diam in, euismod dignissim neque. Duis quis nibh ac
					erat varius bibendum. Maecenas ultrices felis eget facilisis ultrices. In congue euismod
					dui, nec sollicitudin nibh gravida eget.
				</p>
			</div>
		</section>

		<section class="modern-minimal-section">
			<SlideShow {images} />
		</section>
	</main>
</div>

<style lang="css">
	.photography-page {
		width: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
		margin: 0;
	}

	.photography-page-content {
		display: flex;
		flex-direction: column;
	}

	/* Clear the fixed mobile action bar. */
	@media (max-width: 768px) {
		.photography-page-content {
			padding-bottom: 5.5rem;
		}
	}
</style>
