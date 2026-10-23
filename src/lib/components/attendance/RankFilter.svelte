<script lang="ts">
	/**
	 * Which ranks the activity sheet and the two managers show.
	 *
	 * Nothing ticked means every rank, the same as an empty rank list on a
	 * sign-up sheet (§6.1): a filter that started by listing every rank would
	 * quietly hide each rank bound after the page loaded. A popover rather
	 * than a dialog, as `ui/OverflowMenu` is, and the reference for it.
	 */
	import { IconCheck, IconChevronDown, IconFilter } from '@tabler/icons-svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Rank {
		id: string;
		name: string;
		color: string;
	}

	let {
		ranks,
		selected = $bindable([]),
		disabled = false
	}: { ranks: Rank[]; selected: string[]; disabled?: boolean } = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);

	let summary = $derived(
		selected.length === 0
			? m.attendance_ranks_all()
			: selected.length === 1
				? (ranks.find((rank) => rank.id === selected[0])?.name ?? m.attendance_ranks_all())
				: m.attendance_ranks_some({ count: selected.length })
	);

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
	}
</script>

<svelte:window
	onpointerdown={(event) => open && root && !root.contains(event.target as Node) && (open = false)}
	onkeydown={(event) => {
		if (open && event.key === 'Escape') {
			event.stopPropagation();
			open = false;
		}
	}}
/>

<div bind:this={root} class="relative">
	<button
		type="button"
		aria-haspopup="true"
		aria-expanded={open}
		{disabled}
		data-testid="rank-filter"
		onclick={() => (open = !open)}
		class="flex items-center gap-2 rounded-lg border bg-surface px-3 py-1.5 text-sm transition-colors disabled:cursor-wait disabled:opacity-50
			{selected.length ? 'border-accent text-text' : 'border-border-base text-text-muted hover:text-text'}"
	>
		<IconFilter size={15} />
		<span class="max-w-40 truncate">{summary}</span>
		<IconChevronDown size={14} />
	</button>

	{#if open}
		<div
			class="absolute left-0 z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border-base bg-background-secondary shadow-lg"
		>
			<button
				type="button"
				class="flex w-full items-center gap-2 border-b border-border-base px-3 py-2 text-left text-sm text-text-muted hover:bg-background-muted hover:text-text disabled:opacity-50"
				disabled={selected.length === 0}
				onclick={() => (selected = [])}
			>
				{m.attendance_ranks_clear()}
			</button>
			<ul class="max-h-72 overflow-y-auto py-1" role="listbox" aria-multiselectable="true" aria-label={m.common_ranks()}>
				{#each ranks as rank (rank.id)}
					{@const on = selected.includes(rank.id)}
					<li role="option" aria-selected={on}>
						<button
							type="button"
							class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-text hover:bg-background-muted"
							onclick={() => toggle(rank.id)}
						>
							<span
								class="grid size-4 shrink-0 place-items-center rounded border
									{on ? 'border-accent bg-accent text-accent-contrast' : 'border-border-strong'}"
							>
								{#if on}<IconCheck size={12} stroke={3} />{/if}
							</span>
							<span class="size-2 shrink-0 rounded-full" style="background: {rank.color}"></span>
							<span class="min-w-0 truncate">{rank.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
