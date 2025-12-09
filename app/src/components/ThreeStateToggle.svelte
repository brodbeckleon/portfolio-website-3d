<script lang="ts">
	import type { WebEras } from '$lib/Types.ts';
	import { web_era_labels, toggleable_eras } from '$lib/Types.ts';

	let { web_era = $bindable('early_web' as WebEras) } = $props();

	function selectEra(era: WebEras) {
		web_era = era;
	}
</script>

<div class="toggle" class:earlyweb-container={web_era === 'early_web'}>
	{#each toggleable_eras as era}
		<button
			class:earlyweb-button={web_era === 'early_web'}
			class={web_era === era ? 'active' : ''}
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
