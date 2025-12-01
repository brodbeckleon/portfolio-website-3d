import { m } from '$lib/paraglide/messages';

export type WebEras = 'early_web' | 'frutiger_aero' | 'modern_minimal' | 'liquid_glass';

export const web_era_labels = {
	early_web: m.early_web(),
	frutiger_aero: m.frutiger_aero(),
	modern_minimal: m.modern_minimal(),
	liquid_glass: m.liquid_glass(),
};

export const toggleable_eras: WebEras[] = ['early_web', 'frutiger_aero', 'modern_minimal'];