<script lang="ts">
	import ThreeStateToggle from '../../components/it/ThreeStateToggle.svelte';
	import TitleBar from '../../components/TitleBar.svelte';
	import type { WebEras } from '$lib/Types.ts';
	import { m } from '$lib/paraglide/messages';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Snake from '../../components/games/snake/Snake.svelte';
	import Wordle from '../../components/games/wordle/Wordle.svelte';

	// The explicit type argument keeps the full union: a bare literal would let
	// TypeScript narrow web_era and report the other era checks as dead code.
	let web_era = $state<WebEras>('modern_minimal');

	let isEarlyWeb = $derived(web_era === 'early_web');
	let isFrutigerAero = $derived(web_era === 'frutiger_aero');
	let isModernMinimal = $derived(web_era === 'modern_minimal');

	let isMobile: boolean = $state(false);

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

<div
	class="it-page"
	class:earlyweb-background={isEarlyWeb}
	class:earlyweb-font={isEarlyWeb}
	class:frutiger-aero-background={isFrutigerAero}
	class:frutiger-aero-font={isFrutigerAero}
	class:modern-minimal-background={isModernMinimal}
	class:modern-minimal-font={isModernMinimal}
>
	<TitleBar era={web_era} {isMobile} compact />

	<!-- Fixed height and the shared shell, directly under a fixed-height header:
	     the switch keeps the exact same spot whichever era you land in. -->
	<div class="it-era-bar site-shell">
		<span
			class="it-era-bar__label"
			class:modern-minimal-eyebrow={isModernMinimal}
			class:frutiger-aero-eyebrow={isFrutigerAero}
		>
			{m.web_era()}
		</span>
		<ThreeStateToggle bind:web_era label={m.web_era()} />
	</div>

	<main class="it-page-content site-shell" class:legacy-flow={!isModernMinimal}>
		<!-- Modern minimal separates sections with whitespace and a hairline; the
		     older eras put the same content inside their own window chrome. -->
		<section
			class="it-section"
			class:modern-minimal-section={isModernMinimal}
			class:earlyweb-container={isEarlyWeb}
			class:frutiger-aero-container={isFrutigerAero}
			class:legacy-panel={!isModernMinimal}
		>
			<header class="it-section__header" class:modern-minimal-section-header={isModernMinimal}>
				<p
					class:modern-minimal-eyebrow={isModernMinimal}
					class:frutiger-aero-eyebrow={isFrutigerAero}
				>
					{m.information_technology()}
				</p>
				<h2
					class:modern-minimal-display={isModernMinimal}
					class:frutiger-aero-display={isFrutigerAero}
				>
					{m.my_journey()}
				</h2>
			</header>
			<div class:modern-minimal-prose={isModernMinimal} class:frutiger-aero-prose={isFrutigerAero}>
				<p>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. In facilisis non libero at
					dignissim. Phasellus semper nisl sed nisi pretium, eu volutpat est imperdiet. Vestibulum
					gravida sem eget erat pharetra, eu fringilla ante vestibulum. Sed eu justo eget libero
					tristique scelerisque imperdiet non dui. Pellentesque neque sapien, tempus at diam in,
					euismod dignissim neque.
				</p>
				<p>
					Duis quis nibh ac erat varius bibendum. Maecenas ultrices felis eget facilisis ultrices.
					In congue euismod dui, nec sollicitudin nibh gravida eget. Ut malesuada ante vel est
					gravida, a congue eros consequat. Donec sagittis nulla ac arcu pretium, aliquam luctus
					arcu varius. Cras feugiat hendrerit urna et auctor. Nulla vehicula eleifend lacinia.
				</p>
			</div>
		</section>

		<section class="it-section" class:modern-minimal-section={isModernMinimal}>
			<div
				class="it-module"
				class:it-module--minimal={isModernMinimal}
				class:it-module--legacy={!isModernMinimal}
				class:modern-minimal-panel={isModernMinimal}
				class:earlyweb-container={isEarlyWeb}
				class:frutiger-aero-container={isFrutigerAero}
			>
				{#if isEarlyWeb}
					<Snake {isMobile} />
				{:else if isFrutigerAero}
					<div class="it-placeholder">
						<h3 class="frutiger-aero-display">Harmonia</h3>
						<p class="frutiger-aero-prose">{m.coming_soon()}</p>
					</div>
				{:else if isModernMinimal}
					<Wordle />
				{/if}
			</div>
		</section>
	</main>
</div>

<style>
	.it-page {
		width: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
		margin: 0;
	}

	.it-era-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 4rem;
	}

	.it-era-bar__label {
		white-space: nowrap;
	}

	.it-page-content {
		display: flex;
		flex-direction: column;
	}

	/* The older eras space their panels instead of using section rules. */
	.legacy-flow {
		gap: 1rem;
		padding-bottom: 1rem;
	}

	/* The era containers ship padding:0, so the inset lives here. */
	.legacy-panel {
		padding: 1rem;
	}

	/* Only the alignment lives here; spacing comes from the theme. */
	.it-section__header {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	/* The older eras have no section rules, so the heading block needs its own
	   breathing room inside the panel. */
	.legacy-panel .it-section__header {
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.it-module {
		width: 100%;
		box-sizing: border-box;
	}

	/* Centred and capped, so the panel neither stretches across a wide screen
	   nor shrink-wraps the board and starves the keyboard of width. */
	.it-module--minimal {
		max-width: 34rem;
		margin-inline: auto;
		padding: clamp(1rem, 3vw, 2rem);
	}

	.it-module--legacy {
		padding: 1rem 0;
	}

	.it-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 14rem;
		text-align: center;
	}

	@media (max-width: 768px) {
		/* Clear the fixed mobile action bar. */
		.it-page-content {
			padding-bottom: 5.5rem;
		}

		/* The three buttons already name the eras; the label would push the
		   switch past the edge on a narrow phone. */
		.it-era-bar__label {
			display: none;
		}

		.it-era-bar {
			min-height: 3.5rem;
		}
	}
</style>
