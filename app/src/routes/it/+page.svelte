<script lang="ts">
	import ThreeStateToggle from '../../components/ThreeStateToggle.svelte';
	import TitleBar from '../../components/TitleBar.svelte';
    import type { WebEras } from "$lib/Types.ts";

	let web_era: WebEras = $derived('frutiger_aero');
</script>

<div class="it-page">
	<TitleBar era={web_era} />
	<ThreeStateToggle bind:web_era />
</div>
