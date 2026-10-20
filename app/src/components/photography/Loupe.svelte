<script lang="ts">
	import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';
	import MatchNeedle from './MatchNeedle.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { SERIES, type Photo } from '$lib/photos';
	import { ev, formatAperture, formatShutter } from '$lib/photos/exposure';

	interface LoupeProps {
		photos: Photo[];
		/** Photo to show; null keeps the loupe closed. Owned by the URL. */
		openId: string | null;
		onSelect: (id: string) => void;
		onClose: () => void;
	}

	let { photos, openId, onSelect, onClose }: LoupeProps = $props();

	const uid = $props.id();
	const titleId = `${uid}-title`;

	/** Past this, a drag is a swipe rather than a wobbly tap. */
	const SWIPE_THRESHOLD = 50;

	let dialog: HTMLDialogElement | undefined = $state();
	let closeButton: HTMLButtonElement | undefined = $state();
	let stage: HTMLDivElement | undefined = $state();

	let index = $derived(openId ? photos.findIndex((photo) => photo.id === openId) : -1);
	let photo = $derived(index >= 0 ? photos[index] : undefined);
	let total = $derived(photos.length);
	let prevPhoto = $derived(
		index >= 0 && total > 1 ? photos[(index - 1 + total) % total] : undefined
	);
	let nextPhoto = $derived(index >= 0 && total > 1 ? photos[(index + 1) % total] : undefined);
	// With two photos prev and next are the same frame; preload it once.
	let neighbours = $derived(
		[prevPhoto, nextPhoto].filter(
			(neighbour, i, list): neighbour is Photo =>
				!!neighbour && list.findIndex((other) => other?.id === neighbour.id) === i
		)
	);

	let counterLabel = $derived(m.loupe_frame_counter({ current: index + 1, total }));
	let counterText = $derived(`${pad(index + 1)} / ${pad(total)}`);
	let seriesTitle = $derived(SERIES.find((series) => series.id === photo?.series)?.title());

	function pad(value: number) {
		return String(value).padStart(2, '0');
	}

	// paraglide's 'jp' is a country code, not a language; Intl wants 'ja'.
	let intlLocale = $derived(getLocale() === 'jp' ? 'ja' : getLocale());

	/**
	 * The wall-clock time where the photo was taken, not where it is viewed:
	 * 22:09 at Daikoku should read 22:09 from Zurich too. The digits are read
	 * straight off the ISO string and formatted as UTC, which leaves them as
	 * written and ignores the viewer's own zone.
	 */
	function formatTakenAt(iso: string, locale: string): string {
		const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso);
		if (!match) return iso;
		const [, year, month, day, hour, minute, second] = match;
		const wallClock = new Date(
			Date.UTC(+year, +month - 1, +day, +hour, +minute, second ? +second : 0)
		);
		return new Intl.DateTimeFormat(locale, {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'UTC'
		}).format(wallClock);
	}

	// The URL is the source of truth, so the dialog only mirrors openId. This
	// also covers a direct load of /photography/[id]: the server renders the
	// dialog closed and the first client run of this effect opens it.
	$effect(() => {
		if (!dialog) return;
		if (photo && !dialog.open) {
			dialog.showModal();
			// autofocus already asks for this; repeating it covers browsers
			// that would otherwise land on the first focusable, the prev button.
			closeButton?.focus();
		} else if (!photo) {
			closeRequestedFor = null;
			if (dialog.open) dialog.close();
		}
	});

	// Scroll lock on the root, because the dialog's own overflow does not stop
	// the page behind it from scrolling on iOS or with a trackpad.
	$effect(() => {
		if (!photo) return;
		const root = document.documentElement;
		root.classList.add('loupe-open');
		return () => root.classList.remove('loupe-open');
	});

	// onClose may be history.back(), which only lands on the next popstate.
	// Until then openId still names the photo, so a double-click on the
	// backdrop, or Esc pressed twice, would step back twice and leave the
	// page. One request per open photo; the effect clears it once closed.
	let closeRequestedFor: string | null = null;

	function requestClose() {
		if (!openId || closeRequestedFor === openId) return;
		closeRequestedFor = openId;
		onClose();
	}

	function handleCancel(event: Event) {
		// Esc goes through the router like the close button, so history and
		// the URL change first and the dialog follows.
		event.preventDefault();
		requestClose();
	}

	function handleClose() {
		// Chrome closes a dialog anyway on a repeated Esc it has already seen
		// cancelled. If that happens the URL still names a photo, so catch up.
		if (photo) requestClose();
	}

	let suppressClick = false;

	function handleBackdropClick(event: MouseEvent) {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		// The dialog fills the viewport, so its own padding and the empty stage
		// around the photo are the backdrop. The photo itself never closes it.
		if (event.target === dialog || event.target === stage) requestClose();
	}

	function showPrev() {
		if (prevPhoto) onSelect(prevPhoto.id);
	}

	function showNext() {
		if (nextPhoto) onSelect(nextPhoto.id);
	}

	function isFormControl(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return false;
		return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!photo || !dialog?.open) return;
		// Leave modified arrows to the browser and OS: Alt+Left is Back.
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		if (isFormControl(event.target)) return;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			showPrev();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			showNext();
		}
	}

	let swipe: { id: number; x: number; y: number } | null = null;

	function handlePointerDown(event: PointerEvent) {
		if (!event.isPrimary || event.button !== 0) return;
		swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
	}

	function handlePointerUp(event: PointerEvent) {
		if (!swipe || swipe.id !== event.pointerId) return;
		const dx = event.clientX - swipe.x;
		const dy = event.clientY - swipe.y;
		swipe = null;
		// Mostly horizontal, so a vertical scroll that drifts sideways on the
		// phone layout does not flip the photo.
		if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
		// The click that follows the release would otherwise land on the stage
		// and read as a backdrop click.
		suppressClick = true;
		setTimeout(() => (suppressClick = false), 0);
		if (dx < 0) showNext();
		else showPrev();
	}

	function handlePointerCancel() {
		swipe = null;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- The click handler is only a pointer shortcut for Esc and the close
     button, both of which stay available to keyboard users. -->
<dialog
	bind:this={dialog}
	class="loupe modern-minimal-font"
	aria-labelledby={photo ? titleId : undefined}
	oncancel={handleCancel}
	onclose={handleClose}
	onclick={handleBackdropClick}
>
	{#if photo}
		<div class="loupe-layout">
			<header class="loupe-bar">
				<div class="loupe-heading">
					<p class="loupe-counter" role="img" aria-label={counterLabel}>{counterText}</p>
					{#if seriesTitle}
						<p class="loupe-series paper-ink-label">{seriesTitle}</p>
					{/if}
				</div>

				<div class="loupe-controls">
					{#if total > 1}
						<button
							type="button"
							class="loupe-button"
							aria-label={m.loupe_previous()}
							title={m.loupe_previous()}
							onclick={showPrev}
						>
							<ChevronLeft size={18} strokeWidth={1.25} aria-hidden="true" />
						</button>
						<button
							type="button"
							class="loupe-button"
							aria-label={m.loupe_next()}
							title={m.loupe_next()}
							onclick={showNext}
						>
							<ChevronRight size={18} strokeWidth={1.25} aria-hidden="true" />
						</button>
						<span class="loupe-divider" aria-hidden="true"></span>
					{/if}
					<!-- Autofocus inside a modal dialog is the sanctioned way to pick its
					     first focus; the lint only exempts direct dialog children. -->
					<!-- svelte-ignore a11y_autofocus -->
					<button
						bind:this={closeButton}
						type="button"
						class="loupe-button"
						aria-label={m.loupe_close()}
						title={m.loupe_close()}
						autofocus
						onclick={requestClose}
					>
						<X size={18} strokeWidth={1.25} aria-hidden="true" />
					</button>
				</div>
			</header>

			<div
				bind:this={stage}
				class="loupe-stage"
				onpointerdown={handlePointerDown}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerCancel}
				role="presentation"
			>
				{#key photo.id}
					<!-- The largest file's width caps the image: srcset alone would let
					     a wide stage stretch it past the pixels there are. -->
					<div class="loupe-frame" style:--loupe-natural-width="{photo.image.img.w}px">
						<enhanced:img
							src={photo.image}
							alt={photo.alt()}
							sizes="(max-width: 768px) 100vw, calc(100vw - 360px)"
							fetchpriority="high"
							draggable="false"
						/>
					</div>
				{/key}
			</div>

			<section class="loupe-panel" aria-label={m.photo_details()}>
				<h2 id={titleId} class="loupe-title">{photo.alt()}</h2>
				{#if photo.story}
					<p class="loupe-story">{photo.story()}</p>
				{/if}

				<dl class="loupe-exif">
					<div>
						<dt class="paper-ink-label">{m.exif_camera()}</dt>
						<dd>{photo.exif.camera}</dd>
					</div>
					<div>
						<dt class="paper-ink-label">{m.exif_lens()}</dt>
						<dd>{photo.exif.lens ?? m.exif_lens_fixed({ focal: photo.exif.focalLength })}</dd>
					</div>
					<div>
						<dt class="paper-ink-label">{m.exif_exposure()}</dt>
						<dd>
							{formatAperture(photo.exif.fNumber)} · {formatShutter(photo.exif.exposureTime)} · ISO
							{photo.exif.iso} · {photo.exif.focalLength}mm
						</dd>
					</div>
					{#if photo.filmSim}
						<div>
							<dt class="paper-ink-label">{m.exif_film_sim()}</dt>
							<dd>{photo.filmSim}</dd>
						</div>
					{/if}
					<div>
						<dt class="paper-ink-label">{m.exif_taken()}</dt>
						<dd>
							<time datetime={photo.takenAt}>{formatTakenAt(photo.takenAt, intlLocale)}</time>
						</dd>
					</div>
				</dl>

				<div class="loupe-meter">
					<MatchNeedle ev={ev(photo.exif)} />
				</div>
			</section>

			<!-- Stepping through the loupe announces where the visitor landed;
			     the counter and heading change silently otherwise. -->
			<p class="loupe-sr-only" aria-live="polite">
				<span>{counterLabel}.</span>
				<span>{photo.alt()}</span>
			</p>

			<!-- Neighbours rendered off-screen with the same sizes, so the browser
			     picks and caches exactly the source the stage will ask for next,
			     AVIF or WebP included. display:none images still load. -->
			<div class="loupe-preload" aria-hidden="true">
				{#each neighbours as neighbour (neighbour.id)}
					<enhanced:img
						src={neighbour.image}
						alt=""
						sizes="(max-width: 768px) 100vw, calc(100vw - 360px)"
						fetchpriority="low"
					/>
				{/each}
			</div>
		</div>
	{/if}
</dialog>

<style lang="css">
	:global(html.loupe-open) {
		overflow: hidden;
	}

	/* Full-viewport rather than a centred card: the photo gets every pixel the
	   chrome does not need, and the dialog's own box doubles as the backdrop. */
	.loupe {
		box-sizing: border-box;
		position: fixed;
		inset: 0;
		width: 100%;
		max-width: none;
		height: 100%;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		overflow: hidden;
		background: var(--pi-paper);
		color: var(--pi-ink);
	}

	.loupe::backdrop {
		background: var(--pi-paper);
	}

	/* The page's moving grain sits below the top layer, so the dialog carries
	   a still copy of its own. It is painted under the layout, and the photo
	   is opaque, so it shows on the paper around the picture and never on it. */
	.loupe::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: var(--pi-grain-tile);
		background-size: var(--pi-grain-size);
		opacity: var(--pi-grain-opacity);
		mix-blend-mode: var(--pi-grain-blend);
		pointer-events: none;
	}

	.loupe:not([open]) {
		display: none;
	}

	.loupe-layout {
		box-sizing: border-box;
		position: relative;
		display: grid;
		height: 100%;
		grid-template-columns: minmax(0, 1fr) 320px;
		grid-template-rows: auto minmax(0, 1fr);
		grid-template-areas:
			'bar bar'
			'stage panel';
		padding-left: env(safe-area-inset-left);
		padding-right: env(safe-area-inset-right);
	}

	.loupe-bar {
		grid-area: bar;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--mm-s4);
		padding: max(var(--mm-s4), env(safe-area-inset-top)) var(--pi-gutter) var(--mm-s4);
		border-bottom: 1px dashed var(--pi-line);
	}

	.loupe-heading {
		display: flex;
		align-items: baseline;
		gap: var(--mm-s4);
		min-width: 0;
	}

	/* The frame counter, printed like a contact-sheet edge number. */
	.loupe-counter {
		margin: 0;
		font-family: var(--pi-font-display);
		font-optical-sizing: auto;
		font-size: var(--mm-text-2xl);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: 1;
		letter-spacing: 0.02em;
		color: var(--pi-ink);
		white-space: nowrap;
	}

	.loupe-series {
		margin: 0;
		white-space: nowrap;
	}

	.loupe-controls {
		display: flex;
		align-items: center;
		gap: var(--mm-s2);
	}

	.loupe-divider {
		width: 0;
		height: 1.5rem;
		margin-inline: var(--mm-s2);
		border-left: 1px dashed var(--pi-line);
	}

	/* The ring of the page's calls to action; on hover the ink floods it, as
	   the dot does in CircleLink. */
	.loupe-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
		border: 1px solid var(--pi-ink);
		border-radius: 50%;
		background: transparent;
		color: var(--pi-ink);
		cursor: pointer;
		transition:
			background-color 320ms var(--pi-ease-out),
			color 320ms var(--pi-ease-out);
	}

	.loupe-button:hover {
		background: var(--pi-ink);
		color: var(--pi-paper);
	}

	.loupe-button:focus-visible {
		outline: 2px solid var(--pi-ink);
		outline-offset: 3px;
	}

	/* pan-y keeps vertical scrolling native on the phone layout while
	   horizontal drags reach the pointer handlers as swipes. The inline
	   padding is the page gutter, so a landscape photo's left edge sits on
	   the same line as the frame counter above it. */
	.loupe-stage {
		grid-area: stage;
		display: grid;
		grid-template: minmax(0, 1fr) / minmax(0, 1fr);
		min-width: 0;
		min-height: 0;
		padding: clamp(var(--mm-s4), 3vw, var(--mm-s7)) var(--pi-gutter);
		touch-action: pan-y;
	}

	/* Explicit 0-minimum tracks: an auto track would size to the image's
	   intrinsic height and push the stage past the viewport. */
	.loupe-frame {
		display: grid;
		grid-template: minmax(0, 1fr) / minmax(0, 1fr);
		place-items: center;
		min-width: 0;
		min-height: 0;
		pointer-events: none;
		animation: loupe-fade-in 420ms var(--pi-ease-out);
		/* A size container, so the image can measure against the frame in cq
		   units. A percentage max-height on a grid item does not resolve here
		   in Chrome, and portrait frames ran off the bottom of the dialog. */
		container-type: size;
	}

	/* <enhanced:img> wraps the <img> in a <picture>; taking that wrapper out
	   of layout lets the image size against the frame directly. */
	.loupe-frame :global(picture) {
		display: contents;
	}

	/* Fit, never crop, never upscale: auto sizes start from the intrinsic
	   width and height, and the max-* only ever shrink them. The srcset makes
	   the intrinsic width equal the `sizes` slot, not the file, hence the
	   explicit cap at the largest file's width. */
	.loupe-frame :global(img) {
		display: block;
		width: auto;
		height: auto;
		max-width: min(100cqw, var(--loupe-natural-width, 100cqw));
		max-height: 100cqh;
		object-fit: contain;
		pointer-events: auto;
		user-select: none;
		-webkit-user-drag: none;
	}

	@keyframes loupe-fade-in {
		from {
			opacity: 0;
		}
	}

	.loupe-panel {
		grid-area: panel;
		display: flex;
		flex-direction: column;
		gap: var(--mm-s5);
		min-height: 0;
		overflow-y: auto;
		padding: var(--mm-s6) var(--pi-gutter) max(var(--mm-s6), env(safe-area-inset-bottom))
			var(--mm-s6);
		border-left: 1px dashed var(--pi-line);
	}

	/* Sentence case: the title is the photo's description, and a whole
	   sentence in capitals reads as shouting at this size. */
	.loupe-title {
		margin: 0;
		font-family: var(--pi-font-display), var(--pi-font-kanji);
		font-optical-sizing: auto;
		font-size: var(--mm-text-2xl);
		font-weight: 400;
		line-height: 1.15;
		letter-spacing: -0.005em;
		color: var(--pi-ink);
		text-wrap: balance;
	}

	.loupe-story {
		margin: 0;
		font-size: var(--mm-text-sm);
		line-height: var(--mm-leading-relaxed);
		color: var(--pi-ink-muted);
		text-wrap: pretty;
	}

	.loupe-exif {
		display: flex;
		flex-direction: column;
		margin: 0;
		border-top: 1px dashed var(--pi-line);
	}

	.loupe-exif > div {
		display: flex;
		flex-direction: column;
		gap: var(--mm-s1);
		padding-block: var(--mm-s3);
		border-bottom: 1px dashed var(--pi-line);
	}

	.loupe-exif dd {
		margin: 0;
		font-size: var(--mm-text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--pi-ink);
		overflow-wrap: anywhere;
	}

	.loupe-meter {
		padding-top: var(--mm-s1);
	}

	.loupe-sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.loupe-preload {
		display: none;
	}

	/* Phones: photo full width at the top, details scroll underneath. The
	   whole layout scrolls instead of the panel, so the photo can be swiped
	   away upwards like any page. */
	@media (max-width: 768px) {
		.loupe-layout {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto auto auto;
			grid-template-areas:
				'bar'
				'stage'
				'panel';
			overflow-y: auto;
			overscroll-behavior: contain;
		}

		/* Sticky over the scrolling photo, so it needs the paper behind it,
		   and the paper needs its grain or the bar reads as a smooth strip.
		   The grain sits in the bar's own stacking context, under its text. */
		.loupe-bar {
			position: sticky;
			top: 0;
			z-index: 1;
			isolation: isolate;
			padding-block: max(var(--mm-s3), env(safe-area-inset-top)) var(--mm-s3);
			background: var(--pi-paper);
		}

		.loupe-bar::before {
			content: '';
			position: absolute;
			inset: 0;
			z-index: -1;
			background-image: var(--pi-grain-tile);
			background-size: var(--pi-grain-size);
			opacity: var(--pi-grain-opacity);
			mix-blend-mode: var(--pi-grain-blend);
			pointer-events: none;
		}

		.loupe-counter {
			font-size: var(--mm-text-xl);
		}

		/* The layout has a definite height here, so with a 0 minimum the auto
		   row gave the stage only what the bar and panel left over, and a tall
		   photo spilled under the details. Its content size is the minimum. */
		.loupe-stage {
			min-height: auto;
			padding: var(--mm-s4) 0;
		}

		/* Here the row sizes to the photo, so the frame cannot be a size
		   container (it would collapse to nothing); the viewport caps it. */
		.loupe-frame {
			container-type: normal;
		}

		/* Leave a sliver of the details in view so it is clear there is more. */
		.loupe-frame :global(img) {
			max-width: min(100%, var(--loupe-natural-width, 100%));
			max-height: calc(100dvh - 9rem - env(safe-area-inset-top));
		}

		.loupe-panel {
			overflow-y: visible;
			padding: var(--mm-s5) var(--pi-gutter) max(var(--mm-s7), env(safe-area-inset-bottom));
			border-left: 0;
			border-top: 1px dashed var(--pi-line);
		}
	}

	/* Tiny phones: the series label gives way before the buttons do. */
	@media (max-width: 360px) {
		.loupe-series {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.loupe-frame {
			animation: none;
		}

		.loupe-button {
			transition: none;
		}
	}
</style>
