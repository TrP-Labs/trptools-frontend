<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
	}

	let { title, description, icon, action }: Props = $props();
</script>

<div
	class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-base px-6 py-12 text-center"
>
	{#if icon}
		<div class="mb-3 text-text-subtle">{@render icon()}</div>
	{/if}

	<p class="text-sm font-medium text-text">{title}</p>

	{#if description}
		<p class="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
	{/if}

	{#if action}
		<div class="mt-4">{@render action()}</div>
	{/if}
</div>
