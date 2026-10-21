import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';

// The homepage only asks for its models once the scene mounts, after the big
// route chunk has loaded and hydrated. Hinting them on the page response lets
// the browser start on them right away. The loader fetches in cors mode with
// same-origin credentials, which is what crossorigin=anonymous matches, so the
// preloaded responses are the ones it gets.
//
// Imported dynamically on purpose: SvelteKit copies every asset that server
// code imports statically into the serverless function, and the hook only
// needs the URLs, not 2 MB of models.
const modelPreloads = import('$lib/sceneModels.ts').then(({ MODEL_URLS }) =>
	Object.values(MODEL_URLS).map((url) => `<${url}>; rel=preload; as=fetch; crossorigin=anonymous`)
);

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, async ({ request, locale }) => {
		event.request = request;

		// Inter is the modern-minimal body font, which /it and /photography open
		// in. SvelteKit only preloads js and css by default, so the font would
		// otherwise be found only once the stylesheet has applied. The homepage
		// and the error page never use it, and the other subsets still load
		// through unicode-range when a page needs them.
		const preloadInter = event.route.id !== null && event.route.id !== '/';
		// Bodoni sets the photography hero title, the largest text on the page
		// and its first big paint; found late, the title swaps face after it.
		const preloadBodoni = event.route.id?.startsWith('/photography') ?? false;

		const response = await resolve(event, {
			// The locale code 'jp' is a country, not a language: browsers only
			// apply Japanese fonts and line breaking for the BCP 47 tag 'ja'.
			transformPageChunk: ({ html }) =>
				html.replace('%paraglide.lang%', locale === 'jp' ? 'ja' : locale),
			preload: ({ type, path }) =>
				type === 'js' ||
				type === 'css' ||
				(type === 'font' &&
					((preloadInter && path.includes('inter-latin-wght-normal')) ||
						(preloadBodoni && path.includes('bodoni-moda-latin-opsz-normal'))))
		});

		// Only on the server-rendered page itself: client-side visits to '/' never
		// see this header, so the models are not fetched again when the model
		// cache already holds them.
		if (event.route.id === '/' && !event.isDataRequest) {
			for (const link of await modelPreloads) response.headers.append('link', link);
		}

		return response;
	});

export const handle: Handle = handleParaglide;
