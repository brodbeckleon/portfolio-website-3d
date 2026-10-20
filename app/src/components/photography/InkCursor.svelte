<script lang="ts">
	import { onMount } from 'svelte';

	/** Share of the remaining distance the ring closes each frame. */
	const LERP = 0.18;
	/** Below this many px the ring counts as arrived and the loop stops. */
	const SETTLE = 0.1;

	const INTERACTIVE = 'a, button, [role="button"], label, summary, select, input, textarea';

	let enabled = $state(false);
	let visible = $state(false);
	let hovering = $state(false);
	let overPhoto = $state(false);

	let ring: HTMLDivElement | undefined = $state();
	let dot: HTMLDivElement | undefined = $state();

	onMount(() => {
		// Touch and pen have no hover to follow, and a cursor that jumps to
		// each tap is noise. Only a mouse or trackpad gets the ring.
		const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

		let target = { x: 0, y: 0 };
		let current = { x: 0, y: 0 };
		let frame = 0;
		let placed = false;

		function paint() {
			if (ring) ring.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
			if (dot) dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
		}

		// The loop only lives while the ring still has ground to cover; a still
		// mouse costs nothing.
		function step() {
			const dx = target.x - current.x;
			const dy = target.y - current.y;
			if (reducedMotion.matches || Math.hypot(dx, dy) < SETTLE) {
				current = { ...target };
				paint();
				frame = 0;
				return;
			}
			current = { x: current.x + dx * LERP, y: current.y + dy * LERP };
			paint();
			frame = requestAnimationFrame(step);
		}

		function wake() {
			if (!frame) frame = requestAnimationFrame(step);
		}

		// The loupe is a top-layer dialog, which paints over any z-index; the
		// ring would vanish under it mid-move. Hiding it outright is calmer.
		function dialogOpen() {
			return document.querySelector('dialog[open]') !== null;
		}

		function handleMove(event: PointerEvent) {
			if (event.pointerType !== 'mouse') return;
			target = { x: event.clientX, y: event.clientY };
			// The first move after entering lands the ring in place instead of
			// sweeping in from the corner.
			if (!placed) {
				current = { ...target };
				placed = true;
			}
			visible = !dialogOpen();
			wake();
		}

		function handleOver(event: PointerEvent) {
			const element = event.target instanceof Element ? event.target : null;
			const interactive = element?.closest(INTERACTIVE) ?? null;
			hovering = interactive !== null;
			// A photo opens the loupe; the ring frames it without the dot
			// sitting on the picture.
			overPhoto =
				!!element?.closest('.series-image') ||
				(interactive instanceof HTMLButtonElement &&
					interactive.hasAttribute('aria-label') &&
					interactive.querySelector('img') !== null);
		}

		function handleLeave() {
			visible = false;
			placed = false;
		}

		function attach() {
			window.addEventListener('pointermove', handleMove, { passive: true });
			window.addEventListener('pointerover', handleOver, { passive: true });
			document.documentElement.addEventListener('pointerleave', handleLeave);
			window.addEventListener('blur', handleLeave);
		}

		function detach() {
			window.removeEventListener('pointermove', handleMove);
			window.removeEventListener('pointerover', handleOver);
			document.documentElement.removeEventListener('pointerleave', handleLeave);
			window.removeEventListener('blur', handleLeave);
			cancelAnimationFrame(frame);
			frame = 0;
			visible = false;
			placed = false;
		}

		function sync() {
			enabled = finePointer.matches;
			if (enabled) attach();
			else detach();
		}

		// The dialog opens from a click and closes from Esc or the URL, neither
		// of which is a pointer move, so watch for it directly.
		const dialogWatch = new MutationObserver(() => {
			if (dialogOpen()) visible = false;
		});
		dialogWatch.observe(document.body, {
			subtree: true,
			attributes: true,
			attributeFilter: ['open']
		});

		sync();
		finePointer.addEventListener('change', sync);

		return () => {
			finePointer.removeEventListener('change', sync);
			dialogWatch.disconnect();
			detach();
		};
	});
</script>

{#if enabled}
	<div
		class="ink-cursor"
		class:is-visible={visible}
		class:is-hovering={hovering}
		class:is-photo={overPhoto}
		aria-hidden="true"
	>
		<div bind:this={ring} class="ink-cursor__ring"><span></span></div>
		<div bind:this={dot} class="ink-cursor__dot"><span></span></div>
	</div>
{/if}

<style lang="css">
	/* The native cursor stays: this is a companion to it, not a replacement,
	   so nothing is lost if a frame drops or the script never runs. */
	.ink-cursor {
		position: fixed;
		inset: 0;
		z-index: 100;
		pointer-events: none;
		opacity: 0;
		transition: opacity 240ms var(--pi-ease-out);
	}

	.ink-cursor.is-visible {
		opacity: 1;
	}

	/* The outer element carries the pointer position (set from script); the
	   inner one carries the size change, so the two transforms never fight. */
	.ink-cursor__ring,
	.ink-cursor__dot {
		position: absolute;
		top: 0;
		left: 0;
		will-change: transform;
	}

	.ink-cursor__ring span,
	.ink-cursor__dot span {
		position: absolute;
		border-radius: 50%;
		translate: -50% -50%;
	}

	.ink-cursor__ring span {
		width: 44px;
		height: 44px;
		border: 1px solid var(--pi-ink);
		transition:
			width 360ms var(--pi-ease-out),
			height 360ms var(--pi-ease-out),
			opacity 360ms var(--pi-ease-out);
		opacity: 0.7;
	}

	.ink-cursor__dot span {
		width: 5px;
		height: 5px;
		background-color: var(--pi-ink);
		transition: opacity 240ms var(--pi-ease-out);
	}

	.is-hovering .ink-cursor__ring span {
		width: 64px;
		height: 64px;
		opacity: 1;
	}

	.is-hovering .ink-cursor__dot span {
		opacity: 0;
	}

	.is-photo .ink-cursor__ring span {
		width: 80px;
		height: 80px;
	}

	@media (prefers-reduced-motion: reduce) {
		.ink-cursor,
		.ink-cursor__ring span,
		.ink-cursor__dot span {
			transition: none;
		}
	}
</style>
