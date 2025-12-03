<script lang="ts">
	import { Github, Instagram, Youtube, Linkedin } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import type { WebEras } from '$lib/Types.ts';

	interface SocialsProps {
		era: WebEras;
	}

	let { era }: SocialsProps = $props();

	const socialLinks = [
		{ icon: Github, href: 'https://www.github.com/brodbeckleon', text: 'GitHub' },
		{ icon: Instagram, href: 'https://www.instagram.com/leon.brodbeck/', text: 'Instagram' },
		{ icon: Youtube, href: 'https://www.youtube.com/@leon.brodbeck', text: 'Youtube' },
		{
			icon: Linkedin,
			href: 'https://www.linkedin.com/in/léon-shin-ichi-brodbeck-b71786240/',
			text: 'Linkedin'
		}
	];

	function goExternal(url: string) {
		window.location.href = url;
	}
</script>

<div
	class="social-icons"
	class:glassmorphism={era === 'glassmorphism'}
	class:early-web={era === 'early_web'}
	class:frutiger-aero={era === 'frutiger_aero'}
	class:modern-minimal={era === 'modern_minimal'}
>
	{#each socialLinks as { icon: IconComponent, href, text } (href)}
		<button
			class="icon-link"
			class:glassmorphism={era === 'glassmorphism'}
			class:early-web={era === 'early_web'}
			class:frutiger-aero={era === 'frutiger_aero'}
			class:modern-minimal={era === 'modern_minimal'}
			onclick={() => goExternal(href)}
			aria-label={m.open_link({ website_name: text })}
		>
			<IconComponent strokeWidth={1} />
		</button>
	{/each}
</div>

<style lang="css">
	.icon-link {
		cursor: pointer;
	}

	/** Glassmorphism styling **/
	.social-icons.glassmorphism {
		width: fit-content;
		align-content: center;
		height: 3rem;
		padding: 0 1rem;

		transition:
			transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
			background 0.25s cubic-bezier(0.4, 0, 0.2, 1);

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
	}

	.social-icons.glassmorphism:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.03);
	}

	.icon-link.glassmorphism {
		background: none;
		border: none;
		color: white;
	}

	.icon-link.glassmorphism:hover {
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		transform: scale(1.03);
	}
</style>
