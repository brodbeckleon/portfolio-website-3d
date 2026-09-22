<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '@fontsource-variable/inter/wght.css';
	import '$lib/styles/layout.css';
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
	<span class="wip-banner__dot" aria-hidden="true"></span>
	<strong>{m.wip_banner_title()}</strong>
	<span class="wip-banner__body">{m.wip_banner_body()}</span>
</div>

{@render children()}

<style>
	/* Theme-neutral on purpose: this bar sits above every era, so it carries its
	   own neutral palette rather than any one theme's, and follows light/dark. */
	.wip-banner {
		--wip-bg: rgba(255, 255, 255, 0.82);
		--wip-ink: #56564f;
		--wip-strong: #17181a;
		--wip-line: rgba(0, 0, 0, 0.1);

		position: sticky;
		top: 0;
		z-index: 1100;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: baseline;
		justify-content: center;
		padding: 0.4rem 1rem;
		font-size: 0.75rem;
		line-height: 1.4;
		color: var(--wip-ink);
		background: var(--wip-bg);
		backdrop-filter: blur(12px) saturate(1.4);
		-webkit-backdrop-filter: blur(12px) saturate(1.4);
		border-bottom: 1px solid var(--wip-line);
	}

	@media (prefers-color-scheme: dark) {
		:global(html:not([data-theme='light'])) .wip-banner {
			--wip-bg: rgba(16, 17, 16, 0.82);
			--wip-ink: #a2a399;
			--wip-strong: #eceae4;
			--wip-line: rgba(255, 255, 255, 0.12);
		}
	}

	:global(html[data-theme='dark']) .wip-banner {
		--wip-bg: rgba(16, 17, 16, 0.82);
		--wip-ink: #a2a399;
		--wip-strong: #eceae4;
		--wip-line: rgba(255, 255, 255, 0.12);
	}

	.wip-banner__dot {
		align-self: center;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		opacity: 0.6;
	}

	.wip-banner strong {
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--wip-strong);
	}

	.wip-banner__body {
		color: inherit;
	}

	@media (max-width: 768px) {
		.wip-banner__body {
			display: none;
		}
	}

	/* The SvelteKit wrapper uses display:contents, so the banner and the page
	   become body's flex children — that lets a page fill the leftover height
	   and stops the body background showing through below short pages. */
	:global(body) {
		margin: 0;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		font-family: 'Helvetica', 'Arial', sans-serif;
	}

	/* Only the 3D homepage locks scrolling; content routes must scroll. */
	:global(html.lock-scroll),
	:global(html.lock-scroll body) {
		overflow: hidden;
	}
</style>
