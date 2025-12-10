<script lang="ts">
	import TitleBar from '../../components/TitleBar.svelte';
	import { m } from '$lib/paraglide/messages';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { WebEras } from '$lib/Types.ts';
	import SlideShow from '../../components/photography/SlideShow.svelte';

	const web_era: WebEras = 'modern_minimal';
	let isMobile: boolean = $derived(false);

	const images = [
		{
			name: m.alt_daikoku_toyota_chaser(),
			path: 'photography-page-images/Daikoku-Toyota-Chaser.jpg'
		},
		{
			name: m.alt_tokyo_tower_mori_art_museum(),
			path: 'photography-page-images/MoriArtMuseum-TokyoTower.jpg'
		},
		{
			name: m.alt_ueteliberg_kindergarten(),
			path: 'photography-page-images/Ueteliberg-Kindergarten.jpg'
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

<div class="photography-page" class:modern-minimal-background={web_era === 'modern_minimal'}>
	<TitleBar era={web_era} {isMobile} />

	<div class="photography-page-content">
		<div class:modern-minimal-container={web_era === 'modern_minimal'} style="padding: 1rem">
			<SlideShow {images} />
		</div>
		<div class:modern-minimal-container={web_era === 'modern_minimal'} style="padding: 1rem">
			<h3>My Journey</h3>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. In facilisis non libero at
				dignissim. Phasellus semper nisl sed nisi pretium, eu volutpat est imperdiet. Vestibulum
				gravida sem eget erat pharetra, eu fringilla ante vestibulum. Sed eu justo eget libero
				tristique scelerisque imperdiet non dui. Pellentesque neque sapien, tempus at diam in,
				euismod dignissim neque. Duis quis nibh ac erat varius bibendum. Maecenas ultrices felis
				eget facilisis ultrices. In congue euismod dui, nec sollicitudin nibh gravida eget. Ut
				malesuada ante vel est gravida, a congue eros consequat. Donec sagittis nulla ac arcu
				pretium, aliquam luctus arcu varius. Cras feugiat hendrerit urna et auctor. Nulla vehicula
				eleifend lacinia. Curabitur condimentum sagittis posuere. Mauris feugiat ipsum in metus
				iaculis, a eleifend urna tempor. Vestibulum pharetra, orci non aliquet consequat, lorem ante
				venenatis lacus, et ultricies diam ligula vel turpis. Mauris nisl augue, pretium vitae
				ligula vitae, tincidunt convallis nulla.
			</p>
		</div>
	</div>
</div>

<style lang="css">
	.photography-page {
		width: 100%;
		min-height: 98vh;
		padding: 1vh 0;
		display: flex;
		flex-direction: column;
		margin: 0;
		flex: 1;
	}

	.photography-page-content {
		margin: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
