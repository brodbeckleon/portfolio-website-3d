<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '@fontsource-variable/inter/wght.css';
	import '$lib/styles/layout.css';
	import '$lib/styles/glassmorphism.css';
	import '$lib/styles/modern-minimal.css';
	import '$lib/styles/frutiger-aero.css';
	import '$lib/styles/early-web.css';
	import '$lib/styles/paper-ink.css';
	import { m } from '$lib/paraglide/messages';
	import { onNavigate } from '$app/navigation';
	let { children } = $props();

	const SHUTTER_CLASS = 'shutter-transition';

	/**
	 * Desk camera -> photography is the one navigation that gets a transition:
	 * the page behind the AT-1 is revealed like a frame behind a focal-plane
	 * shutter. Everything else stays an instant swap, so the effect keeps
	 * meaning "you just took a picture" rather than becoming page chrome.
	 */
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (navigation.from?.route.id !== '/') return;
		if (!navigation.to?.route.id?.startsWith('/photography')) return;

		const root = document.documentElement;

		return new Promise<void>((resolveNavigation) => {
			// Set before the old state is captured, so the shutter styles below
			// apply to this transition only and never to a future one.
			root.classList.add(SHUTTER_CLASS);

			const transition = document.startViewTransition(async () => {
				resolveNavigation();
				await navigation.complete;
			});

			transition.finished
				.finally(() => root.classList.remove(SHUTTER_CLASS))
				// A cancelled navigation rejects the update callback; that is not
				// an error here, the class just has to come off.
				.catch(() => {});
		});
	});
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

<!-- The curtain's leading edge. Hidden except during the shutter transition,
     where it is captured as its own layer so it can run ahead of the wipe. -->
<div class="shutter-edge" aria-hidden="true"></div>

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

	/* Focal-plane shutter. The first curtain uncovers the frame from top to
	   bottom: the old page holds still and the new one is revealed by an edge
	   that travels down over it. Scoped to html.shutter-transition, which only
	   exists while this one transition runs. */
	.shutter-edge {
		display: none;
	}

	:global(html.shutter-transition) .shutter-edge {
		display: block;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		pointer-events: none;
		/* Always the dark ramp: a shutter curtain is black whatever the theme. */
		background: var(--mm-d-sunken);
		box-shadow: 0 0 6px rgb(var(--mm-d-shadow-color) / 0.45);
		view-transition-name: shutter-edge;
	}

	/* No crossfade: the old page is simply covered. The UA blends the pair with
	   plus-lighter for its fade, which would wash the revealed page out, so
	   that is reset too. */
	:global(html.shutter-transition::view-transition-old(root)),
	:global(html.shutter-transition::view-transition-new(root)) {
		animation: none;
		mix-blend-mode: normal;
	}

	/* Fast, hard-stopping ease: a curtain is sprung, it does not glide. */
	:global(html.shutter-transition::view-transition-new(root)) {
		animation: shutter-reveal 380ms cubic-bezier(0.7, 0, 0.3, 1) both;
	}

	/* The edge layer runs on the same curve as the wipe, so it stays on the
	   boundary and leaves the screen exactly as the frame is fully open. */
	:global(html.shutter-transition::view-transition-group(shutter-edge)) {
		animation: shutter-edge-travel 380ms cubic-bezier(0.7, 0, 0.3, 1) both;
	}

	:global(html.shutter-transition::view-transition-old(shutter-edge)) {
		animation: none;
		opacity: 0;
	}

	:global(html.shutter-transition::view-transition-new(shutter-edge)) {
		animation: none;
		mix-blend-mode: normal;
	}

	@keyframes shutter-reveal {
		from {
			clip-path: inset(0 0 100% 0);
		}
		to {
			clip-path: inset(0);
		}
	}

	@keyframes shutter-edge-travel {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(100vh);
		}
	}

	/* JS never starts the transition under reduced motion; this covers any
	   path that might still get here. */
	@media (prefers-reduced-motion: reduce) {
		:global(html.shutter-transition::view-transition-group(*)),
		:global(html.shutter-transition::view-transition-old(*)),
		:global(html.shutter-transition::view-transition-new(*)) {
			animation: none !important;
		}

		:global(html.shutter-transition) .shutter-edge {
			display: none;
		}
	}
</style>
