<script>
	import ThreePortfolio from '../components/ThreePortfolio.svelte';
	import TitleBar from '../components/TitleBar.svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let isMobile = $state(false);

	function checkIfMobile() {
		if (browser) {
			isMobile = window.innerWidth <= 768;
		}
	}

	onMount(() => {
		if (!browser) return;

		checkIfMobile();
		window.addEventListener('resize', checkIfMobile);

		// The 3D scene is exactly one viewport tall; lock scrolling while it is
		// mounted instead of globally, so /it and /photography stay scrollable.
		document.documentElement.classList.add('lock-scroll');

		return () => {
			window.removeEventListener('resize', checkIfMobile);
			document.documentElement.classList.remove('lock-scroll');
		};
	});
</script>

<div class="home-page">
	<TitleBar era="glassmorphism" {isMobile} />
	<ThreePortfolio {isMobile} />
</div>

<style lang="css">
	.home-page {
		font-family: 'Helvetica', 'Arial', sans-serif;
	}
</style>
