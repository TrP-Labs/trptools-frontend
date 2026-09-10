<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PickableRank } from '$lib/api/types';

	/**
	 * A list of the group's ranks to pick one from, drawn as a popover.
	 *
	 * The same shape as `i18n/LanguageMenu` and for the same reasons: a sheet
	 * carries one of these beside every slot, so it is a popover rather than a
	 * `<dialog>`, and it is a menu of actions rather than a listbox over one
	 * value. It is not that component because the two share no options, no
	 * decoration and no empty state — only a popover, which is nine lines.
	 */
	interface Props {
		/** Every rank bound in the group, highest first. */
		options: PickableRank[];
		/** Ranks already on the list, hidden rather than shown ticked. */
		taken?: readonly string[];
		label: string;
		emptyLabel: string;
		onpick: (rankId: string) => void;
		trigger: Snippet<[{ open: boolean; toggle: (event: MouseEvent) => void }]>;
	}

	let { options, taken = [], label, emptyLabel, onpick, trigger }: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);

	let choices = $derived(options.filter((rank) => !taken.includes(rank.id)));

	function toggle(event: MouseEvent) {
		// These sit inside cards and forms; opening one must not submit either.
		event.preventDefault();
		event.stopPropagation();
		open = !open;
	}
</script>

<svelte:window
	onpointerdown={(event) => {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}}
	onkeydown={(event) => {
		if (open && event.key === 'Escape') {
			event.stopPropagation();
			open = false;
		}
	}}
/>

<div bind:this={root} class="relative inline-block shrink-0">
	{@render trigger({ open, toggle })}

	{#if open}
		<div
			role="menu"
			aria-label={label}
			class="absolute left-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border
				border-border-base bg-background-secondary p-1 shadow-lg"
		>
			{#each choices as rank (rank.id)}
				<button
					type="button"
					role="menuitem"
					onclick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						open = false;
						onpick(rank.id);
					}}
					class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm
						text-text-muted transition-colors hover:bg-background-muted hover:text-text"
				>
					<span class="size-2.5 shrink-0 rounded-full" style="background: {rank.color}"></span>
					<span class="min-w-0 flex-1 truncate">{rank.name}</span>
					<span class="shrink-0 text-xs text-text-subtle">{rank.rank}</span>
				</button>
			{:else}
				<p class="px-2 py-1.5 text-sm text-text-subtle">{emptyLabel}</p>
			{/each}
		</div>
	{/if}
</div>
