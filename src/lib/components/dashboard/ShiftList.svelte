<script lang="ts">
	import { IconCheck } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatDateTime, formatRelative } from '$lib/utils/format';
	import type { DashboardShift } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';
	import { localizedGroup } from '$lib/utils/translations';

	interface Props {
		shifts: DashboardShift[];
		/** The soonest one already has a card of its own, so it is skipped. */
		skipFirst?: boolean;
	}

	let { shifts, skipFirst = false }: Props = $props();

	let visible = $derived(skipFirst ? shifts.slice(1) : shifts);
</script>

<ul class="space-y-2">
	{#each visible as shift (shift.groupId + shift.eventId + shift.start)}
		<li class="min-w-0">
			<a
				href="/g/{shift.groupSlug}/shift/{shift.slug}"
				class="flex items-center gap-3 rounded-lg border border-border-base bg-background-secondary p-3
					transition-colors hover:border-accent/50"
			>
				<span class="h-9 w-1 shrink-0 rounded-full" style="background: {shift.color}"></span>

				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-text">{localized(shift, 'name')}</p>
					<span class="mt-0.5 flex min-w-0 items-center gap-1.5">
						<Avatar src={shift.groupIcon} name={localizedGroup(shift)} size={14} />
						<span class="truncate text-xs text-text-muted">
							{localizedGroup(shift)} · {formatDateTime(shift.start)}
						</span>
					</span>
				</div>

				{#if shift.signedUp}
					<Badge tone="accent"><IconCheck size={12} /> {m.dashboard_shift_list_in()}</Badge>
				{/if}

				<span class="hidden shrink-0 text-xs text-text-subtle sm:block">
					{formatRelative(shift.start)}
				</span>
			</a>
		</li>
	{/each}
</ul>
