<script lang="ts">
	/**
	 * The people one manager tab suggests moving, with the button that does it.
	 *
	 * A suggestion, never an action on its own: without the Roblox write
	 * connection — or the grant to use it — the same list is drawn with a
	 * badge where the button would be.
	 */
	import { IconArrowDown, IconArrowUp } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatNumber } from '$lib/utils/format';
	import type { AttendanceStanding } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		people: AttendanceStanding[];
		/** Whether the buttons can be pressed: the grant and a live connection. */
		ready: boolean;
		/** Whose change is in flight. */
		busy: string | null;
		/** A period is loading; nothing on screen is current enough to act on. */
		disabled?: boolean;
		onapply: (person: AttendanceStanding) => void;
	}

	let { people, ready, busy, disabled = false, onapply }: Props = $props();

	function bounds(person: AttendanceStanding) {
		const parts = [];
		if (person.minPoints !== null) parts.push(m.promotions_min({ points: formatNumber(person.minPoints) }));
		if (person.maxPoints !== null) parts.push(m.promotions_max({ points: formatNumber(person.maxPoints) }));
		return parts.join(' · ');
	}
</script>

<ul class="space-y-2" data-testid="standings">
	{#each people as person (person.robloxId)}
		<li
			class="card flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 p-3.5
				{person.verdict === 'PROMOTE' ? 'border-success/40' : 'border-danger/40'}"
			data-verdict={person.verdict ?? 'NONE'}
		>
			<div class="flex min-w-0 flex-1 basis-56 items-center gap-3">
				<Avatar src={person.avatar} name={person.name} size={36} />
				<div class="min-w-0">
					<a
						href="https://www.roblox.com/users/{person.robloxId}/profile"
						class="block truncate font-medium text-text hover:underline">{person.name}</a
					>
					<p class="flex items-center gap-1.5 text-xs text-text-muted">
						<span class="size-2 shrink-0 rounded-full" style="background: {person.rankColor}"></span>
						<span class="truncate">{person.rankName}</span>
					</p>
				</div>
			</div>

			<div class="w-48 shrink-0">
				<p class="font-mono text-lg font-semibold text-text tabular-nums">
					{m.promotions_points({ points: formatNumber(person.points) })}
				</p>
				<p class="text-xs text-text-muted">
					{m.promotions_shifts({ count: person.shifts })}{#if bounds(person)}{' · '}{bounds(person)}{/if}
				</p>
			</div>

			<!-- Shrinks rather than widening the card: rank names are the group's and can be long (trap 19). -->
			<div class="flex max-w-full min-w-0 items-center gap-2 sm:ml-auto">
				{#if person.targetRankName}
					{#if ready}
						<Button
							size="sm"
							variant={person.verdict === 'PROMOTE' ? 'primary' : 'danger'}
							class="max-w-full {person.verdict === 'PROMOTE' ? 'promote' : ''}"
							loading={busy === person.robloxId}
							disabled={busy !== null || disabled}
							onclick={() => onapply(person)}
						>
							{#if person.verdict === 'PROMOTE'}<IconArrowUp size={15} class="shrink-0" /><span class="truncate">{m.promotions_promote_to({ rank: person.targetRankName })}</span>{:else}<IconArrowDown size={15} class="shrink-0" /><span class="truncate">{m.promotions_demote_to({ rank: person.targetRankName })}</span>{/if}
						</Button>
					{:else}
						<Badge tone={person.verdict === 'PROMOTE' ? 'success' : 'danger'} class="max-w-full">
							<span class="truncate">
								{person.verdict === 'PROMOTE'
									? m.promotions_suggest_promote({ rank: person.targetRankName })
									: m.promotions_suggest_demote({ rank: person.targetRankName })}
							</span>
						</Badge>
					{/if}
				{/if}
			</div>
		</li>
	{/each}
</ul>

<style>
	/* The green button: a promotion is the good news on this page. */
	:global(.promote) {
		background: var(--color-success) !important;
		color: var(--color-accent-contrast) !important;
	}
</style>
