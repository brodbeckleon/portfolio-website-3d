<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Github, Instagram, Youtube, Linkedin, Share2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import type { WebEras } from '$lib/Types.ts';
	import { fade } from 'svelte/transition';

	interface SocialsProps {
		era: WebEras;
		isMobile: boolean;
	}

	let { era, isMobile }: SocialsProps = $props();

	let showSocialDropdown = $state(false);

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

	function toggleDropdown() {
		if (isMobile) {
			showSocialDropdown = !showSocialDropdown;
		}
	}

	onMount(() => {
		if (!browser) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			const socialContainer = document.querySelector('.socials-container');
			if (socialContainer && !socialContainer.contains(target) && showSocialDropdown) {
				showSocialDropdown = false;
			}
		};

		document.addEventListener('click', handleClickOutside);

		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="socials-container">
	{#if isMobile}
		<div class="mobile-socials">
            {#if showSocialDropdown}
                <div
                        class="mobile-social-dropdown-menu"
                        class:glassmorphism-container={era === 'glassmorphism'}
                >
                    {#each socialLinks as { icon: IconComponent, href, text } (href)}
                        <button
                                class="mobile-dropdown-item"
                                class:glassmorphism={era === 'glassmorphism'}
                                onclick={() => {
								goExternal(href);
								showSocialDropdown = false;
							}}
                                aria-label={m.open_link({ website_name: text })}
                        >
                            <IconComponent strokeWidth={1} class="dropdown-icon" />
                        </button>
                    {/each}
                </div>
            {/if}

			<button
				class="mobile-share-button"
                class:glassmorphism-container={era === 'glassmorphism'}
				onclick={toggleDropdown}
				aria-label={m.toggle_socials()}
				aria-expanded={showSocialDropdown}
			>
				<Share2 strokeWidth={1} />
			</button>
		</div>
	{:else}
		<!-- Desktop view -->
		<div
			class="social-icons"
            class:glassmorphism-container={era === 'glassmorphism'}
		>
			{#each socialLinks as { icon: IconComponent, href, text } (href)}
				<button
					class="icon-link"
					onclick={() => goExternal(href)}
					aria-label={m.open_link({ website_name: text })}
				>
					<IconComponent strokeWidth={1} />
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="css">
	/* Base styles */
	.icon-link {
		cursor: pointer;
		background: none;
		border: none;
        color: white;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

    .icon-link:hover {
        transform: scale(1.1);
    }

    .social-icons {
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 24px;
    }

	/** mobile **/
    @media (max-width: 768px) {
        .socials-container {
            position: relative;
            height: 48px;
        }

        .mobile-socials {
            position: relative;
            height: 100%;
            display: flex;
            justify-content: flex-end;
        }

        .mobile-social-dropdown-menu {
            position: absolute;
            width: 48px;
            bottom: 54px;
            left: 0;
            z-index: 10;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 12px 0;
            gap: 6px;

        }

        .mobile-dropdown-item {
            background: none;
            border: none;
            color: white;
        }

        .mobile-share-button {
            width: 48px;
            height: 48px;
            color: white;
            position: absolute;
            bottom: 0;
            left: 50%;
        }
    }
</style>
