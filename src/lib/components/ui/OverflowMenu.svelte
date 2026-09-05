<script lang="ts">
	import { IconDots } from '@tabler/icons-svelte';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		label?: string;
		/** Menu items, rendered as buttons by the caller. */
		children: Snippet<[() => void]>;
		class?: string;
	}

	let { label = m.common_more_actions(), children, class: className = '' }: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);

	function close() {
		open = false;
	}

	/**
	 * A popover, not a dialog: it must not blur the page behind it, and a
	 * group page can carry dozens of these at once.
	 */
	function onWindowPointerDown(event: PointerEvent) {
		if (!open) return;
		if (root && !root.contains(event.target as Node)) close();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.stopPropagation();
			close();
		}
	}
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeydown} />

<div bind:this={root} class="relative shrink-0 {className}">
	<button
		type="button"
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={open}
		title={label}
		onclick={(event) => {
			// Cards are links; opening their menu must not follow them.
			event.preventDefault();
			event.stopPropagation();
			open = !open;
		}}
		class="grid size-7 place-items-center rounded-md text-text-subtle transition-colors
			hover:bg-background-muted hover:text-text focus-visible:bg-background-muted focus-visible:text-text"
	>
		<IconDots size={16} />
	</button>

	{#if open}
		<div
			role="menu"
			tabindex="-1"
			class="absolute right-0 z-30 mt-1 min-w-44 overflow-hidden rounded-lg border border-border-base
				bg-background-secondary py-1 shadow-lg"
		>
			{@render children(close)}
		</div>
	{/if}
</div>
