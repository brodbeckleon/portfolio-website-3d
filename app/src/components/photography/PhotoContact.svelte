<script module lang="ts">
	// Read once per build of the module: the server and the browser only
	// disagree on the stroke of New Year, and then only for one render.
	const YEAR = new Date().getFullYear();

	// Kept in step with src/components/Socials.svelte by hand: that component
	// is built around the era icons, and this page wants only the names. The
	// handles are names, not copy, so they stay untranslated.
	const LINKS = [
		{
			name: 'Instagram',
			handle: '@leon.brodbeck',
			href: 'https://www.instagram.com/leon.brodbeck/'
		},
		{ name: 'YouTube', handle: '@leon.brodbeck', href: 'https://www.youtube.com/@leon.brodbeck' },
		{
			name: 'LinkedIn',
			handle: 'Léon Shin’ichi Brodbeck',
			href: 'https://www.linkedin.com/in/léon-shin-ichi-brodbeck-b71786240/'
		},
		{ name: 'GitHub', handle: 'brodbeckleon', href: 'https://www.github.com/brodbeckleon' }
	];
</script>

<script lang="ts">
	import CircleLink from './CircleLink.svelte';
	import { ink } from '$lib/ink';
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';

	const uid = $props.id();
	const titleId = `${uid}-contact-title`;
	const linksId = `${uid}-contact-links`;
	const titleIsKanji = /[぀-ヿ㐀-鿿]/.test(m.label_contact());

	function pad(value: number) {
		return String(value).padStart(2, '0');
	}
</script>

