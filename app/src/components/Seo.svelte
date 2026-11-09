<script lang="ts">
	import { PERSON_NAME, absoluteUrl } from '$lib/seo';

	interface SeoProps {
		title: string;
		description: string;
		/** Path of the canonical URL, without the locale or a query string. */
		path: string;
		image?: { src: string; width: number; height: number; alt: string };
	}

	const OG_IMAGE = {
		src: '/og-image.jpg',
		width: 1200,
		height: 630,
		alt: PERSON_NAME
	};

	let { title, description, path, image = OG_IMAGE }: SeoProps = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="author" content={PERSON_NAME} />
	<link rel="canonical" href={absoluteUrl(path)} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={PERSON_NAME} />
	<meta property="og:url" content={absoluteUrl(path)} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={absoluteUrl(image.src)} />
	<meta property="og:image:width" content={String(image.width)} />
	<meta property="og:image:height" content={String(image.height)} />
	<meta property="og:image:alt" content={image.alt} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
