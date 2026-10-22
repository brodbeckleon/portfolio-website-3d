/**
 * Rebuilds the Frutiger Aero images in src/lib/assets/frutiger, and the
 * homepage's polaroid texture, from their originals. The photography page's photos are not handled here:
 * @sveltejs/enhanced-img encodes those at build time.
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

// --- Homepage polaroids (originals in assets-src/images) ---
// They lie on the desk, seen at a slant and never much more than 300 CSS px
// tall, so 768 px wide holds up on HiDPI screens even zoomed in. The
// transparent rim is what the scene's alpha test cuts each outline from.
// A new one also needs its import in src/lib/sceneModels.ts and an entry in
// POLAROIDS in ThreePortfolio.svelte.
const polaroids = ['polaroid'];
for (const name of polaroids) {
	await sharp(at(`assets-src/images/${name}.png`))
		.resize({ width: 768 })
		.webp({ quality: 85, alphaQuality: 90, effort: 6 })
		.toFile(at(`src/lib/assets/${name}.webp`));
}

console.log('images written to src/lib/assets/frutiger and src/lib/assets');
