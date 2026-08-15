<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import type { LegalDocument } from '$lib/server/legal';

	interface Props {
		document: LegalDocument;
		/** Used when the markdown carries no `#` heading of its own. */
		title: string;
		description: string;
	}

	let { document, title, description }: Props = $props();

	let heading = $derived(document.title ?? title);
</script>

<svelte:head>
	<title>{heading} — TrP Tools</title>
	<meta name="description" content={description} />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-10">
	<PageHeader title={heading} {description} />

	<div class="space-y-6">
		{#each document.sections as section, index (index)}
			<Card title={section.title ?? undefined}>
				<!-- The markdown ships with the build from this repository, so it
				     is our own copy rather than anything a user supplied. -->
				<div class="markdown">{@html section.html}</div>
			</Card>
		{/each}
	</div>
</div>
