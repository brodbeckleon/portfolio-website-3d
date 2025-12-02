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
	class:liquid-glass={era === 'liquid_glass'}
	class:early-web={era === 'early_web'}
	class:frutiger-aero={era === 'frutiger_aero'}
	class:modern-minimal={era === 'modern_minimal'}
>
	{#each socialLinks as { icon: IconComponent, href, text } (href)}
		<button
			class="icon-link"
			class:liquid-glass={era === 'liquid_glass'}
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

	/** liquid-glass styling **/
	.social-icons.liquid-glass {
		height: 2rem;
		width: fit-content;
		align-content: center;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(5px);
		-webkit-backdrop-filter: blur(5px);
		border-radius: 9999px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		padding-top: 0.5rem;
		padding-bottom: 0.2rem;
		padding-left: 1rem;
		padding-right: 1rem;
	}

	.icon-link.liquid-glass {
		background: none;
		border: none;
		color: white;
	}

	.icon-link.liquid-glass:hover {
		transform: scale(1.03);
	}
</style>
