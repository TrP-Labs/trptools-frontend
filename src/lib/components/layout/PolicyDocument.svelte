<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import type { PolicyDocument } from '$lib/server/policies';

	interface Props {
		document: PolicyDocument;
		/** The file's name, used when the markdown carries no `#` heading. */
		title: string;
	}

	let { document, title }: Props = $props();

	let heading = $derived(document.title ?? title);
</script>

<svelte:head>
	<title>{heading} — TrP Tools</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-10">
	<PageHeader title={heading} />

	<div class="space-y-6">
		{#each document.sections as section, index (index)}
			<Card title={section.title ?? undefined}>
				<!-- The markdown comes from the operator's own policies directory,
				     not from anything a user of the site can supply. -->
				<div class="markdown">{@html section.html}</div>
			</Card>
		{/each}
	</div>
</div>
