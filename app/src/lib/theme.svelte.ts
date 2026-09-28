import { browser } from '$app/environment';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const themeCycle: ThemePreference[] = ['system', 'light', 'dark'];

let preference = $state<ThemePreference>('system');
let systemPrefersDark = $state(false);
let initialised = false;

function readStoredPreference(): ThemePreference {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === 'light' || stored === 'dark' ? stored : 'system';
	} catch {
		// Storage can be unavailable (private mode); fall back to the system.
		return 'system';
	}
}

function writeStoredPreference(next: ThemePreference) {
	try {
		if (next === 'system') {
			localStorage.removeItem(STORAGE_KEY);
		} else {
			localStorage.setItem(STORAGE_KEY, next);
		}
	} catch {
		// The choice simply does not survive a reload.
	}
}

function applyToDocument(next: ThemePreference) {
	if (next === 'system') {
		delete document.documentElement.dataset.theme;
	} else {
		document.documentElement.dataset.theme = next;
	}
}

/**
 * Single source of truth for the colour scheme: CSS reads it through
 * `data-theme`, the Three.js scene reads `theme.resolved` directly.
 */
export const theme = {
	get preference(): ThemePreference {
		return preference;
	},
	get resolved(): ResolvedTheme {
		if (preference === 'system') {
			return systemPrefersDark ? 'dark' : 'light';
		}
		return preference;
	},
	get isDark(): boolean {
		return this.resolved === 'dark';
	}
};

/** Idempotent; safe to call from every component that needs the theme. */
export function initTheme() {
	if (!browser || initialised) return;
	initialised = true;

	preference = readStoredPreference();
	// app.html already stamped this before first paint; re-applying costs
	// nothing and keeps the attribute in step if storage changed elsewhere.
	applyToDocument(preference);

	const mediaQuery = window.matchMedia(MEDIA_QUERY);
	systemPrefersDark = mediaQuery.matches;
	// Lives as long as the page, so there is nothing to tear down.
	mediaQuery.addEventListener('change', (event) => {
		systemPrefersDark = event.matches;
	});
}

export function setThemePreference(next: ThemePreference) {
	preference = next;
	applyToDocument(next);
	writeStoredPreference(next);
}

export function cycleTheme() {
	const index = themeCycle.indexOf(preference);
	setThemePreference(themeCycle[(index + 1) % themeCycle.length]);
}
