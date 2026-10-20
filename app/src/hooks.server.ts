import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			// The locale code 'jp' is a country, not a language: browsers only
			// apply Japanese fonts and line breaking for the BCP 47 tag 'ja'.
			transformPageChunk: ({ html }) =>
				html.replace('%paraglide.lang%', locale === 'jp' ? 'ja' : locale)
		});
	});

export const handle: Handle = handleParaglide;
