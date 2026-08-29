<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		onclick: () => void;
		tone?: 'default' | 'danger';
		/** Kept visible rather than hidden, so the menu says what it *could* do. */
		disabled?: boolean;
		title?: string;
		children: Snippet;
	}

	let { onclick, tone = 'default', disabled = false, title, children }: Props = $props();
</script>

<button
	type="button"
	role="menuitem"
	{onclick}
	{disabled}
	{title}
	class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors
		hover:bg-background-muted disabled:pointer-events-none disabled:opacity-40
		{tone === 'danger' ? 'text-danger' : 'text-text'}"
>
	{@render children()}
</button>
