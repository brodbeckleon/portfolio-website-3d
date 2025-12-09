<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/glassmorphism.css';
	import '$lib/styles/modern-minimal.css';
	import '$lib/styles/frutiger-aero.css';
	import '$lib/styles/early-web.css';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
