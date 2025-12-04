<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Github, Instagram, Youtube, Linkedin, Share2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import type { WebEras } from '$lib/Types.ts';

	interface SocialsProps {
		era: WebEras;
	}

	let { era }: SocialsProps = $props();

	let expanded = $state(false);
	let isMobile = $state(false);

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
		if (browser) {
			window.location.href = url;
		}
	}

	function checkIfMobile() {
		if (browser) {
			isMobile = window.innerWidth <= 768;
		}
	}

	function toggleExpanded() {
		if (isMobile) {
			expanded = !expanded;
		}
	}

	onMount(() => {
		if (!browser) return;

		checkIfMobile();

		window.addEventListener('resize', checkIfMobile);

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			const socialContainer = document.querySelector('.social-container');
			if (socialContainer && !socialContainer.contains(target) && expanded) {
				expanded = false;
			}
		};

		document.addEventListener('click', handleClickOutside);

		return () => {
			window.removeEventListener('resize', checkIfMobile);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="social-container">
	<div class="button-container">
		{#if isMobile}
			<button
				class="share-button"
				class:glassmorphism={era === 'glassmorphism'}
				class:early-web={era === 'early_web'}
				class:frutiger-aero={era === 'frutiger_aero'}
				class:modern-minimal={era === 'modern_minimal'}
				onclick={toggleExpanded}
				aria-label={m.toggle_socials()}
				aria-expanded={expanded}
			>
				<Share2 strokeWidth={1} />
			</button>
		{/if}

		<!-- Social icons that slide up on mobile -->
		<div
			class="social-icons-wrapper"
			class:expanded={expanded || !isMobile}
			class:vertical={isMobile && expanded}
		>
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
		</div>
	</div>
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
