<script>
	import ThreePortfolio from '../components/ThreePortfolio.svelte';
	import TitleBar from '../components/TitleBar.svelte';
	import Seo from '../components/Seo.svelte';
	import { m } from '$lib/paraglide/messages';
	import { homeJsonLd } from '$lib/seo';
	import { resolve } from '$app/paths';
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

<Seo title={m.seo_home_title()} description={m.seo_home_description()} path="/" />

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- built from our own constants -->
	{@html `<script type="application/ld+json">${homeJsonLd(m.seo_home_description())}</` + `script>`}
</svelte:head>

<div class="home-page">
	<TitleBar era="glassmorphism" {isMobile} />
	<ThreePortfolio {isMobile} />

	<!-- The scene draws its text into the canvas and navigates on clicks in
	     3D, so neither screen readers nor search engines get any of it. This
	     is the same welcome and the same two ways in, as plain HTML: hidden
	     until a link inside it takes keyboard focus. -->
	<section class="scene-text">
		{#each [m.welcome_message_1( { name: m.leon_shinichi() } ), m.welcome_message_2( { place: m.zurich_switzerland() } ), m.welcome_message_3(), m.welcome_message_4()] as line, index (index)}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- our own message files -->
			<p>{@html line.replace(/\n/g, ' ')}</p>
		{/each}
		<nav>
			<a href={resolve('/it')}>{m.information_technology()}</a>
			<a href={resolve('/photography')}>{m.photography()}</a>
		</nav>
	</section>
</div>

<style lang="css">
	.home-page {
		font-family: 'Helvetica', 'Arial', sans-serif;
	}

	.scene-text:not(:focus-within) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.scene-text:focus-within {
		position: fixed;
		bottom: 1rem;
		left: 50%;
		z-index: 1200;
		transform: translateX(-50%);
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.9);
		color: #17181a;
	}

	.scene-text:focus-within p {
		display: none;
	}

	.scene-text nav {
		display: flex;
		gap: 1rem;
	}

	.scene-text a {
		color: inherit;
	}
</style>
