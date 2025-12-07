<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import LanguageDropDown from './LanguageDropDown.svelte';
	import type { WebEras } from '$lib/Types.ts';
	import Socials from './Socials.svelte';
	import { goto } from '$app/navigation';

	interface TitleBarProps {
		era: WebEras;
		isMobile: boolean;
	}

	let { era, isMobile }: TitleBarProps = $props();

	function returnToHomepage() {
		goto('/');
	}
</script>

<div
	class="title-bar"
	class:glassmorphism={era === 'glassmorphism'}
	class:early-web={era === 'early_web'}
	class:frutiger-aero={era === 'frutiger_aero'}
	class:modern-minimal={era === 'modern_minimal'}
>
	{#if !isMobile}
		<div class="title-bar_left">
			<Socials {era} {isMobile} />
		</div>
		<h1
			class="main_title"
			class:glassmorphism-container={era === 'glassmorphism'}
			class:glassmorphism-font={era === 'glassmorphism'}
			aria-label={m.return_to_homepage()}
			onclick={() => returnToHomepage()}
		>
			{m.leon_shinichi()}
		</h1>
		<div class="title-bar_right">
			<LanguageDropDown {era} />
		</div>
	{:else}
		<h1
			class="main_title"
			class:glassmorphism-container={era === 'glassmorphism'}
			class:glassmorphism-font={era === 'glassmorphism'}
			aria-label={m.return_to_homepage()}
			onclick={() => returnToHomepage()}
		>
			{m.leon_shinichi()}
		</h1>
		<div class="mobile-footer">
			<Socials {era} {isMobile} />
			<LanguageDropDown {era} />
		</div>
	{/if}
</div>

<style lang="css">
	.title-bar {
		display: flex;
		align-items: center;
		position: fixed;
		margin: 3rem auto;
		z-index: 1000;
		width: 100%;
		color: white;
	}

	.title-bar_left {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		margin-left: 1rem;
	}

	.title-bar_right {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-right: 1rem;
	}

	.main_title {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		cursor: pointer;
	}

	/** mobile **/
	@media (max-width: 768px) {
		.mobile-footer {
			position: fixed;
			bottom: 1rem;
			left: 1rem;
			right: 1rem;
			display: flex;
			justify-content: space-between;
			align-items: center;
			z-index: 1000;
		}
	}
</style>
