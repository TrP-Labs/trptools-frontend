<script lang="ts">
	import PolicyDocument from '$lib/components/layout/PolicyDocument.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PolicyDocument document={data.document} title={data.label} />
