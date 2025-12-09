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

<style lang="css">
	html,
	body {
		min-height: 100vh;
		width: 100%;
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		overflow-x: hidden;
		overflow-y: hidden;
	}
</style>
