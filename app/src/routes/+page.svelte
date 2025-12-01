<script>
	import ThreePortfolio from '../components/ThreePortfolio.svelte';
    import TitleBar from "../components/TitleBar.svelte";
</script>

<div class="layout">
    <div class="title-bar">
        <TitleBar liquidGlass={true} />
    </div>
    <div class="container">
        <ThreePortfolio/>
    </div>
</div>

<style lang="css">
	:global(body) {
		margin: 0;
		overflow: hidden;
	}

	:global(#svelte) {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

    .layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
    }

    .title-bar {
        position: fixed;
        top: 0;
        z-index: 1000;
        background: transparent;
        width: 100%;
        color: #fff;
        font-family: Impact, sans-serif;
        font-size: 2rem;
        opacity: 80%;
    }

    :global(main_title) {
        font-size: 2rem;
        font-family: Impact, sans-serif;

        /* make text look glassy */
        color: rgba(255,255,255,0.8);
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(10px) saturate(180%);
        -webkit-backdrop-filter: blur(10px) saturate(180%);
        padding: 0.2rem 0.5rem;
        border-radius: 0.5rem;
    }

    .container {
        flex: 1;
        overflow-y: hidden;
        margin: 0 auto;
        width: 100%;
        padding-bottom: 2rem;
        height: 100%;
    }
</style>
