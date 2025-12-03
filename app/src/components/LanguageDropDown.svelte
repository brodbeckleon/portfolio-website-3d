<script lang="ts">
	import { ChevronDown, Earth } from '@lucide/svelte';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import type { WebEras } from '$lib/Types.ts';
	import { fade } from 'svelte/transition';

	interface LanguageDropDownProps {
		era: WebEras;
	}

	let { era }: LanguageDropDownProps = $props();

	let showLangDropdown = $state(false);

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

	let current = getLocale();
</script>

<div
	class="language-dropdown"
	class:glassmorphism={era === 'glassmorphism'}
	class:early-web={era === 'early_web'}
	class:frutiger-aero={era === 'frutiger_aero'}
	class:modern-minimal={era === 'modern_minimal'}
>
	<button class="dropdown-btn" onclick={toggleDropdown}>
		<Earth class="icon" strokeWidth={2} />
		<span class="lang-label">{availableLocaleNames[current]}</span>
		<ChevronDown class={showLangDropdown ? 'chevron rotated' : 'chevron'} />
	</button>

	{#if showLangDropdown}
		<div class="language-dropdown-menu" transition:fade={{ duration: 80 }}>
			{#each availableLocales as lang (lang)}
				<button class="dropdown-item" onclick={() => changeLanguage(lang)}>
					{availableLocaleNames[lang]}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="css">
	.language-dropdown {
		position: relative;
		flex-shrink: 0;
		display: inline-block;
	}

	.dropdown-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		background: none;
		border: 1px solid var(--text-muted);
		border-radius: 6px;
		color: var(--text);
		cursor: pointer;
		line-height: 1;
		white-space: nowrap;
		transition:
			background-color 0.2s,
			transform 0.2s;
		width: max-content;
		min-width: 100px;
		justify-content: space-between;
	}

	.dropdown-btn:hover {
		background-color: var(--bg-secondary);
		transform: scale(1.03);
	}

	.language-dropdown-menu {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		background: var(--bg-secondary);
		border: 1px solid var(--text-muted);
		border-radius: 6px;
		padding: 5px 0;
		z-index: 200;
		width: 100%;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
	}

	.dropdown-item {
		background: none;
		border: none;
		display: block;
		text-align: left;
		width: 100%;

		padding: 6px 12px;
		cursor: pointer;
		color: var(--text);
		white-space: nowrap;
	}

	.dropdown-item:hover {
		background-color: var(--accent);
		color: var(--bg);
	}

	:global(.icon) {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	:global(.chevron) {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.chevron.rotated) {
		transform: rotate(180deg);
	}

	/* Glassmorphism Styling */
	.language-dropdown.glassmorphism .dropdown-btn {
		width: fit-content;
		align-content: center;
		height: 3rem;
		padding: 0 1rem;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 9999px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(200, 200, 200, 0.5),
			inset 0 -1px 0 rgba(200, 200, 200, 0.1),
			inset 0 0 5px 2px rgba(200, 200, 200, 0.5);
		overflow: hidden !important;
	}

	.language-dropdown.glassmorphism .dropdown-btn:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.03);
	}

	.language-dropdown.glassmorphism .language-dropdown-menu {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(200, 200, 200, 0.5),
			inset 0 -1px 0 rgba(200, 200, 200, 0.1),
			inset 0 0 5px 2px rgba(200, 200, 200, 0.5);
		overflow: hidden !important;
	}

	.language-dropdown.glassmorphism .dropdown-item {
		color: white;
	}

	.language-dropdown.glassmorphism .dropdown-item:hover {
		background: rgba(255, 255, 255, 0.3);
		color: white;
		border-radius: 9999px;
	}
</style>
