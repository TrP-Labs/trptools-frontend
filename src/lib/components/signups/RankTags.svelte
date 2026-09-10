<script lang="ts">
	import { IconPlus, IconUsers, IconX } from '@tabler/icons-svelte';
	import RankMenu from './RankMenu.svelte';
	import { withAlpha } from '$lib/utils/color';
	import type { PickableRank } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * The ranks allowed to fill something, as tags.
	 *
	 * Unordered, unlike the bot's language list this borrows its shape from:
	 * a rank either may sign up or may not, and there is no "first" for it to
	 * be. What the list does share is that it has to say what an *empty* one
	 * means, which here is everybody — so empty draws a tag of its own rather
	 * than nothing. A blank row would read as "nobody yet" and be wrong in the
	 * most expensive direction, quietly opening a sheet somebody thought they
	 * had locked down.
	 */
	interface Props {
		value: string[];
		/** Every rank bound in the group, highest first. */
		ranks: PickableRank[];
		disabled?: boolean;
		onchange: (rankIds: string[]) => void;
	}

	let { value, ranks, disabled = false, onchange }: Props = $props();

	// A rank unbound since the list was written has nothing to draw, and
	// showing its id would be worse than leaving it out; the API drops it on
	// the next save in any case.
	let chosen = $derived(
		value.map((id) => ranks.find((rank) => rank.id === id)).filter((rank) => rank !== undefined)
	);
</script>

<div class="flex flex-wrap items-center gap-2">
	{#if chosen.length === 0}
		<span
			class="flex items-center gap-1.5 rounded-lg border border-dashed border-border-strong
				px-2 py-1 text-sm text-text-muted"
		>
			<IconUsers size={14} />
			{m.signups_every_member()}
		</span>
	{/if}

	{#each chosen as rank (rank.id)}
		<span
			class="flex items-center gap-1.5 rounded-lg border py-1 pr-1 pl-2 text-sm text-text"
			style="border-color: {withAlpha(rank.color, 0.45)}; background: {withAlpha(rank.color, 0.12)}"
		>
			<span class="size-2 shrink-0 rounded-full" style="background: {rank.color}"></span>
			<span class="max-w-40 truncate">{rank.name}</span>

			<button
				type="button"
				{disabled}
				onclick={() => onchange(value.filter((id) => id !== rank.id))}
				title={m.signups_remove_rank({ rank: rank.name })}
				aria-label={m.signups_remove_rank({ rank: rank.name })}
				class="grid size-5 place-items-center rounded-md text-text-subtle transition-colors
					hover:bg-background hover:text-danger disabled:opacity-50"
			>
				<IconX size={13} />
			</button>
		</span>
	{/each}

	<RankMenu
		options={ranks}
		taken={value}
		label={m.signups_add_rank()}
		emptyLabel={m.signups_every_rank_added()}
		onpick={(rankId) => onchange([...value, rankId])}
	>
		{#snippet trigger({ open, toggle })}
			<button
				type="button"
				{disabled}
				aria-haspopup="menu"
				aria-expanded={open}
				onclick={toggle}
				class="flex items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-2
					py-1 text-sm text-text-muted transition-colors hover:border-accent hover:text-text
					disabled:opacity-50"
			>
				<IconPlus size={14} /> {m.signups_add_rank()}
			</button>
		{/snippet}
	</RankMenu>
</div>
