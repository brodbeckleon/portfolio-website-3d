import { PHOTOS } from '$lib/photos';
import { absoluteUrl } from '$lib/seo';

// Built once at build time: the list only changes with a deploy.
export const prerender = true;

export function GET() {
	const paths = ['/', '/it', '/photography', ...PHOTOS.map((photo) => `/photography/${photo.id}`)];
	const urls = paths.map((path) => `\t<url><loc>${absoluteUrl(path)}</loc></url>`).join('\n');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
		{ headers: { 'content-type': 'application/xml' } }
	);
}
