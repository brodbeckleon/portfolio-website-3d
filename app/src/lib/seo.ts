/**
 * Search engines only ever see the site in the base language: the locale
 * lives in a cookie, and crawlers come without one. So every URL has one
 * canonical form, and the absolute links in the head, the sitemap and the
 * structured data are all built from this origin. Change it here once the
 * site moves to its own domain.
 */
export const SITE_URL = 'https://brodbeck-leon-shinichi.vercel.app';

/** The name people search for. The wordmark on the page only shows the first names. */
export const PERSON_NAME = 'Léon Brodbeck';

/** Profiles that are the same person, so Google can tie them to this site. */
export const PROFILES = [
	'https://www.github.com/brodbeckleon',
	'https://www.instagram.com/leon.brodbeck/',
	'https://www.youtube.com/@leon.brodbeck',
	'https://www.linkedin.com/in/léon-shin-ichi-brodbeck-b71786240/'
];

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_URL).href;
}

/** schema.org Person for the homepage, the page a name search should land on. */
export function personJsonLd(description: string): string {
	const data = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: PERSON_NAME,
		alternateName: ['Leon Brodbeck', "Léon Shin'ichi Brodbeck", "Léon Shin'ichi"],
		givenName: 'Léon',
		familyName: 'Brodbeck',
		url: absoluteUrl('/'),
		image: absoluteUrl('/og-image.jpg'),
		description,
		jobTitle: 'Full-Stack Developer',
		knowsAbout: ['Software development', 'Web development', 'Photography'],
		address: {
			'@type': 'PostalAddress',
			addressLocality: 'Zurich',
			addressCountry: 'CH'
		},
		sameAs: PROFILES
	};
	// A "</script>" inside a string would close the tag early.
	return JSON.stringify(data).replace(/</g, '\\u003c');
}
