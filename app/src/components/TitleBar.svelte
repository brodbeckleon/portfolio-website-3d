<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import LanguageDropDown from './LanguageDropDown.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import type { WebEras } from '$lib/Types.ts';
	import Socials from './Socials.svelte';
	import { resolve } from '$app/paths';

	interface TitleBarProps {
		era: WebEras;
		isMobile: boolean;
		/** Flush against the top with a fixed height, so content routes keep the
		 * same header geometry no matter which era is active. */
		compact?: boolean;
	}

	let { era, isMobile, compact = false }: TitleBarProps = $props();

	let isModernMinimal = $derived(era === 'modern_minimal');

	// Only these eras read data-theme, so only they get a light/dark switch.
	let hasThemeToggle = $derived(era === 'modern_minimal' || era === 'glassmorphism');
</script>

<div
	class="title-bar"
	class:compact
	class:modern-minimal-topbar={isModernMinimal}
	style:z-index={era === 'glassmorphism' ? 1000 : 'auto'}
	style:position={era === 'glassmorphism' ? 'fixed' : 'relative'}
>
	{#if !isMobile}
		<div class="title-bar__inner" class:site-shell={compact}>
			<div class="title-bar_left" class:flush={compact}>
				<Socials {era} {isMobile} />
			</div>
			<h1
				class="main_title"
				class:glassmorphism-container={era === 'glassmorphism'}
				class:earlyweb-container={era === 'early_web'}
				class:frutiger-aero-container={era === 'frutiger_aero'}
			>
				<a
					class="title-link"
					class:modern-minimal-wordmark={isModernMinimal}
					href={resolve('/')}
					aria-label={m.return_to_homepage()}
				>
					{m.leon_shinichi()}
				</a>
			</h1>
			<div class="title-bar_right" class:flush={compact}>
				{#if hasThemeToggle}
					<ThemeToggle {era} />
				{/if}
				<LanguageDropDown {era} {isMobile} />
			</div>
		</div>
	{:else}
		<div
			class="mobile-header"
			class:flush={compact}
			class:glassmorphism-container={era === 'glassmorphism'}
			class:earlyweb-container={era === 'early_web'}
			class:frutiger-aero-container={era === 'frutiger_aero'}
			class:site-shell={compact}
		>
			<h1
				class="mobile-header-title"
				class:glassmorphism-font={era === 'glassmorphism'}
				class:earlyweb-font={era === 'early_web'}
				class:frutiger-aero-font={era === 'frutiger_aero'}
			>
				<a
					class="title-link"
					class:modern-minimal-wordmark={isModernMinimal}
					href={resolve('/')}
					aria-label={m.return_to_homepage()}
				>
					{m.leon_shinichi()}
				</a>
			</h1>
			{#if compact && hasThemeToggle}
				<div class="mobile-header-actions">
					<ThemeToggle {era} />
				</div>
			{/if}
		</div>
		<div class="mobile-footer" style:z-index="1000">
			<Socials {era} {isMobile} />
			{#if !compact && hasThemeToggle}
				<ThemeToggle {era} />
			{/if}
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

	/* One fixed header height for every era, so nothing below it shifts when
	   the era changes. */
	.title-bar.compact {
		margin: 0;
		min-height: 3.5rem;
	}

	/* Three columns keep the title optically centred without taking it out of
	   flow, so it can never overlap the controls on either side. */
	.title-bar__inner {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
	}

	.title-bar_left {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		margin-left: 1rem;
	}

	.title-bar_right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.25rem;
		margin-right: 1rem;
	}

	/* Inside the shared shell the gutters come from the shell itself. */
	.title-bar_left.flush,
	.title-bar_right.flush {
		margin-inline: 0;
	}

	.modern-minimal-topbar {
		/* The other eras sit on dark art and need white; modern minimal takes
		   its ink from the page so the wordmark is not white-on-white. */
		color: inherit;
		border-bottom: 1px solid var(--mm-border);
	}

	.modern-minimal-topbar .title-link:hover {
		color: var(--mm-accent);
	}

	.main_title {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 48px;
		width: fit-content;
		padding: 0 24px;
		font-size: 1.5rem;
		margin: 0;
	}

	/* A real link, so the wordmark is reachable by keyboard and by middle-click. */
	.title-link {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	.modern-minimal-topbar .main_title {
		padding: 0;
	}

	.mobile-header-actions {
		display: flex;
		align-items: center;
	}

	/** mobile **/
	@media (max-width: 768px) {
		.title-bar {
			display: block;
			margin: 0;
		}

		.mobile-header {
			width: auto;
			height: fit-content;
			margin: 1rem 1rem;
		}

		.mobile-header.flush {
			width: 100%;
			box-sizing: border-box;
			margin: 0;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.5rem;
			padding-block: 0.5rem;
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
			gap: 0.5rem;
			z-index: 1000;
		}
	}
</style>
