<script lang="ts">
	import { Monitor, Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import type { WebEras } from '$lib/Types.ts';
	import { cycleTheme, initTheme, theme } from '$lib/theme.svelte.ts';

	interface ThemeToggleProps {
		era: WebEras;
	}

	let { era }: ThemeToggleProps = $props();

	const icons = { system: Monitor, light: Sun, dark: Moon };

	let isMinimal = $derived(era === 'modern_minimal');

	let label = $derived(
		{
			system: m.theme_system(),
			light: m.theme_light(),
			dark: m.theme_dark()
		}[theme.preference]
	);

	let Icon = $derived(icons[theme.preference]);

	// The store starts as 'system' so SSR and the first client render agree; the
	// inline script in app.html has already applied the stored value to <html>,
	// so reading it on mount changes nothing visible.
	onMount(initTheme);
</script>

<button
	class="theme-toggle"
	class:is-minimal={isMinimal}
	class:glassmorphism-button={era === 'glassmorphism'}
	class:earlyweb-button={era === 'early_web'}
	class:frutiger-aero-dropdown-menu-button={era === 'frutiger_aero'}
	class:modern-minimal-dropdown-button={era === 'modern_minimal'}
	onclick={cycleTheme}
	title={m.switch_theme({ theme: label })}
	aria-label={m.switch_theme({ theme: label })}
>
	<Icon size={isMinimal ? 20 : 24} strokeWidth={isMinimal ? 1.75 : 1} />
</button>

<style lang="css">
	/* Matches the 40px social buttons on the other side of the bar. */
	.theme-toggle.is-minimal {
		height: 40px;
		width: 40px;
	}

	.theme-toggle {
		height: 48px;
		width: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		cursor: pointer;
	}
</style>
