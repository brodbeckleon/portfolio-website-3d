<script lang="ts">
	import { ChevronDown, Earth, ChevronUp } from '@lucide/svelte';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import type { WebEras } from '$lib/Types.ts';
	import { fade } from 'svelte/transition';

	interface LanguageDropDownProps {
		era: WebEras;
		isMobile: boolean;
	}

	let { era, isMobile }: LanguageDropDownProps = $props();

	let showLangDropdown = $state(false);
	let buttonWidth = $state(0);

	export const availableLocales = ['en', 'de', 'jp'] as const;
	export const availableLocaleNames = {
		en: 'English',
		de: 'Deutsch',
		jp: '日本語'
	};

	type Locale = (typeof availableLocales)[number];

	function toggleDropdown() {
		showLangDropdown = !showLangDropdown;
	}

	function changeLanguage(lang: Locale) {
		setLocale(lang);
		showLangDropdown = false;
	}

	let current = $derived(getLocale());
</script>

<div class="language-dropdown">
	<button
		class="dropdown-btn"
		class:glassmorphism-container={era === 'glassmorphism'}
		class:glassmorphism-font={era === 'glassmorphism'}
        class:earlyweb-button={era === 'early_web'}
        onclick={toggleDropdown}
		bind:clientWidth={buttonWidth}
	>
        {#if era === 'glassmorphism' || era === 'modern_minimal'}
		    <Earth strokeWidth={1} />
        {/if}
		{#if !isMobile}
			<span class="lang-label">{availableLocaleNames[current]}</span>
		{/if}
		<div class={showLangDropdown ? 'chevron rotated' : 'chevron'}>
			{#if !isMobile}
				<ChevronDown strokeWidth={1} />
			{:else}
				<ChevronUp strokeWidth={1} />
			{/if}
		</div>
	</button>

	{#if showLangDropdown}
		<div
			class="language-dropdown-menu"
			style="width: {buttonWidth}px"
			class:glassmorphism-dropdown-menu={era === 'glassmorphism'}
            class:earlyweb-button={era === 'early_web'}
            class:frutiger-aero-container={era === 'frutiger_aero'}
			transition:fade={{ duration: 80 }}
		>
			{#each availableLocales as lang (lang)}
				<button
					class="dropdown-item {current === lang ? 'active' : ''}"
                    class:glassmorphism-dropdown-item={era === 'glassmorphism'}
                    class:earlyweb-dropdown-item={era === 'early_web'}
					onclick={() => changeLanguage(lang)}
				>
					{availableLocaleNames[lang]}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="css">
	.dropdown-btn {
		position: relative;
		height: 48px;
		width: fit-content;
		padding: 0 12px;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.language-dropdown-menu {
		top: 54px;
		bottom: auto;
		right: 1rem;
		position: absolute;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
        z-index: 2;
	}

	.dropdown-item {
		height: 36px;
		width: 100%;
		border: none;
		background: none;
		cursor: pointer;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.dropdown-item.active {
		font-weight: 700;
	}

	.chevron {
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.chevron.rotated {
		transform: rotate(180deg);
	}

	/** mobile **/
	@media (max-width: 768px) {
		.language-dropdown-menu {
			position: absolute;
			top: auto;
			bottom: 54px;
			right: 0;
			z-index: 10;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			border-radius: 24px;
		}
	}
</style>
