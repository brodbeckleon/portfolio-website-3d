<script lang="ts">
	import CircleLink from './CircleLink.svelte';
	import SeriesImage from './SeriesImage.svelte';
	import { ink } from '$lib/ink';
	import { m } from '$lib/paraglide/messages';
	import type { Photo, SERIES } from '$lib/photos';
	import { formatAperture, formatShutter } from '$lib/photos/exposure';

	interface SeriesRowProps {
		series: (typeof SERIES)[number];
		photos: Photo[];
		/** 0-based position on the page, printed as "01". */
		index: number;
		onOpen: (id: string) => void;
	}

	let { series, photos, index, onOpen }: SeriesRowProps = $props();

	/** Remaining frames sit in pairs under the cover. */
	const PER_ROW = 2;

	let titleId = $derived(`series-${series.id}-title`);

	// The picked frame leads; without a pick the first one listed does.
	let cover = $derived(photos.find((photo) => photo.pick) ?? photos[0]);
	let rest = $derived(photos.filter((photo) => photo.id !== cover.id));

	// Pairs whose widths follow their aspect ratios, so both frames in a pair
	// come out the same height without cropping either one.
	let restRows = $derived(
		Array.from({ length: Math.ceil(rest.length / PER_ROW) }, (_, row) =>
			rest.slice(row * PER_ROW, row * PER_ROW + PER_ROW)
		)
	);

	let years = $derived.by(() => {
		const all = photos.map((photo) => Number(photo.takenAt.slice(0, 4)));
		const first = Math.min(...all);
		const last = Math.max(...all);
		return first === last ? String(first) : `${first}–${last}`;
	});

	let cameras = $derived([...new Set(photos.map((photo) => photo.exif.camera))].join(' · '));

	function pad(value: number) {
		return String(value).padStart(2, '0');
	}

	function ratioOf(photo: Photo) {
		return photo.image.img.w / photo.image.img.h;
	}

	function exposureOf({ exif }: Photo) {
		return `${formatAperture(exif.fNumber)} · ${formatShutter(exif.exposureTime)} · ISO ${exif.iso}`;
	}

	/*
	 * sizes per slot. The media column is 6 of 12 tracks in a shell capped at
	 * 96rem: about 46vw on desktop, 720px once the shell stops growing. Below
	 * 900px it is the full shell, and below 600px the pairs stack too.
	 */
	const COVER_SIZES = '(max-width: 899px) calc(100vw - 2rem), (min-width: 1536px) 720px, 46vw';

	function thumbSizes(row: Photo[], photo: Photo) {
		// A lone frame takes half the row, the same slot it would have in a pair.
		const share =
			row.length === 1 ? 0.5 : ratioOf(photo) / row.reduce((sum, p) => sum + ratioOf(p), 0);
		const desktop = Math.ceil(46 * share);
		const tablet = Math.ceil(100 * share);
		const wide = Math.ceil(720 * share);
		return `(max-width: 599px) calc(100vw - 2rem), (max-width: 899px) ${tablet}vw, (min-width: 1536px) ${wide}px, ${desktop}vw`;
	}
</script>

