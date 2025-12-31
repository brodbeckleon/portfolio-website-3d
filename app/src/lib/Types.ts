import { m } from '$lib/paraglide/messages';

export type WebEras = 'early_web' | 'frutiger_aero' | 'modern_minimal' | 'glassmorphism';

export const web_era_labels = {
	early_web: m.early_web(),
	frutiger_aero: m.frutiger_aero(),
	modern_minimal: m.modern_minimal(),
	glassmorphism: m.glassmorphism()
};

export const toggleable_eras: WebEras[] = ['early_web', 'frutiger_aero', 'modern_minimal'];

export type Image = {
	name: string;
	path: string;
};

export type GameStates = 'paused' | 'playing' | 'lost' | 'won' | 'start';
