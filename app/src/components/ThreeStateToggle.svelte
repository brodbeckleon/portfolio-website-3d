<script lang="ts">
	import type { WebEras } from '$lib/Types.ts';
	import { web_era_labels, toggleable_eras } from '$lib/Types.ts';

	let { web_era = $bindable('frutiger_aero' as WebEras) } = $props();

	function selectEra(era: WebEras) {
		web_era = era;
	}
</script>

<div
	class="toggle"
	class:earlyweb-container={web_era === 'early_web'}
	class:frutiger-aero-3way-toggle={web_era === 'frutiger_aero'}
	class:modern-minimal-3way-toggle={web_era === 'modern_minimal'}
>
	{#each toggleable_eras as era}
		<button
			class:earlyweb-button={web_era === 'early_web'}
			class:frutiger-aero-3way-toggle-button={web_era === 'frutiger_aero'}
			class:modern-minimal-button={web_era === 'modern_minimal'}
			class={web_era === era ? 'active' : 'inactive'}
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

	button {
		flex: 1;
		padding: 8px 12px;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 14px;
	}
</style>
