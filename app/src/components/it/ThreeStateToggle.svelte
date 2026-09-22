<script lang="ts">
	import type { WebEras } from '$lib/Types.ts';
	import { web_era_labels, toggleable_eras } from '$lib/Types.ts';

	let { web_era = $bindable('frutiger_aero' as WebEras), label = undefined } = $props();

	function selectEra(era: WebEras) {
		web_era = era;
	}
</script>

<div
	class="toggle"
	role="group"
	aria-label={label}
	class:earlyweb-container={web_era === 'early_web'}
	class:frutiger-aero-3way-toggle={web_era === 'frutiger_aero'}
	class:modern-minimal-3way-toggle={web_era === 'modern_minimal'}
>
	{#each toggleable_eras as era (era)}
		<button
			type="button"
			class:earlyweb-button={web_era === 'early_web'}
			class:frutiger-aero-3way-toggle-button={web_era === 'frutiger_aero'}
			class:modern-minimal-button={web_era === 'modern_minimal'}
			class={web_era === era ? 'active' : 'inactive'}
			aria-pressed={web_era === era}
			onclick={() => selectEra(era)}
		>
			{web_era_labels[era]}
		</button>
	{/each}
</div>

<style>
	.toggle {
		display: flex;
		overflow: hidden;
	}

	/* No background/border/font here on purpose: a scoped element selector
	   outranks the era classes, so those properties must stay theme-owned. */
	button {
		/* basis auto, not 0: with a zero basis the three buttons share the track
		   equally and the longest label gets clipped by the track's overflow. */
		flex: 1 1 auto;
		padding: var(--toggle-padding, 8px 12px);
		cursor: pointer;
		white-space: nowrap;
	}

	/* Narrow phones: the three era names need ~343px at the default size, which
	   does not fit a 360px screen. Tightening here rather than clipping labels
	   is the one place this component overrides theme-owned type. */
	@media (max-width: 560px) {
		.toggle {
			--toggle-padding: 7px 6px;
		}

		button {
			font-size: 0.8125rem;
		}
	}
</style>
