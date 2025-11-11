<script>
    import ThreePortfolio from "../components/ThreePortfolio.svelte";
</script>

<ThreePortfolio/>

<style lang="css">
    :global(body) {
        margin: 0;
        overflow: hidden;
        background-color: #0d0d0d;
    }

    :global(#svelte) {
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>