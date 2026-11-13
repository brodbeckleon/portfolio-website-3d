/**
 * Rebuilds every raster icon in static/ from static/favicon.svg, the one
 * source: favicon.ico for browsers and crawlers that only ask for that,
 * apple-touch-icon.png for iOS home screens, and the two sizes the web
 * manifest lists.
 *
 * sharp is not an app dependency, so install it ad hoc first:
 *   npm i --no-save sharp@0.35.5
 *   node scripts/generate-favicons.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (name) => path.join(root, 'static', name);

const rounded = readFileSync(at('favicon.svg'), 'utf8');
// iOS and Android cut their own shape out of the icon, and anything
// transparent turns black on an iOS home screen, so those get the tile
// without its rounded corners.
const square = rounded.replace(/ rx="[^"]*"/, '');
if (square === rounded) throw new Error('favicon.svg: no rx on the tile to square off');

const VIEWBOX = 64;
// Rasterised at the target size rather than scaled up from 64px.
const png = (svg, size) =>
	sharp(Buffer.from(svg), { density: (72 * size) / VIEWBOX })
		.resize(size, size)
		.png({ compressionLevel: 9 })
		.toBuffer();

/** An .ico is a small directory followed by the images; PNG entries are valid. */
function ico(images) {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2); // type: icon
	header.writeUInt16LE(images.length, 4);

	let offset = header.length + 16 * images.length;
	const entries = images.map(({ size, data }) => {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(size, 0); // width
		entry.writeUInt8(size, 1); // height
		entry.writeUInt16LE(1, 4); // colour planes
		entry.writeUInt16LE(32, 6); // bits per pixel
		entry.writeUInt32LE(data.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += data.length;
		return entry;
	});

	return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

const icoSizes = [16, 32, 48];
writeFileSync(
	at('favicon.ico'),
	ico(await Promise.all(icoSizes.map(async (size) => ({ size, data: await png(rounded, size) }))))
);

const squares = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
for (const [name, size] of Object.entries(squares)) {
	// Fully opaque already; without the alpha channel iOS has nothing to blacken.
	writeFileSync(
		at(name),
		await sharp(await png(square, size))
			.removeAlpha()
			.png()
			.toBuffer()
	);
}

console.log('icons written to static');
