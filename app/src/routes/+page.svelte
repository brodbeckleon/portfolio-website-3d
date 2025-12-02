<script>
	import ThreePortfolio from '../components/ThreePortfolio.svelte';
    import TitleBar from "../components/TitleBar.svelte";
</script>

<div class="home-page">
    <TitleBar era="liquid_glass" />
    <ThreePortfolio/>
</div>

<style lang="css">
	:global(body) {
		margin: 0;
		overflow: hidden;
	}

	:global(#svelte) {
		width: 100%;
		height: 100%;
	}
</style>
