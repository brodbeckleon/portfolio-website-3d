import { m } from '$lib/paraglide/messages';

/**
 * Hand-curated half of the photo data: everything a camera cannot know.
 * Capture data comes from exif.generated.json (`npm run photos`); the two are
 * joined by id, which is also the image's file name in $lib/assets/photos.
 *
 * Order matters: series appear in SERIES order, photos within a series in
 * the order listed here, and that order sets each frame number.
 */

export const SERIES = [
	{ id: 'tokyo', title: m.series_tokyo, story: m.series_tokyo_story, zone: 'Asia/Tokyo' },
	{ id: 'zurich', title: m.series_zurich, story: m.series_zurich_story, zone: 'Europe/Zurich' }
] as const;

export type SeriesId = (typeof SERIES)[number]['id'];

export type PhotoEntry = {
	id: string;
	series: SeriesId;
	/** Message functions rather than strings, so they follow the locale. */
	alt: () => string;
	story?: () => string;
	/** The frame that leads its series on the page; else the first one listed. */
	pick?: boolean;
	/** Fuji film simulation, which no EXIF parser reads reliably. */
	filmSim?: string;
	/** ISO timestamp with offset, for when the camera clock was wrong. */
	takenAtOverride?: string;
};

export const PHOTO_ENTRIES: PhotoEntry[] = [
	{
		id: 'daikoku-toyota-chaser',
		series: 'tokyo',
		alt: m.alt_daikoku_toyota_chaser,
		pick: true,
		// The R6 II was still on +10:00; Daikoku is in Yokohama (+09:00).
		takenAtOverride: '2023-08-15T22:09:26+09:00'
	},
	{
		id: 'mori-art-museum-tokyo-tower',
		series: 'tokyo',
		alt: m.alt_tokyo_tower_mori_art_museum
	},
	{
		id: 'uetliberg-kindergarten',
		series: 'zurich',
		alt: m.alt_ueteliberg_kindergarten
	}
];
