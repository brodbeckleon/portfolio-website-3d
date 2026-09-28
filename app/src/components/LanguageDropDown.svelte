<script lang="ts">
	import { Check, ChevronDown, Earth, ChevronUp } from '@lucide/svelte';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import type { WebEras } from '$lib/Types.ts';
	import { fade } from 'svelte/transition';

	interface LanguageDropDownProps {
		era: WebEras;
		isMobile: boolean;
	}

	let { era, isMobile }: LanguageDropDownProps = $props();

	// Early web predates icon UI: that era gets plain text labels only.
	let showIcons = $derived(era !== 'early_web');
	let isMinimal = $derived(era === 'modern_minimal');
	// Smaller glyphs sit better next to 14px chrome type.
	let iconSize = $derived(isMinimal ? 20 : 24);

	let showLangDropdown = $state(false);
	let buttonWidth = $state(0);

	const frutigerAeroEarthIconPath: string = '/frutiger-aero-icons/Earth.png';

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
		class:is-minimal={isMinimal}
		class:glassmorphism-button={era === 'glassmorphism'}
		class:earlyweb-button={era === 'early_web'}
		class:frutiger-aero-dropdown-menu-button={era === 'frutiger_aero'}
		class:modern-minimal-dropdown-button={era === 'modern_minimal'}
		onclick={toggleDropdown}
		aria-haspopup="listbox"
		aria-expanded={showLangDropdown}
		bind:clientWidth={buttonWidth}
	>
		{#if era === 'frutiger_aero'}
			<img src={frutigerAeroEarthIconPath} alt="Earth" class="frutiger-aero-icon" />
		{:else if showIcons}
			<Earth size={iconSize} strokeWidth={isMinimal ? 1.75 : 1} />
		{/if}
		{#if !isMobile || !showIcons}
			<span class="lang-label">{availableLocaleNames[current]}</span>
		{/if}
		{#if showIcons}
			<div class={showLangDropdown ? 'chevron rotated' : 'chevron'}>
				{#if !isMobile}
					<ChevronDown size={isMinimal ? 16 : 24} strokeWidth={isMinimal ? 1.75 : 1} />
				{:else}
					<ChevronUp size={isMinimal ? 16 : 24} strokeWidth={isMinimal ? 1.75 : 1} />
				{/if}
			</div>
		{/if}
	</button>

	{#if showLangDropdown}
		<div
			class="language-dropdown-menu"
			style:min-width="{buttonWidth}px"
			class:glassmorphism-dropdown-menu={era === 'glassmorphism'}
			class:earlyweb-dropdown-menu={era === 'early_web'}
			class:frutiger-aero-dropdown-menu={era === 'frutiger_aero'}
			class:modern-minimal-dropdown-menu={era === 'modern_minimal'}
			transition:fade={{ duration: 80 }}
		>
			{#each availableLocales as lang (lang)}
				<button
					class="dropdown-item {current === lang ? 'active' : ''}"
					class:glassmorphism-dropdown-item={era === 'glassmorphism'}
					class:earlyweb-dropdown-item={era === 'early_web'}
					class:frutiger-aero-dropdown-item={era === 'frutiger_aero'}
					class:modern-minimal-dropdown-item={isMinimal}
					onclick={() => changeLanguage(lang)}
				>
					<span>{availableLocaleNames[lang]}</span>
					{#if isMinimal}
						<!-- Always rendered so picking a language does not shift the labels. -->
						<span class="dropdown-check" class:is-current={current === lang} aria-hidden="true">
							<Check size={16} strokeWidth={2} />
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="css">
	.language-dropdown {
		position: relative;
		width: fit-content;
	}

	.dropdown-btn.is-minimal {
		height: 40px;
		padding: 0 10px;
		gap: 6px;
	}

	.dropdown-check {
		display: inline-flex;
		margin-left: auto;
		color: var(--mm-accent);
		opacity: 0;
	}

	.dropdown-check.is-current {
		opacity: 1;
	}

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

	/* right:0 against the positioned wrapper keeps the menu under the button
	   instead of pinning it to whichever ancestor happened to be positioned. */
	.language-dropdown-menu {
		top: calc(100% + 6px);
		bottom: auto;
		right: 0;
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
			bottom: calc(100% + 6px);
			right: 0;
			z-index: 10;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}
	}
</style>
