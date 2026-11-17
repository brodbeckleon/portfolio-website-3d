import { browser } from '$app/environment';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
// Same breakpoint as the `isMobile` checks and the CSS: phones have no switch
// and always follow the system, whatever a desktop visit stored.
const MOBILE_QUERY = '(max-width: 768px)';

export const themeCycle: ThemePreference[] = ['system', 'light', 'dark'];

let preference = $state<ThemePreference>('system');
let systemPrefersDark = $state(false);
let isMobileViewport = $state(false);
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

/** What actually applies: the stored choice on desktop, the system on mobile. */
function effectivePreference(): ThemePreference {
	return isMobileViewport ? 'system' : preference;
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
		return effectivePreference();
	},
	get resolved(): ResolvedTheme {
		const current = effectivePreference();
		if (current === 'system') {
			return systemPrefersDark ? 'dark' : 'light';
		}
		return current;
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

	const mobileQuery = window.matchMedia(MOBILE_QUERY);
	isMobileViewport = mobileQuery.matches;
	// app.html already stamped this before first paint; re-applying costs
	// nothing and keeps the attribute in step if storage changed elsewhere.
	applyToDocument(effectivePreference());

	const mediaQuery = window.matchMedia(MEDIA_QUERY);
	systemPrefersDark = mediaQuery.matches;
	// Both live as long as the page, so there is nothing to tear down.
	mediaQuery.addEventListener('change', (event) => {
		systemPrefersDark = event.matches;
	});
	// Crossing the breakpoint (rotation, resizing) switches between the stored
	// choice and the system without touching what is stored.
	mobileQuery.addEventListener('change', (event) => {
		isMobileViewport = event.matches;
		applyToDocument(effectivePreference());
	});
}

export function setThemePreference(next: ThemePreference) {
	preference = next;
	applyToDocument(effectivePreference());
	writeStoredPreference(next);
}

export function cycleTheme() {
	const index = themeCycle.indexOf(preference);
	setThemePreference(themeCycle[(index + 1) % themeCycle.length]);
}