<section id="contact" class="photo-contact" aria-labelledby={titleId}>
	<div class="site-shell">
		<hr class="paper-ink-rule" />

		<div class="photo-contact__head" class:photo-contact__head--echo={!titleIsKanji}>
			<!-- 連絡, "contact": a faint second voice beside the title, clipped to
			     the head so it can never widen the page. In Japanese the title
			     already is 連絡先, and the echo would only repeat its first two
			     characters, so it is left out, as the hero does with 写真. -->
			{#if !titleIsKanji}
				<span class="photo-contact__watermark" aria-hidden="true">連絡</span>
			{/if}
			<h2
				id={titleId}
				class="paper-ink-display photo-contact__title"
				data-ink
				{@attach ink({ spread: 80 })}
			>
				{m.label_contact()}
			</h2>
		</div>

		<div class="photo-contact__body">
			<p class="photo-contact__text" data-ink {@attach ink({ delay: 180, spread: 40 })}>
				{m.photography_contact_body()}
			</p>

			<nav class="photo-contact__links" aria-labelledby={linksId}>
				<p id={linksId} class="paper-ink-label" data-ink {@attach ink({ delay: 200, spread: 30 })}>
					{m.socials()}
				</p>
				<ol>
					{#each LINKS as link, i (link.href)}
						<li>
							<!-- Off-site addresses: there is no route for resolve() to build. -->
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								class="photo-contact__link"
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								data-ink
								{@attach ink({ delay: 260 + i * 80, spread: 30 })}
							>
								<span class="photo-contact__index" aria-hidden="true">{pad(i + 1)}</span>
								<span class="photo-contact__name">{link.name}</span>
								<span class="photo-contact__handle">{link.handle}</span>
								<span class="photo-contact__arrow" aria-hidden="true">↗</span>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</li>
					{/each}
				</ol>
			</nav>
		</div>

		<hr class="paper-ink-rule" />

		<footer class="photo-contact__footer">
			<CircleLink label={m.back_to_desk()} href={resolve('/')} />
			<p class="photo-contact__copyright" data-ink {@attach ink({ spread: 30 })}>
				© {YEAR}
				{m.leon_shinichi()}
			</p>
		</footer>
	</div>
</section>

<style lang="css">
	.photo-contact {
		/* Clears the sticky header when the menu jumps here. */
		scroll-margin-top: var(--mm-s8);
		/* Rule first, like a series row: the row above already ends in its
		   own padding, and adding more here doubled the last gap. */
		padding-block: 0 var(--mm-s7);
	}

	.photo-contact__head {
		position: relative;
		/* clip, not hidden: no scroll container, so the ink reveal's filter
		   and the heading's focus never get trapped in here. */
		overflow: clip;
		overflow-clip-margin: 0;
		/* Its own stacking context, so the watermark's z-index stays in here. */
		isolation: isolate;
		padding-block: clamp(var(--mm-s7), 8vw, var(--mm-s9)) clamp(var(--mm-s6), 5vw, var(--mm-s8));
	}

	.photo-contact__watermark {
		position: absolute;
		inset-block-start: 50%;
		inset-inline-end: 0;
		translate: 0 -50%;
		z-index: -1;
		font-family: var(--pi-font-kanji);
		font-size: var(--pi-text-watermark);
		line-height: 1;
		color: var(--pi-watermark);
		white-space: nowrap;
		user-select: none;
		pointer-events: none;
	}

	/* Beside the title only while the two fit side by side: below about
	   1240px "CONTACT" and 連絡 together are wider than the shell and the
	   kanji ran into the last letters. There it rises above the title, as
	   the hero's 写真 does on phones, its foot just touching the caps. */
	@media (max-width: 1240px) {
		.photo-contact__head--echo {
			padding-block-start: calc(var(--pi-text-watermark) * 0.92);
		}

		.photo-contact__watermark {
			inset-block-start: 0;
			translate: none;
		}
	}

	/* The Japanese label has no Bodoni glyphs; Mincho keeps it in the same
	   high-contrast register instead of whatever serif the system picks. */
	.photo-contact__title {
		position: relative;
		margin: 0;
		font-family: var(--pi-font-display), var(--pi-font-kanji);
		font-size: clamp(3.5rem, 1rem + 11vw, 12rem);
		color: var(--pi-ink);
		overflow-wrap: anywhere;
	}

	.photo-contact__body {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		column-gap: var(--pi-gutter);
		row-gap: var(--mm-s7);
		padding-block-end: clamp(var(--mm-s8), 8vw, var(--mm-s9));
	}

	.photo-contact__text {
		grid-column: 1 / span 4;
		max-width: 30ch;
		margin: 0;
		font-size: var(--mm-text-sm);
		line-height: var(--mm-leading-relaxed);
		color: var(--pi-ink);
		text-wrap: pretty;
		/* Japanese has no spaces, so the narrow column otherwise breaks
		   mid-word ("くだ / さい"); this breaks at phrase boundaries where
		   supported and is ignored elsewhere. */
		word-break: auto-phrase;
	}

	.photo-contact__links {
		grid-column: 7 / -1;
		display: flex;
		flex-direction: column;
		gap: var(--mm-s4);
	}

	.photo-contact__links p {
		margin: 0;
	}

	.photo-contact__links ol {
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px dashed var(--pi-line);
	}

	.photo-contact__links li {
		border-bottom: 1px dashed var(--pi-line);
	}

	/* A printed index rather than buttons: number, name, handle, and the
	   arrow that says it leaves the site. */
	.photo-contact__link {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr) auto 1.5rem;
		align-items: baseline;
		column-gap: var(--mm-s4);
		min-height: 2.75rem;
		padding-block: var(--mm-s4);
		color: var(--pi-ink);
		text-decoration: none;
	}

	.photo-contact__index,
	.photo-contact__handle {
		font-size: var(--mm-text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--pi-ink-muted);
	}

	.photo-contact__name {
		font-family: var(--pi-font-display);
		font-size: var(--mm-text-2xl);
		line-height: 1.1;
		background-image: linear-gradient(currentColor, currentColor);
		background-size: 0% 1px;
		background-position: 0 100%;
		background-repeat: no-repeat;
		transition: background-size 420ms var(--pi-ease-out);
		justify-self: start;
	}

	.photo-contact__arrow {
		justify-self: end;
		font-size: var(--mm-text-sm);
		transition: translate 420ms var(--pi-ease-out);
	}

	.photo-contact__link:hover .photo-contact__name,
	.photo-contact__link:focus-visible .photo-contact__name {
		background-size: 100% 1px;
	}

	.photo-contact__link:hover .photo-contact__arrow,
	.photo-contact__link:focus-visible .photo-contact__arrow {
		translate: 3px -3px;
	}

	.photo-contact__link:focus-visible {
		outline: 2px solid var(--pi-ink);
		outline-offset: 3px;
		border-radius: var(--mm-radius-sm);
	}

	.photo-contact__footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--mm-s5);
		padding-block-start: var(--mm-s6);
	}

	.photo-contact__copyright {
		margin: 0;
		font-size: var(--mm-text-xs);
		color: var(--pi-ink-muted);
	}

	/* Tablets: the two columns would get too narrow for the names. */
	@media (max-width: 960px) {
		.photo-contact__text,
		.photo-contact__links {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 480px) {
		/* The handle crowds the name at phone width; the name alone says where
		   the link goes. */
		.photo-contact__link {
			grid-template-columns: 2rem minmax(0, 1fr) 1.5rem;
		}

		.photo-contact__handle {
			display: none;
		}

		/* The clamp's floor leaves a fifth of a phone empty beside the
		   title; here the word can run nearly edge to edge, as it does on
		   desktop. Above this the watermark needs the room beside it. */
		.photo-contact__title {
			font-size: 17vw;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.photo-contact__name,
		.photo-contact__arrow {
			transition: none;
		}
	}
</style>
