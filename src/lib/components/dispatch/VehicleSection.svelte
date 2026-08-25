<script lang="ts">
	/**
	 * One collapsible list of vehicles.
	 *
	 * A shift with sixty vehicles is mostly vehicles a given dispatcher is not
	 * dealing with right now, so every list folds away. The heading stays put
	 * when it does — a collapsed list still says how many are in it, or the
	 * board would quietly appear to have lost them.
	 */
	import { IconChevronRight } from '@tabler/icons-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		count: number;
		open: boolean;
		/** The digit that jumps to this list. */
		shortcut: number;
		ontoggle: () => void;
		children: Snippet;
	}

	let { label, count, open, shortcut, ontoggle, children }: Props = $props();

	const contentId = $props.id();
</script>

<section>
	<h2 class="mb-2">
		<button
			type="button"
			onclick={ontoggle}
			aria-expanded={open}
			aria-controls={contentId}
			class="group flex w-full items-center gap-2 rounded-md py-0.5 text-left text-sm font-semibold
				text-text transition-colors hover:text-accent"
		>
			<IconChevronRight
				size={15}
				class="shrink-0 text-text-subtle transition-transform {open ? 'rotate-90' : ''}"
			/>
			{label}
			<span class="text-xs font-normal text-text-subtle">{count}</span>

			<kbd
				class="ml-auto rounded border border-border-base px-1 text-[0.65rem] font-normal
					text-text-subtle opacity-0 transition-opacity group-hover:opacity-100
					group-focus-visible:opacity-100"
			>
				{shortcut}
			</kbd>
		</button>
	</h2>

	<div id={contentId} hidden={!open}>
		{#if open}
			<div class="card divide-y divide-border-base p-1">
				{@render children()}
			</div>
		{/if}
	</div>
</section>
