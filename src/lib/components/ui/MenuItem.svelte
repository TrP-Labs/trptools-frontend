<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		onclick: () => void;
		tone?: 'default' | 'danger';
		children: Snippet;
	}

	let { onclick, tone = 'default', children }: Props = $props();
</script>

<button
	type="button"
	role="menuitem"
	{onclick}
	class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors
		hover:bg-background-muted
		{tone === 'danger' ? 'text-danger' : 'text-text'}"
>
	{@render children()}
</button>
