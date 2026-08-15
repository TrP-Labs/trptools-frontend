<script lang="ts">
	import LegalDocument from '$lib/components/layout/LegalDocument.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<LegalDocument
	document={data.document}
	title="Terms"
	description="The terms under which this service is provided"
/>
