<script lang="ts">
	import Marquee from './Marquee.svelte';
	import LocalClock from './LocalClock.svelte';
	import CircleLink from './CircleLink.svelte';
	import { ink } from '$lib/ink';
	import { m } from '$lib/paraglide/messages';
	import { PHOTOS, SERIES } from '$lib/photos';

	// Read off the photos themselves, so a third body shows up here the day
	// its first frame is added, and a retired one disappears with its last.
	const cameras = [...new Set(PHOTOS.map((photo) => photo.exif.camera))].join(' · ');

	// Same rule as the rows below: a series without photos has no section to
	// jump to, so it gets no menu entry either.
	const menu = [
		...SERIES.filter((series) => PHOTOS.some((photo) => photo.series === series.id)).map(
			(series) => ({ target: `series-${series.id}`, label: series.title })
		),
		{ target: 'contact', label: m.label_contact }
	].map((item, index) => ({ ...item, number: String(index + 1).padStart(2, '0') }));

	const firstSeries = `#${menu[0].target}`;

	/**
	 * Plain anchors do the jumping: they work before hydration, SvelteKit
	 * already tracks same-page hash changes, and the browser moves the focus
	 * starting point to the target. Smoothness is switched on for this one
	 * jump only, because a page-wide scroll-behavior would also animate
	 * SvelteKit's own scroll resets when the loupe closes or a route changes.
	 */
	let endGlide: (() => void) | null = null;

	function glide(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		// A second click mid-glide starts its own; the first one's fallback
		// timer must not switch smoothness off halfway through it.
		endGlide?.();

		const root = document.documentElement;
		root.style.scrollBehavior = 'smooth';
		// Fallback for browsers without scrollend, and for a click that ends
		// up not scrolling at all (already at the target).
		const timer = window.setTimeout(() => endGlide?.(), 1600);
		const reset = () => {
			root.style.scrollBehavior = '';
			window.removeEventListener('scrollend', reset);
			clearTimeout(timer);
			endGlide = null;
		};
		endGlide = reset;
		window.addEventListener('scrollend', reset);
	}

	// Bodoni has no kanji, so in Japanese (写真) the title would fall back to
	// whatever system face the browser picks; set it in the Mincho instead.
	const title = m.photography();
	const titleIsKanji = /[\u3040-\u30ff\u3400-\u9fff]/.test(title);

	// One top-to-bottom stagger for the whole first screen, title first.
	const STEP = 80;
	const delay = (slot: number) => slot * STEP;
</script>

