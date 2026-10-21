<!-- Fixed behind the content and never over it: the photos sit above this
     layer, so the grain textures the paper and never the pictures. -->
<div class="paper-grain" aria-hidden="true">
	<div class="paper-grain__tile"></div>
</div>

<style lang="css">
	.paper-grain {
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
	}

	/* Oversized so jumping it around never shows an edge: the largest jump
	   is 12% of this box (16.8% of the viewport), inside the 20% overhang.
	   Not -50%: that is a layer four times the screen, around 80MB of GPU
	   memory on a retina desktop, for offsets that never use it. Only the
	   transform moves, which the compositor can do without repainting. */
	.paper-grain__tile {
		position: absolute;
		inset: -20%;
		background-image: var(--pi-grain-tile);
		background-size: var(--pi-grain-size);
		animation: paper-grain-shift 0.9s steps(1) infinite;
		will-change: transform;
	}

	/* Film grain flickers rather than drifts: eight hard cuts between
	   unrelated offsets, no easing between them. */
	@keyframes paper-grain-shift {
		0% {
			transform: translate(0, 0);
		}
		12.5% {
			transform: translate(-7%, -9%);
		}
		25% {
			transform: translate(9%, 4%);
		}
		37.5% {
			transform: translate(-4%, 11%);
		}
		50% {
			transform: translate(12%, -6%);
		}
		62.5% {
			transform: translate(-11%, 3%);
		}
		75% {
			transform: translate(5%, -12%);
		}
		87.5% {
			transform: translate(-2%, 8%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.paper-grain__tile {
			animation: none;
		}
	}
</style>
