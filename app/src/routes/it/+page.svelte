<script lang="ts">
	import ThreeStateToggle from '../../components/ThreeStateToggle.svelte';
	import TitleBar from '../../components/TitleBar.svelte';
	import type { WebEras } from '$lib/Types.ts';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let web_era: WebEras = $derived('early_web');

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

<div class="it-page" class:earlyweb-background={web_era === 'early_web'}>
	<TitleBar era={web_era} {isMobile} />
	<div class="it-page-content">
		<ThreeStateToggle bind:web_era />
		<div
			class:glassmorphism-container={web_era === 'glassmorphism'}
			class:earlyweb-container={web_era === 'early_web'}
		>
			<h3>My Journey</h3>
			<p>My IT-Journey started after I became 18.</p>
		</div>
	</div>
</div>

<style>
	.it-page {
		width: 100%;
		min-height: 96vh;
		padding: 1vh 0;
		display: flex;
		flex-direction: column;
	}
	.it-page-content {
		margin: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
