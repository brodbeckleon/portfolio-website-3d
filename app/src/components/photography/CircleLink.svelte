<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	interface CircleLinkProps {
		label: string;
		/** A link when set, otherwise a button. */
		href?: string;
		onclick?: (event: MouseEvent) => void;
		/** For links that leave the site. */
		external?: boolean;
		rel?: HTMLAnchorAttributes['rel'];
	}

	let { label, href, onclick, external = false, rel }: CircleLinkProps = $props();
</script>

<!-- The ring-and-dot mark used for every call to action on the photography
     side. On hover the dot swells to fill the ring, like ink soaking in. -->
{#if href}
	<!-- Callers resolve() their routes before passing them in, or pass an
	     in-page #anchor or an off-site address; the rule cannot see that
	     through a prop. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		class="circle-link"
		{href}
		{onclick}
		target={external ? '_blank' : undefined}
		rel={external ? (rel ?? 'noopener noreferrer') : rel}
	>
		<span class="circle-link__ring" aria-hidden="true"><span class="circle-link__dot"></span></span>
		<span class="circle-link__label">{label}</span>
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button class="circle-link" type="button" {onclick}>
		<span class="circle-link__ring" aria-hidden="true"><span class="circle-link__dot"></span></span>
		<span class="circle-link__label">{label}</span>
	</button>
{/if}

<style lang="css">
	.circle-link {
		display: inline-flex;
		align-items: center;
		gap: var(--mm-s4);
		padding: 0;
		border: 0;
		background: none;
		color: var(--pi-ink);
		font: inherit;
		font-size: var(--mm-text-base);
		text-decoration: none;
		cursor: pointer;
	}

	.circle-link__ring {
		position: relative;
		flex: none;
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid var(--pi-ink);
		border-radius: 50%;
	}

	/* Drawn at its full hover size and clipped down to the 5px dot, so the
	   swell is a growing clip, painted crisp at every step. Scaling a 5px dot
	   up instead left the compositor stretching a 5px bitmap until the
	   transition ended, and the dot came in blurry. 1px short of the ring's
	   inside, so it stops just short of the border. */
	.circle-link__dot {
		width: calc(100% - 1px);
		height: calc(100% - 1px);
		border-radius: 50%;
		background-color: var(--pi-ink);
		clip-path: circle(2.5px);
		transition: clip-path 420ms var(--pi-ease-out);
	}

	.circle-link__label {
		background-image: linear-gradient(currentColor, currentColor);
		background-size: 0% 1px;
		background-position: 0 100%;
		background-repeat: no-repeat;
		transition: background-size 420ms var(--pi-ease-out);
	}

	.circle-link:hover .circle-link__dot,
	.circle-link:focus-visible .circle-link__dot {
		clip-path: circle(50%);
	}

	.circle-link:hover .circle-link__label,
	.circle-link:focus-visible .circle-link__label {
		background-size: 100% 1px;
	}

	.circle-link:focus-visible {
		outline: 2px solid var(--pi-ink);
		outline-offset: 4px;
		border-radius: var(--mm-radius-sm);
	}

	@media (prefers-reduced-motion: reduce) {
		.circle-link__dot,
		.circle-link__label {
			transition: none;
		}
	}
</style>
