import type { Picture } from 'vite-imagetools';
import exif from './exif.generated.json';
import { PHOTO_ENTRIES, SERIES, type PhotoEntry, type SeriesId } from './photos';

export { SERIES, type SeriesId };

/** Capture data per photo, as written by scripts/extract-exif.ts. */
export type Exif = {
	camera: string;
	/** null on fixed-lens bodies. */
	lens: string | null;
	focalLength: number;
	fNumber: number;
	exposureTime: number;
	iso: number;
	takenAt: string;
};

export type Photo = PhotoEntry & {
	exif: Exif;
	/** Responsive AVIF/WebP sources and intrinsic size, for <enhanced:img>. */
	image: Picture;
	takenAt: string;
	/** 1-based position within its series, as printed on the film edge. */
	frame: number;
};

// Dynamic <enhanced:img> sources cannot derive widths from `sizes`, so the
// srcset is fixed here: thumbnails on the contact sheet, up to full size in
// the loupe. imagetools never upscales, so smaller originals just stop early.
const images = import.meta.glob<Picture>('../assets/photos/*.jpg', {
	eager: true,
	query: { enhanced: true, w: '1600;1080;720;400' },
	import: 'default'
});

function imageFor(id: string): Picture {
	const image = images[`../assets/photos/${id}.jpg`];
	if (!image) throw new Error(`photos: no image file for "${id}"`);
	return image;
}

function exifFor(id: string): Exif {
	const data = (exif as Record<string, Exif>)[id];
	if (!data) throw new Error(`photos: no EXIF for "${id}"; run \`npm run photos\``);
	return data;
}

/** Every photo in display order: grouped by series, then as listed. */
export const PHOTOS: Photo[] = SERIES.flatMap(({ id: series }) =>
	PHOTO_ENTRIES.filter((entry) => entry.series === series).map((entry, index) => {
		const data = exifFor(entry.id);
		return {
			...entry,
			exif: data,
			image: imageFor(entry.id),
			takenAt: entry.takenAtOverride ?? data.takenAt,
			frame: index + 1
		};
	})
);

export function getPhoto(id: string): Photo | undefined {
	return PHOTOS.find((photo) => photo.id === id);
}
