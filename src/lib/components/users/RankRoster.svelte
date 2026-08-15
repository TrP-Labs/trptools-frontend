<script lang="ts">
	import Avatar from './Avatar.svelte';
	import { withAlpha } from '$lib/utils/color';
	import type { RosterEntry } from '$lib/api/types';

	interface Props {
		roster: RosterEntry[];
	}

	let { roster }: Props = $props();
</script>

<!--
	Ranks stack vertically, members scroll sideways within each one. A group with
	two hundred drivers should not push everything else off the page.
-->
<div class="space-y-5">
	{#each roster as rank (rank.rankId)}
		<section
			class="overflow-hidden rounded-xl border"
			style="border-color: {withAlpha(rank.color, 0.35)}; background: {withAlpha(rank.color, 0.06)}"
		>
			<header class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pt-3.5 pb-2">
				<span class="size-2.5 shrink-0 rounded-full" style="background: {rank.color}"></span>
				<h3 class="font-semibold text-text">{rank.name}</h3>
				<span class="text-xs text-text-subtle tabular-nums">
					{rank.memberCount}
					{rank.memberCount === 1 ? 'member' : 'members'}
				</span>

				{#if rank.description}
					<p class="w-full text-sm text-text-muted">{rank.description}</p>
				{/if}
			</header>

			{#if rank.members.length === 0}
				<p class="px-4 pb-4 text-sm text-text-subtle">Nobody holds this rank right now.</p>
			{:else}
				<ul
					class="flex snap-x gap-2 overflow-x-auto px-4 pt-1 pb-4"
					aria-label="{rank.name} members"
				>
					{#each rank.members as member (member.robloxId)}
						<li class="snap-start">
							<a
								href="https://www.roblox.com/users/{member.robloxId}/profile"
								target="_blank"
								rel="noopener noreferrer"
								class="flex w-24 flex-col items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-2
									transition-colors hover:border-border-base hover:bg-background-secondary"
							>
								<Avatar
									src={member.avatar}
									name={member.displayName ?? member.username}
									size={48}
								/>
								<span class="w-full truncate text-center text-xs font-medium text-text">
									{member.displayName ?? member.username ?? member.robloxId}
								</span>
								{#if member.username && member.username !== member.displayName}
									<span class="w-full truncate text-center text-[0.65rem] text-text-subtle">
										@{member.username}
									</span>
								{/if}
							</a>
						</li>
					{/each}

					{#if rank.memberCount > rank.members.length}
						<li class="flex w-24 shrink-0 items-center justify-center text-xs text-text-subtle">
							+{rank.memberCount - rank.members.length} more
						</li>
					{/if}
				</ul>
			{/if}
		</section>
	{/each}
</div>
