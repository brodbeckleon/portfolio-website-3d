<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import LanguageDropDown from './LanguageDropDown.svelte';
	import type { WebEras } from '$lib/Types.ts';
	import Socials from './Socials.svelte';
	import { goto } from '$app/navigation';

	interface TitleBarProps {
		era: WebEras;
	}

	let { era }: TitleBarProps = $props();

	function returnToHomepage() {
		goto('/');
	}
</script>

<div
	class="title-bar"
	class:glassmorphism={era === 'glassmorphism'}
	class:early-web={era === 'early_web'}
	class:frutiger-aero={era === 'frutiger_aero'}
	class:modern-minimal={era === 'modern_minimal'}
>
	<div class="title-bar_left">
		<Socials {era} />
	</div>
	<h1
		class="main_title"
		class:glassmorphism={era === 'glassmorphism'}
		aria-label={m.return_to_homepage()}
		onclick={() => returnToHomepage()}
	>
		{m.leon_shinichi()}
	</h1>
	<div class="title-bar_right">
		<LanguageDropDown {era} />
	</div>
</div>

<style lang="css">
	.title-bar {
		display: flex;
		align-items: center;
		position: relative;
		margin: 2rem auto;
	}

	.title-bar_left {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		margin-left: 1rem;
	}

	.title-bar_right {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-right: 1rem;
	}

	.main_title {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		cursor: pointer;
	}

	/* Glassmorphism Styling */
	.title-bar.glassmorphism {
		z-index: 1000;
		width: 100%;
		color: #fff;
		position: fixed;
	}

	.main_title.glassmorphism {
		font-family: 'Helvetica Neue', sans-serif;
		font-size: 3rem;
		width: fit-content;

		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 9999px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(200, 200, 200, 0.5),
			inset 0 -1px 0 rgba(200, 200, 200, 0.1),
			inset 0 0 5px 2px rgba(200, 200, 200, 0.5);
		overflow: hidden !important;
		padding: 1rem 2rem;
	}

	.main_title.glassmorphism::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
	}

	.main_title.glassmorphism::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 1px;
		height: 100%;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.8),
			transparent,
			rgba(255, 255, 255, 0.3)
		);
	}

	/* Early Web Era Styling */
	.title-bar.early-web {
		background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
		border: 3px solid #000;
		border-radius: 0;
		padding: 0.5rem 1rem;
		box-shadow:
			4px 4px 0 #000,
			inset 0 0 20px rgba(0, 0, 0, 0.1);
	}

	.title-bar.early-web .main_title {
		color: #ffff00;
		text-shadow:
			2px 2px 0 #000,
			-1px -1px 0 #000,
			1px -1px 0 #000,
			-1px 1px 0 #000;
		font-family: 'Courier New', monospace;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 3px;
	}

	.title-bar.early-web :global(.language-dropdown .dropdown-btn) {
		background: #ffff00;
		border: 2px solid #000;
		color: #000;
		font-weight: bold;
	}

	.title-bar.early-web :global(.language-dropdown .dropdown-btn:hover) {
		background: #ffeb3b;
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0 #000;
	}

	/* Frutiger Aero Era Styling */
	.title-bar.frutiger-aero {
		background: linear-gradient(135deg, rgba(135, 206, 250, 0.8) 0%, rgba(176, 224, 230, 0.8) 100%);
		border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: 20px;
		padding: 1rem 2rem;
		box-shadow:
			0 10px 30px rgba(135, 206, 250, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.6),
			inset 0 -1px 0 rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.title-bar.frutiger-aero .main_title {
		color: #1a5490;
		text-shadow:
			0 2px 4px rgba(255, 255, 255, 0.8),
			0 -1px 2px rgba(0, 0, 0, 0.2);
		font-weight: 600;
		letter-spacing: 1px;
	}

	.title-bar.frutiger-aero :global(.language-dropdown .dropdown-btn) {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.9) 100%);
		border: 1px solid rgba(135, 206, 250, 0.5);
		color: #1a5490;
		box-shadow: 0 4px 8px rgba(135, 206, 250, 0.2);
	}

	.title-bar.frutiger-aero :global(.language-dropdown .dropdown-btn:hover) {
		background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(240, 248, 255, 1) 100%);
		box-shadow: 0 6px 12px rgba(135, 206, 250, 0.4);
		transform: translateY(-2px);
	}

	/* Modern Minimal Era Styling */
	.title-bar.modern-minimal {
		background: rgba(20, 20, 20, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.title-bar.modern-minimal .main_title {
		color: rgba(255, 255, 255, 0.9);
		font-weight: 300;
		letter-spacing: 1px;
		font-size: 1.5rem;
	}

	.title-bar.modern-minimal :global(.language-dropdown .dropdown-btn) {
		background: rgba(30, 30, 30, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.8);
		border-radius: 4px;
	}

	.title-bar.modern-minimal :global(.language-dropdown .dropdown-btn:hover) {
		background: rgba(40, 40, 40, 0.8);
		border-color: rgba(255, 255, 255, 0.3);
	}
</style>
