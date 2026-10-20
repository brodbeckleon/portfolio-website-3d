<script lang="ts">
	import PhotographyView from '../../../components/photography/PhotographyView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- The same page as /photography, with the loupe already open: closing it
     lands on the contact sheets rather than an empty route. -->
<PhotographyView routeId={data.id} />
