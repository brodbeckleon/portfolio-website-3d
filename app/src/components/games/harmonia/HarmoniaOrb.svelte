<script lang="ts">
	import type { Component } from 'svelte';

	interface OrbProps {
		/** Fill level 0–100. */
		value: number;
		label: string;
		detail: string;
		colour: string;
		icon: Component;
		size?: number;
		warning?: string;
	}

	let { value, label, detail, colour, icon: Icon, size = 58, warning = '' }: OrbProps = $props();

	let level = $derived(Math.max(0, Math.min(100, value)));
	let critical = $derived(level < 35);
</script>

<div class="orb-gauge" title={warning || undefined}>
	<div
		class="orb"
		class:critical
		style="--orb-colour: {colour}; --orb-size: {size}px; --orb-level: {level}%;"
		role="meter"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(level)}
		aria-valuetext="{label}: {detail}"
	>
		<div class="orb__liquid">
			<svg class="orb__wave" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true">
				<path d="M0 5 Q 15 0 30 5 T 60 5 T 90 5 T 120 5 V 10 H 0 Z" />
			</svg>
		</div>
		<div class="orb__icon"><Icon size={size * 0.36} strokeWidth={2.4} /></div>
		<div class="orb__gloss"></div>
		{#if warning}
			<span class="orb__alert" aria-hidden="true">!</span>
		{/if}
	</div>
	<span class="orb-gauge__label">{label}</span>
	<span class="orb-gauge__detail">{detail}</span>
</div>

<style>
	.orb-gauge {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		min-width: 0;
		text-align: center;
	}

	.orb {
		position: relative;
		width: var(--orb-size);
		height: var(--orb-size);
		border-radius: 50%;
		overflow: hidden;
		background:
			radial-gradient(circle at 50% 120%, rgba(255, 255, 255, 0.35), transparent 60%),
			radial-gradient(circle at 50% 40%, rgba(10, 40, 70, 0.55), rgba(5, 20, 40, 0.75));
		border: 1px solid rgba(255, 255, 255, 0.55);
		box-shadow:
			inset 0 -6px 12px rgba(255, 255, 255, 0.18),
			inset 0 4px 10px rgba(0, 0, 0, 0.45),
			0 3px 10px rgba(0, 0, 0, 0.35),
			0 0 14px color-mix(in srgb, var(--orb-colour) 45%, transparent);
	}

	.orb.critical {
		animation: orb-alarm 1.6s ease-in-out infinite;
	}

	.orb__liquid {
		position: absolute;
		inset: auto 0 0 0;
		height: var(--orb-level);
		background: linear-gradient(
			to bottom,
			color-mix(in srgb, var(--orb-colour) 70%, white),
			var(--orb-colour) 45%,
			color-mix(in srgb, var(--orb-colour) 70%, black)
		);
		transition: height 0.8s cubic-bezier(0.3, 0.8, 0.3, 1);
	}

	.orb__wave {
		position: absolute;
		left: 0;
		top: -7px;
		width: 200%;
		height: 8px;
		fill: color-mix(in srgb, var(--orb-colour) 70%, white);
		animation: orb-wave 3s linear infinite;
	}

	.orb__icon {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: white;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
	}

	/* The glass cap: the one detail that makes it read as Aero. */
	.orb__gloss {
		position: absolute;
		left: 12%;
		right: 12%;
		top: 4%;
		height: 46%;
		border-radius: 50% / 60% 60% 40% 40%;
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.05));
		pointer-events: none;
	}

	.orb__alert {
		position: absolute;
		right: 6%;
		top: 6%;
		width: 1.1em;
		height: 1.1em;
		display: grid;
		place-items: center;
		border-radius: 50%;
		font-size: 0.7rem;
		color: #7c2d12;
		background: radial-gradient(circle at 35% 30%, #fff7cc, #fbbf24 60%, #d97706);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
		text-shadow: none;
	}

	.orb-gauge__label {
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	.orb-gauge__detail {
		font-size: 0.68rem;
		font-weight: 400;
		opacity: 0.85;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	@keyframes orb-wave {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}

	@keyframes orb-alarm {
		0%,
		100% {
			box-shadow:
				inset 0 4px 10px rgba(0, 0, 0, 0.45),
				0 3px 10px rgba(0, 0, 0, 0.35),
				0 0 6px rgba(248, 113, 113, 0.5);
		}
		50% {
			box-shadow:
				inset 0 4px 10px rgba(0, 0, 0, 0.45),
				0 3px 10px rgba(0, 0, 0, 0.35),
				0 0 18px rgba(248, 113, 113, 0.95);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.orb__wave,
		.orb.critical {
			animation: none;
		}
	}
</style>
