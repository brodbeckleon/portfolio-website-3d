import type { Exif } from './index';

/** 0.0058… -> "1/170", 2.5 -> "2.5s" */
export function formatShutter(seconds: number): string {
	if (seconds >= 1) return `${Number(seconds.toFixed(1))}s`;
	return `1/${Math.round(1 / seconds)}`;
}

/** 8 -> "f/8", 1.8 -> "f/1.8" */
export function formatAperture(fNumber: number): string {
	return `f/${Number(fNumber.toFixed(1))}`;
}

/**
 * Exposure value normalised to ISO 100, which is what a light meter reads:
 * a bright scene shot at f/8 1/170 ISO 500 is about EV 11.
 */
export function ev({ fNumber, exposureTime, iso }: Exif): number {
	return Math.log2((fNumber * fNumber) / exposureTime) - Math.log2(iso / 100);
}
