<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		actions?: Snippet;
	}

	let { title, description, actions }: Props = $props();
</script>

<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div class="min-w-0">
		<h1 class="text-2xl font-semibold tracking-tight text-text">{title}</h1>
		{#if description}
			<p class="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>
		{/if}
	</div>

	{#if actions}
		<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
	{/if}
</header>
