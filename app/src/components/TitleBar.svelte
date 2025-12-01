<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import LanguageDropDown from './LanguageDropDown.svelte';
</script>

<div class="title-bar">
	<div class="title-bar_left">

    </div>
    <h1 class="main_title">
        {m.leon_shinichi()}
    </h1>
    <div class="title-bar_right">
        <LanguageDropDown />
    </div>
</div>

<style lang="css">
    .title-bar {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1rem;
        margin: 2rem auto;
    }

    .main_title {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
    }

	.title-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
    .title-bar_right {
        margin-right: 5vw;
    }
</style>
