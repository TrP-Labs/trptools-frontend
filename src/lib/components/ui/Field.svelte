<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		hint?: string;
		error?: string;
		for?: string;
		class?: string;
		children: Snippet;
	}

	let { label, hint, error, for: forId, class: className = '', children }: Props = $props();
</script>

<div class="flex flex-col gap-1.5 {className}">
	<label
		for={forId}
		class="text-xs font-semibold tracking-wide text-text-muted uppercase select-none"
	>
		{label}
	</label>

	{@render children()}

	{#if error}
		<p class="text-xs text-danger">{error}</p>
	{:else if hint}
		<p class="text-xs text-text-subtle">{hint}</p>
	{/if}
</div>