{#snippet frame(photo: Photo, sizes: string, className: string, eager = false)}
	<figure class={className} style:--ratio={ratioOf(photo)}>
		<SeriesImage {photo} {sizes} {onOpen} {eager} />
		<figcaption class="series-row__caption" data-ink {@attach ink({ delay: 120, spread: 30 })}>
			<span class="series-row__caption-name">{pad(photo.frame)} — {photo.alt()}</span>
			<span class="series-row__caption-exposure">{exposureOf(photo)}</span>
		</figcaption>
	</figure>
{/snippet}

<section id="series-{series.id}" class="series-row site-shell" aria-labelledby={titleId}>
	<hr class="paper-ink-rule" />

	<div class="series-row__grid">
		<div class="series-row__text">
			<p class="series-row__index" data-ink {@attach ink({ spread: 30 })}>
				{pad(index + 1)}
			</p>

			<h2
				id={titleId}
				class="series-row__title paper-ink-display"
				data-ink
				{@attach ink({ delay: 80, spread: 80 })}
			>
				{series.title()}
			</h2>

			<p class="series-row__story" data-ink {@attach ink({ delay: 180, spread: 40 })}>
				{series.story()}
			</p>

			<dl class="series-row__meta">
				<div data-ink {@attach ink({ delay: 260, spread: 30 })}>
					<dt class="paper-ink-label">{m.label_year()}</dt>
					<dd>{years}</dd>
				</div>
				<div data-ink {@attach ink({ delay: 330, spread: 30 })}>
					<dt class="paper-ink-label">{m.label_cameras()}</dt>
					<dd>{cameras}</dd>
				</div>
				<div data-ink {@attach ink({ delay: 400, spread: 30 })}>
					<dt class="paper-ink-label">{m.label_frames()}</dt>
					<dd>{pad(photos.length)}</dd>
				</div>
			</dl>

			<div class="series-row__cta" data-ink {@attach ink({ delay: 480, spread: 30 })}>
				<CircleLink label={m.view_series()} onclick={() => onOpen(cover.id)} />
			</div>
		</div>

		<div class="series-row__media">
			{@render frame(cover, COVER_SIZES, 'series-row__cover', index === 0)}

			{#if restRows.length > 0}
				<div class="series-row__rest">
					{#each restRows as row, rowIndex (rowIndex)}
						<div class="series-row__pair">
							{#each row as photo (photo.id)}
								{@render frame(
									photo,
									thumbSizes(row, photo),
									row.length === 1
										? 'series-row__thumb series-row__thumb--lone'
										: 'series-row__thumb'
								)}
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>

<style lang="css">
	.series-row {
		/* Lands the title clear of the top edge when jumped to from the menu. */
		scroll-margin-top: 2rem;
	}

	.series-row__grid {
		display: grid;
		gap: var(--mm-s8);
		padding-block: clamp(4rem, 10vw, 9rem);
	}

	.series-row__index {
		display: flex;
		align-items: center;
		gap: var(--mm-s3);
		margin: 0;
		font-size: var(--mm-text-xs);
		font-variant-numeric: tabular-nums;
		letter-spacing: var(--mm-tracking-wide);
		color: var(--pi-ink-muted);
	}

	/* A short dashed tick after the number, echoing the rule above. */
	.series-row__index::after {
		content: '';
		width: 2.5rem;
		border-top: 1px dashed var(--pi-line);
	}

	.series-row__title {
		margin: var(--mm-s5) 0 0;
		font-size: var(--pi-text-title);
		overflow-wrap: anywhere;
	}

	.series-row__story {
		max-width: 40ch;
		margin: var(--mm-s6) 0 0;
		font-size: 0.9375rem;
		line-height: var(--mm-leading);
	}

	.series-row__meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--mm-s5) clamp(2rem, 4vw, 4rem);
		margin: var(--mm-s7) 0 0;
	}

	.series-row__meta dd {
		margin: var(--mm-s1) 0 0;
		font-size: 0.9375rem;
		font-variant-numeric: tabular-nums;
	}

	.series-row__cta {
		margin-top: var(--mm-s7);
	}

	.series-row__media {
		display: flex;
		flex-direction: column;
		gap: var(--mm-s8);
		min-width: 0;
	}

	figure {
		margin: 0;
	}

	.series-row__rest {
		display: flex;
		flex-direction: column;
		gap: var(--mm-s7);
	}

	.series-row__pair {
		display: flex;
		flex-direction: column;
		gap: var(--mm-s7);
	}

	.series-row__caption {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--mm-s1) var(--mm-s4);
		margin-top: var(--mm-s3);
		font-size: var(--mm-text-2xs);
		line-height: var(--mm-leading-snug);
		color: var(--pi-ink-muted);
	}

	.series-row__caption-exposure {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* Pairs side by side once there is room: flex-grow by aspect ratio makes
	   both frames the same height at their own full ratio. */
	@media (min-width: 600px) {
		.series-row__pair {
			flex-direction: row;
			align-items: flex-start;
			gap: var(--mm-s5);
		}

		.series-row__thumb {
			flex: var(--ratio) 1 0;
			min-width: 0;
		}

		/* A lone frame keeps the slot it would have in a pair. */
		.series-row__thumb--lone {
			flex: 0 0 calc(50% - var(--mm-s5) / 2);
		}

		/* The only frame under the cover goes to the right edge, with the
		   covers; one trailing a set of pairs stays in their grid. */
		.series-row__pair:only-child .series-row__thumb--lone {
			margin-left: auto;
		}
	}

	@media (min-width: 900px) {
		.series-row__grid {
			grid-template-columns: repeat(12, minmax(0, 1fr));
			column-gap: var(--pi-gutter);
			align-items: start;
		}

		/* The text holds still while the frames scroll past it. */
		.series-row__text {
			grid-column: 1 / span 5;
			position: sticky;
			top: 6rem;
		}

		.series-row__media {
			grid-column: 7 / span 6;
			gap: var(--mm-s8);
		}

		/* A tall portrait cover is capped to the viewport, so the whole frame
		   can be seen at once; it sits on the right edge like a landscape one. */
		.series-row__cover {
			width: min(100%, calc(82svh * var(--ratio)));
			margin-left: auto;
		}
	}
</style>
