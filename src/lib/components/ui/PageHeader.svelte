<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		/** Status alongside the title — what this page *is* right now. */
		meta?: Snippet;
		/** Things to press, kept apart from status on the far side. */
		actions?: Snippet;
	}

	let { title, description, meta, actions }: Props = $props();
</script>

<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div class="min-w-0">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<h1 class="text-2xl font-semibold tracking-tight text-text">{title}</h1>
			{#if meta}
				<div class="flex flex-wrap items-center gap-2">{@render meta()}</div>
			{/if}
		</div>
		{#if description}
			<p class="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>
		{/if}
	</div>

	{#if actions}
		<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
	{/if}
</header>
