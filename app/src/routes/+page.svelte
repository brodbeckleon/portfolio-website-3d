<script>
	import ThreePortfolio from '../components/ThreePortfolio.svelte';
	import TitleBar from '../components/TitleBar.svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let isMobile = $derived(false);

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

<div class="home-page">
	<TitleBar era="glassmorphism" {isMobile} />
	<ThreePortfolio {isMobile} />
</div>

<style lang="css">
	:global(body) {
		margin: 0;
		overflow: hidden;
	}

	:global(#svelte) {
		width: 100%;
		height: 100%;
	}

	:global(body) {
		font-family: 'Helvetica', 'Arial', sans-serif;
	}
</style>
