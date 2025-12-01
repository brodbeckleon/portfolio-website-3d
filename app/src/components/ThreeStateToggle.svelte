<script lang="ts">
	type WebEras = 'early_web' | 'frutiger_aero' | 'modern_minimal';

	let web_era: WebEras = $state('frutiger_aero');

	const web_era_labels = {
		early_web: 'Early Web',
		frutiger_aero: 'Frutiger Aero',
		modern_minimal: 'Modern Minimal'
	};
</script>

<div class="toggle">
	{#each Object.keys(web_era_labels) as key}
		<button class:selected={web_era === key} onclick={() => (web_era = key as WebEras)}>
			{web_era_labels[key as keyof typeof web_era_labels]}
		</button>
	{/each}
</div>

<style>
	.toggle {
		display: flex;
		border: 1px solid #ccc;
		border-radius: 8px;
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
	button.selected {
		background: #007aff;
		color: white;
		font-weight: 600;
	}
</style>
