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
	class:early-web={web_era === 'early_web'}
	class:frutiger-aero={web_era === 'frutiger_aero'}
	class:modern-minimal={web_era === 'modern_minimal'}
>
	{#each toggleable_eras as era}
		<button class:selected={web_era === era} onclick={() => selectEra(era)}>
			{web_era_labels[era]}
		</button>
	{/each}
</div>

<style>
	.toggle {
		display: flex;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	button {
		flex: 1;
		padding: 8px 12px;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s ease;
	}

	/* Early Web Era Styling */
	.toggle.early-web {
		border: 3px solid #000;
		border-radius: 0;
		box-shadow: 4px 4px 0px #000;
		background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
	}

	.toggle.early-web button {
		color: #000;
		font-family: 'Courier New', monospace;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
		border-right: 2px solid #000;
	}

	.toggle.early-web button:last-child {
		border-right: none;
	}

	.toggle.early-web button:hover {
		background: rgba(255, 255, 0, 0.3);
		transform: translate(1px, 1px);
	}

	.toggle.early-web button.selected {
		background: #ffff00;
		color: #000;
		text-shadow:
			1px 1px 0px #000,
			-1px -1px 0px #000;
		box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
	}

	/* Frutiger Aero Era Styling */
	.toggle.frutiger-aero {
		border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: 20px;
		background: linear-gradient(135deg, rgba(135, 206, 250, 0.8) 0%, rgba(176, 224, 230, 0.8) 100%);
		box-shadow:
			0 10px 30px rgba(135, 206, 250, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.6),
			inset 0 -1px 0 rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.toggle.frutiger-aero button {
		color: #1a5490;
		font-weight: 500;
		letter-spacing: 0.5px;
		border-right: 1px solid rgba(135, 206, 250, 0.3);
	}

	.toggle.frutiger-aero button:last-child {
		border-right: none;
	}

	.toggle.frutiger-aero button:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}

	.toggle.frutiger-aero button.selected {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.9) 100%);
		color: #1a5490;
		font-weight: 600;
		text-shadow:
			0 1px 2px rgba(255, 255, 255, 0.8),
			0 -1px 1px rgba(0, 0, 0, 0.1);
		box-shadow:
			0 4px 8px rgba(135, 206, 250, 0.2),
			inset 0 1px 0 rgba(255, 255, 255, 0.8);
	}

	/* Modern Minimal Era Styling */
	.toggle.modern-minimal {
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		background: rgba(20, 20, 20, 0.7);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.toggle.modern-minimal button {
		color: rgba(255, 255, 255, 0.7);
		font-weight: 300;
		letter-spacing: 0.5px;
		border-right: 1px solid rgba(255, 255, 255, 0.12);
	}

	.toggle.modern-minimal button:last-child {
		border-right: none;
	}

	.toggle.modern-minimal button:hover {
		background: rgba(40, 40, 40, 0.6);
		color: rgba(255, 255, 255, 0.9);
	}

	.toggle.modern-minimal button.selected {
		background: rgba(50, 50, 50, 0.8);
		color: rgba(255, 255, 255, 0.95);
		font-weight: 400;
		border-color: rgba(255, 255, 255, 0.2);
	}
</style>
