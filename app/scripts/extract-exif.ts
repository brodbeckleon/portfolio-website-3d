/**
 * Reads capture data out of every photo in src/lib/assets/photos and writes
 * src/lib/photos/exif.generated.json, keyed by file name (= photo id).
 *
 * Run by hand after adding photos (`npm run photos`) and commit the output:
 * the build only reads the JSON, so it never depends on this script.
 *
 * Shipped images carry no metadata at all (sharp drops it when
 * enhanced-img re-encodes them), but the originals live in a public repo,
 * so the script refuses any file that still has GPS data in it.
 */
import exifr from 'exifr';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const PHOTO_DIR = 'src/lib/assets/photos';
const OUTPUT = 'src/lib/photos/exif.generated.json';

// Camera bodies report terse model codes; this is what the edge print shows.
const CAMERA_NAMES: Record<string, string> = {
	'Canon EOS R6m2': 'EOS R6 II'
};

type Exif = {
	camera: string;
	lens: string | null;
	focalLength: number;
	fNumber: number;
	exposureTime: number;
	iso: number;
	takenAt: string;
};

/** "2024:12:30 16:03:51" + "+09:00" -> "2024-12-30T16:03:51+09:00" */
function toIsoWithOffset(dateTime: string, offset: string | undefined): string {
	const [date, time] = dateTime.split(' ');
	return `${date.replaceAll(':', '-')}T${time}${offset ?? ''}`;
}

const files = (await readdir(PHOTO_DIR)).filter((file) => /\.jpe?g$/i.test(file)).sort();
const result: Record<string, Exif> = {};

for (const file of files) {
	// A buffer, not a path: exifr's chunked file reader trips over the
	// FileHandle API in current Node releases.
	const tags = await exifr.parse(await readFile(join(PHOTO_DIR, file)), {
		tiff: true,
		exif: true,
		gps: true,
		reviveValues: false,
		translateValues: false
	});

	if (!tags) throw new Error(`${file}: no EXIF data`);
	if (tags.GPSLatitude !== undefined || tags.GPSLongitude !== undefined) {
		throw new Error(`${file}: contains GPS coordinates; strip them before committing`);
	}

	const model = String(tags.Model).trim();
	result[basename(file, extname(file))] = {
		camera: CAMERA_NAMES[model] ?? model,
		// Fixed-lens bodies (X100VI) do not write a lens model.
		lens: tags.LensModel ? String(tags.LensModel).trim() : null,
		focalLength: tags.FocalLength,
		fNumber: tags.FNumber,
		exposureTime: tags.ExposureTime,
		iso: tags.ISO,
		takenAt: toIsoWithOffset(tags.DateTimeOriginal, tags.OffsetTimeOriginal)
	};
}

await writeFile(OUTPUT, JSON.stringify(result, null, '\t') + '\n');
console.log(`Wrote ${files.length} entries to ${OUTPUT}`);
