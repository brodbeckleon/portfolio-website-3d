<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/glassmorphism.css';
	import '$lib/styles/modern-minimal.css';
	import '$lib/styles/frutiger-aero.css';
	import '$lib/styles/early-web.css';
	import { m } from '$lib/paraglide/messages';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="wip-banner" role="status" aria-live="polite">
	<strong>{m.wip_banner_title()}</strong>
	<span>{m.wip_banner_body()}</span>
</div>

{@render children()}

<style>
	.wip-banner {
		position: sticky;
		top: 0;
		z-index: 1100;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		padding: 0.75rem 1rem;
		background: rgba(15, 15, 15, 0.9);
		color: #f6f6f6;
		backdrop-filter: blur(8px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.15);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
	}

	.wip-banner strong {
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.9rem;
	}

	.wip-banner span {
		font-size: 0.9rem;
	}
</style>
