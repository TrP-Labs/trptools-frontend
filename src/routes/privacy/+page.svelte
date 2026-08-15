<script lang="ts">
	import LegalDocument from '$lib/components/layout/LegalDocument.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<LegalDocument
	document={data.document}
	title="Privacy"
	description="How your data is used by the site operator"
/>
