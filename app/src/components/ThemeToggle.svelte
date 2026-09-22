<script lang="ts">
	import { Monitor, Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import type { WebEras } from '$lib/Types.ts';

	interface ThemeToggleProps {
		era: WebEras;
	}

	let { era }: ThemeToggleProps = $props();

	type ThemePreference = 'system' | 'light' | 'dark';

	const cycleOrder: ThemePreference[] = ['system', 'light', 'dark'];

	const icons = { system: Monitor, light: Sun, dark: Moon };

	// Starts as 'system' so SSR and the first client render agree; the stored
	// value is read on mount. The inline script in app.html has already applied
	// it to <html> at that point, so nothing flashes.
	let preference: ThemePreference = $state('system');

	let label = $derived(
		{
			system: m.theme_system(),
			light: m.theme_light(),
			dark: m.theme_dark()
		}[preference]
	);

	let Icon = $derived(icons[preference]);

	function readStoredPreference(): ThemePreference {
		try {
			const stored = localStorage.getItem('theme');
			return stored === 'light' || stored === 'dark' ? stored : 'system';
		} catch {
			return 'system';
		}
	}

	function apply(next: ThemePreference) {
		preference = next;

		if (next === 'system') {
			delete document.documentElement.dataset.theme;
		} else {
			document.documentElement.dataset.theme = next;
		}

		try {
			if (next === 'system') {
				localStorage.removeItem('theme');
			} else {
				localStorage.setItem('theme', next);
			}
		} catch {
			/* storage unavailable — the choice just does not survive a reload */
		}
	}

	function cycle() {
		apply(cycleOrder[(cycleOrder.indexOf(preference) + 1) % cycleOrder.length]);
	}

	onMount(() => {
		preference = readStoredPreference();
	});
</script>

<button
	class="theme-toggle"
	class:glassmorphism-button={era === 'glassmorphism'}
	class:earlyweb-button={era === 'early_web'}
	class:frutiger-aero-dropdown-menu-button={era === 'frutiger_aero'}
	class:modern-minimal-dropdown-button={era === 'modern_minimal'}
	onclick={cycle}
	title={m.switch_theme({ theme: label })}
	aria-label={m.switch_theme({ theme: label })}
>
	<Icon strokeWidth={era === 'modern_minimal' ? 1.5 : 1} />
</button>

<style lang="css">
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
