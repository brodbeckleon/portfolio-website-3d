import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';

/**
 * Shippori Mincho's stylesheet declares 122 @font-face rules, one per
 * slice of the whole Japanese character set: 110 kB of unicode-range lists
 * in the photography page's render-blocking CSS, for a face that only ever
 * sets the kanji watermarks and the Japanese titles. Every one of those
 * strings is in the message files or in the photography components, so only
 * the slices that cover one of their characters are kept; the browser never
 * fetches a slice nothing on the page uses anyway.
 *
 * The woff fallbacks go too: every browser that runs this site reads woff2,
 * and Vite inlined the smallest woff files into the CSS as base64.
 */
function trimShipporiMincho(): Plugin {
	const sources = [
		...readdirSync('messages').map((file) => `messages/${file}`),
		...readdirSync('src/components/photography').map((file) => `src/components/photography/${file}`)
	];

	return {
		name: 'trim-shippori-mincho',
		enforce: 'pre',
		transform(code, id) {
			if (!/@fontsource\/shippori-mincho\/.*\.css$/.test(id)) return;

			const used = new Set<number>();
			for (const file of sources) {
				this.addWatchFile(file);
				for (const char of readFileSync(file, 'utf8')) used.add(char.codePointAt(0)!);
			}

			const covers = (range: string) =>
				range.split(',').some((part) => {
					const [start, end = start] = part.trim().replace('U+', '').split('-');
					const from = parseInt(start, 16);
					const to = parseInt(end, 16);
					for (const point of used) if (point >= from && point <= to) return true;
					return false;
				});

			return code
				.replace(/(?:\/\*[^*]*\*\/\s*)?@font-face\s*{[^}]*}\s*/g, (face) => {
					const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1];
					return !range || covers(range) ? face : '';
				})
				.replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, '');
		}
	};
}

export default defineConfig({
	server: {
		fs: {
			allow: [searchForWorkspaceRoot(process.cwd()), '/models']
		}
	},
	plugins: [
		trimShipporiMincho(),
		// Must come before sveltekit() so it can rewrite <enhanced:img> first.
		enhancedImages(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	]
});
