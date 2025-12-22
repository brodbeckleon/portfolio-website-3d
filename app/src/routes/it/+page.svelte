<script lang="ts">
	import ThreeStateToggle from '../../components/it/ThreeStateToggle.svelte';
	import TitleBar from '../../components/TitleBar.svelte';
	import type { WebEras } from '$lib/Types.ts';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Snake from '../../components/games/snake/Snake.svelte';

	let web_era: WebEras = $derived('modern_minimal');

	let isMobile: boolean = $derived(false);

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

<div
	class="it-page"
	class:earlyweb-background={web_era === 'early_web'}
	class:frutiger-aero-background={web_era === 'frutiger_aero'}
	class:modern-minimal-background={web_era === 'modern_minimal'}
>
	<TitleBar era={web_era} {isMobile} />
	<div class="it-page-content">
		<ThreeStateToggle bind:web_era />
		<div
			class:glassmorphism-container={web_era === 'glassmorphism'}
			class:earlyweb-container={web_era === 'early_web'}
			class:frutiger-aero-container={web_era === 'frutiger_aero'}
			class:modern-minimal-container={web_era === 'modern_minimal'}
			style="padding: 1rem"
		>
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
		<div
			class:glassmorphism-container={web_era === 'glassmorphism'}
			class:earlyweb-container={web_era === 'early_web'}
			class:frutiger-aero-container={web_era === 'frutiger_aero'}
			class:modern-minimal-container={web_era === 'modern_minimal'}
			style="padding: 1rem"
		>
			{#if web_era === 'early_web'}
				<Snake {isMobile} />
			{:else if web_era === 'frutiger_aero'}
				harmonia
			{:else if web_era === 'modern_minimal'}
				wordle
			{/if}
		</div>
	</div>
</div>

<style>
	.it-page {
		width: 100%;
		min-height: 98vh;
		padding: 1vh 0;
		display: flex;
		flex-direction: column;
		margin: 0;
		flex: 1;
	}
	.it-page-content {
		margin: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
