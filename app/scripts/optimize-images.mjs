/**
 * Rebuilds the shipped images in src/lib/assets from their originals.
 *
 * sharp is not an app dependency, so install it ad hoc first:
 *   npm i --no-save sharp@0.35.5
 *   node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => path.join(root, ...parts);

// --- Frutiger Aero (originals in assets-src/images/frutiger) ---
const frutigerSource = (name) => at('assets-src/images/frutiger', name);
const frutigerTarget = (name) => at('src/lib/assets/frutiger', name);

// AVIFs are 4:2:0 throughout: that is the Main profile, which every AVIF
// decoder handles (4:4:4 needs High, which not every Safari or hardware
// decoder is known to), and side by side with 4:4:4 even the wallpaper's faint
// wire lines look the same while the files come out smaller. The JPEG is only
// the fallback for engines without image-set() type().
const wallpaper = frutigerSource('windows_vista_50.jpg');
await sharp(wallpaper)
	.avif({ quality: 70, chromaSubsampling: '4:2:0', effort: 9 })
	.toFile(frutigerTarget('windows_vista_50.avif'));
await sharp(wallpaper)
	.jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' })
	.toFile(frutigerTarget('windows_vista_50.jpg'));

// Icons at 3x their CSS size (36px tall, Share 48px wide). sharp resizes in
// premultiplied alpha, so the soft halos keep their colour. YouTube is not
// square: 120px keeps its 469:531 ratio, where 108px would lay it out a
// fraction of a pixel narrower than the original.
const icons = {
	GitHub: { height: 108 },
	Instagram: { height: 108 },
	Youtube: { height: 120 },
	Linkedin: { height: 108 },
	Earth: { height: 108 },
	Share: { width: 144 }
};
for (const [name, resize] of Object.entries(icons)) {
	await sharp(frutigerSource(`${name}.png`))
		.resize(resize)
		.webp({ nearLossless: true, quality: 60, effort: 6 })
		.toFile(frutigerTarget(`${name}.webp`));
}

// --- Photography (the JPEGs in src/lib/assets/photography are the originals) ---
// The sRGB profile is kept so the AVIF is colour-managed exactly like the JPEG;
// the camera metadata goes. Below quality 80 the film grain of the night shot
// starts to smooth out.
for (const name of [
	'Daikoku-Toyota-Chaser',
	'MoriArtMuseum-TokyoTower',
	'Ueteliberg-Kindergarten'
]) {
	await sharp(at('src/lib/assets/photography', `${name}.jpg`))
		.keepIccProfile()
		.avif({ quality: 80, chromaSubsampling: '4:2:0', effort: 9 })
		.toFile(at('src/lib/assets/photography', `${name}.avif`));
}

console.log('images written to src/lib/assets');
