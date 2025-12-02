<script lang="ts">
    import { Github, Instagram, Youtube, Linkedin } from '@lucide/svelte';

    const socialLinks = [
        { icon: Github, href: 'https://www.github.com/brodbeckleon' },
        { icon: Instagram, href: 'https://www.instagram.com/leon.brodbeck/' },
        { icon: Youtube, href: 'https://www.youtube.com/@leon.brodbeck' },
        { icon: Linkedin, href: 'https://www.linkedin.com/in/léon-shin-ichi-brodbeck-b71786240/' }
    ];

    function goExternal(url: string) {
        window.location.href = url;
    }
</script>

<div class="social-icons">
    {#each socialLinks as { icon, href } (href)}
        <button
                class="icon-link"
                on:click={() => goExternal(href)}
                aria-label="Open social link"
        >
            <svelte:component this={icon} />
        </button>
    {/each}
</div>