<section class="photo-hero site-shell" aria-labelledby="photo-hero-title">
	<Marquee text={m.photography_marquee()} />

	<div class="photo-hero__body">
		<!-- 写真, "photograph": a watermark pressed into the paper. In
		     Japanese the title already is 写真, and the same word printed twice
		     side by side reads as a duplicate rather than an echo. -->
		{#if !titleIsKanji}
			<span
				class="photo-hero__watermark"
				aria-hidden="true"
				data-ink
				{@attach ink({ delay: delay(1), spread: 120 })}>写真</span
			>
		{/if}

		<div class="photo-hero__heading">
			<h2
				id="photo-hero-title"
				class="photo-hero__title paper-ink-display"
				class:photo-hero__title--kanji={titleIsKanji}
				data-ink
				{@attach ink({ spread: 85 })}
			>
				{title}
			</h2>
			<p class="photo-hero__places" data-ink {@attach ink({ delay: delay(2), spread: 40 })}>
				{m.photography_places()}
			</p>
			<p class="photo-hero__journey" data-ink {@attach ink({ delay: delay(3), spread: 40 })}>
				{m.my_journey()}
			</p>
		</div>

		<div class="photo-hero__intro">
			<p data-ink {@attach ink({ delay: delay(4), spread: 30 })}>{m.photography_intro_1()}</p>
			<p data-ink {@attach ink({ delay: delay(5), spread: 30 })}>{m.photography_intro_2()}</p>
		</div>
	</div>

	<div class="photo-hero__meta">
		<div class="photo-hero__cell">
			<p class="paper-ink-label" data-ink {@attach ink({ delay: delay(6), spread: 30 })}>
				{m.label_local_time()}
			</p>
			<ul class="photo-hero__clocks" role="list">
				<li data-ink {@attach ink({ delay: delay(7), spread: 30 })}>
					<LocalClock zone="Europe/Zurich" city={m.series_zurich()} />
				</li>
				<li data-ink {@attach ink({ delay: delay(8), spread: 30 })}>
					<LocalClock zone="Asia/Tokyo" city={m.series_tokyo()} />
				</li>
			</ul>
		</div>

		<div class="photo-hero__cell">
			<p class="paper-ink-label" data-ink {@attach ink({ delay: delay(7), spread: 30 })}>
				{m.label_cameras()}
			</p>
			<p class="photo-hero__value" data-ink {@attach ink({ delay: delay(8), spread: 30 })}>
				{cameras}
			</p>
		</div>

		<!-- Named by aria-label, not the visible label: its brackets are CSS
		     generated content and would be read out as part of the name. -->
		<nav class="photo-hero__cell" aria-label={m.label_menu()}>
			<p class="paper-ink-label" data-ink {@attach ink({ delay: delay(8), spread: 30 })}>
				{m.label_menu()}
			</p>
			<ol class="photo-hero__menu" role="list">
				{#each menu as item, index (item.target)}
					<li data-ink {@attach ink({ delay: delay(9 + index), spread: 30 })}>
						<a class="photo-hero__menu-link" href={`#${item.target}`} onclick={glide}>
							<span class="photo-hero__menu-number" aria-hidden="true">{item.number}</span>
							<span class="photo-hero__menu-label">{item.label()}</span>
						</a>
					</li>
				{/each}
			</ol>
		</nav>

		<div
			class="photo-hero__cell photo-hero__cell--cta"
			data-ink
			{@attach ink({ delay: delay(10) })}
		>
			<CircleLink label={m.scroll_hint()} href={firstSeries} onclick={glide} />
		</div>
	</div>
</section>

<style lang="css">
	.photo-hero {
		position: relative;
		/* The watermark sits behind the text inside this context, and never
		   behind the page's paper. */
		isolation: isolate;
		display: flex;
		flex-direction: column;
		gap: var(--mm-s8);
		min-height: calc(100svh - 7rem);
		padding-top: var(--mm-s3);
		padding-bottom: var(--mm-s7);
		/* The watermark is wider than a phone; cut it at the hero's edge
		   instead of letting it widen the page. clip, not hidden, so the
		   section never becomes a scroll container. */
		overflow: clip;
	}

	.photo-hero__body {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--mm-s7);
		padding-top: clamp(0px, 3vh, var(--mm-s6));
	}

	/* On wide screens the 写真 fills the open paper to the right of the
	   intro, under the title's tail rather than through its letters: the
	   title already runs nearly the full width, so top-right would print
	   one over the other. */
	.photo-hero__watermark {
		position: absolute;
		z-index: -1;
		bottom: 0;
		right: 0;
		font-family: var(--pi-font-kanji);
		font-size: var(--pi-text-watermark);
		font-weight: 400;
		line-height: 1;
		color: var(--pi-watermark);
		white-space: nowrap;
		user-select: none;
		pointer-events: none;
	}

	/* The title is sized against this box rather than the viewport, so the
	   one long word always fits between the gutters on a phone. */
	.photo-hero__heading {
		container-type: inline-size;
	}

	.photo-hero__title {
		margin: 0;
		/* "PHOTOGRAPHY" sets about 7.3em wide; 13cqi keeps it inside the
		   column, and on wide screens the token's own cap takes over. */
		font-size: min(var(--pi-text-hero), 13cqi);
		/* The display cut's tight leading leaves the caps almost touching
		   the line box; a little air before the subtitle. */
		margin-bottom: var(--mm-s4);
	}

	/* Kanji fill the whole em box where Latin caps leave the descender
	   space empty, so the same margin set the subtitle against the title's
	   foot; a step more gives it the gap the Latin title has. */
	.photo-hero__title--kanji {
		font-family: var(--pi-font-kanji);
		letter-spacing: 0.04em;
		line-height: 1.05;
		margin-bottom: var(--mm-s6);
	}

	.photo-hero__places,
	.photo-hero__journey {
		margin: 0;
		font-size: var(--mm-text-lg);
		line-height: var(--mm-leading-snug);
	}

	.photo-hero__journey {
		color: var(--pi-ink-muted);
	}

	.photo-hero__intro {
		display: flex;
		flex-direction: column;
		gap: var(--mm-s3);
		max-width: 36ch;
		font-size: 0.9375rem;
		line-height: 1.55;
		/* Japanese (lang="ja", from the document) breaks between phrases instead of
		   mid-word, so no lone 「す。」 on the last line. Latin text is
		   unaffected. */
		word-break: auto-phrase;
		line-break: strict;
	}

	.photo-hero__intro p {
		margin: 0;
	}

	/* ---------- Bottom row ---------- */

	/* All the spare height goes above the bottom row, as on a title page:
	   the heading keeps its place under the band at any screen height. */
	.photo-hero__meta {
		margin-top: auto;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--mm-s6) var(--mm-s5);
		align-items: start;
		font-size: var(--mm-text-sm);
		line-height: 1.5;
	}

	.photo-hero__cell {
		display: flex;
		flex-direction: column;
		gap: var(--mm-s2);
		min-width: 0;
	}

	.photo-hero__cell p {
		margin: 0;
	}

	.photo-hero__cell--cta {
		align-self: center;
		justify-self: end;
	}

	.photo-hero__clocks,
	.photo-hero__menu {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.photo-hero__menu {
		gap: var(--mm-s1);
	}

	.photo-hero__menu-link {
		display: inline-flex;
		align-items: baseline;
		color: var(--pi-ink);
		text-decoration: none;
	}

	.photo-hero__menu-number {
		flex: none;
		width: 3.5rem;
		font-variant-numeric: tabular-nums;
		color: var(--pi-ink-muted);
	}

	/* Drawn underline, so it can grow in from the left like the CTA's. */
	.photo-hero__menu-label {
		background-image: linear-gradient(currentColor, currentColor);
		background-size: 0% 1px;
		background-position: 0 100%;
		background-repeat: no-repeat;
		transition: background-size 420ms var(--pi-ease-out);
	}

	.photo-hero__menu-link:hover .photo-hero__menu-label,
	.photo-hero__menu-link:focus-visible .photo-hero__menu-label {
		background-size: 100% 1px;
	}

	.photo-hero__menu-link:hover .photo-hero__menu-number {
		color: var(--pi-ink);
	}

	.photo-hero__menu-link:focus-visible {
		outline: 2px solid var(--pi-ink);
		outline-offset: 3px;
		border-radius: var(--mm-radius-sm);
	}

	/* ---------- Narrower screens ---------- */

	@media (max-width: 960px) {
		.photo-hero__meta {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.photo-hero__cell--cta {
			justify-self: start;
		}
	}

	/* Once the intro takes the full width there is no open paper beside it,
	   so the watermark moves above the title, as a heading's echo, and the
	   body leaves room for it to sit there, its foot just touching the caps. */
	@media (max-width: 720px) {
		.photo-hero__body {
			padding-top: calc(var(--pi-text-watermark) * 0.92);
		}

		.photo-hero__watermark {
			top: 0;
			bottom: auto;
		}
	}

	@media (max-width: 520px) {
		.photo-hero {
			min-height: auto;
			gap: var(--mm-s7);
		}

		.photo-hero__body {
			gap: var(--mm-s6);
		}

		.photo-hero__meta {
			gap: var(--mm-s6) var(--mm-s4);
		}
	}

	/* Every cell's content is short enough for half a phone; a single
	   column only on the narrowest screens, so the first view stays a page
	   rather than a long list. */
	@media (max-width: 359px) {
		.photo-hero__meta {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.photo-hero__menu-label {
			transition: none;
		}
	}
</style>
