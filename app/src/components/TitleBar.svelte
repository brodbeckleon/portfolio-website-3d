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
	style:z-index={era === 'glassmorphism' ? 1000 : 'auto'}
	style:position={era === 'glassmorphism' ? 'fixed' : 'relative'}
>
	{#if !isMobile}
		<div class="title-bar_left">
			<Socials {era} {isMobile} />
		</div>
		<h1
			class="main_title"
			class:glassmorphism-container={era === 'glassmorphism'}
            class:earlyweb-container={era === 'early_web'}
			aria-label={m.return_to_homepage()}
			onclick={() => returnToHomepage()}
		>
			{m.leon_shinichi()}
		</h1>
		<div class="title-bar_right">
			<LanguageDropDown {era} {isMobile} />
		</div>
	{:else}
		<div
			class="mobile-header"
			class:glassmorphism-container={era === 'glassmorphism'}
			class:modern-minimal-container={era === 'modern_minimal'}
			class:frutiger-aero-container={era === 'frutiger_aero'}
			class:frutiger-aero--sunset={era === 'frutiger_aero'}
			class:earlyweb-container={era === 'early_web'}
		>
			<h1
				class="mobile-header-title"
				class:glassmorphism-font={era === 'glassmorphism'}
				class:modern-minimal-font={era === 'modern_minimal'}
				class:frutiger-aero-font={era === 'frutiger_aero'}
				class:earlyweb-font={era === 'early_web'}
				aria-label={m.return_to_homepage()}
				onclick={() => returnToHomepage()}
			>
				{m.leon_shinichi()}
			</h1>
		</div>
		<div class="mobile-footer" style:z-index="1000">
			<Socials {era} {isMobile} />
			<LanguageDropDown {era} {isMobile} />
		</div>
	{/if}
</div>

<style lang="css">
	.title-bar {
		display: flex;
		align-items: center;
		margin: 2rem 0;
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
		display: flex;
		align-items: center;
		justify-content: center;
		height: 48px;
		width: fit-content;
		padding: 0 24px;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		cursor: pointer;
	}

	/** mobile **/
	@media (max-width: 768px) {
		.title-bar {
			position: fixed;
			display: block;
			margin: 0;
		}

		.mobile-header {
			width: auto;
			height: fit-content;
			margin: 1rem 1rem;
		}

		.mobile-header-title {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 48px;
			margin: 0;
			text-align: center;
		}

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
