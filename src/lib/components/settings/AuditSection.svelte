<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatRelative } from '$lib/utils/format';
	import type { AuditEntry } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/** Administrative changes to the group, newest first. */
	interface Props {
		audit: AuditEntry[];
	}

	let { audit }: Props = $props();
</script>

<Card
	title={m.dashboard_settings_recent_activity()}
	description={m.dashboard_settings_administrative_changes_group()}
>
	{#if audit.length === 0}
		<p class="text-sm text-text-muted">{m.dashboard_settings_nothing_recorded_yet()}</p>
	{:else}
		<ul class="divide-y divide-border-base">
			{#each audit.slice(0, 50) as entry (entry.id)}
				<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
					<Avatar
						src={entry.actor?.avatar}
						name={entry.actor?.displayName ?? entry.actor?.username}
						size={22}
					/>
					<span class="text-sm font-medium text-text">
						{entry.actor?.displayName ??
							entry.actor?.username ??
							m.dashboard_settings_removed_account()}
					</span>
					<span class="min-w-0 flex-1 text-sm text-text-muted">{entry.summary}</span>
					<span class="shrink-0 text-xs text-text-subtle">{formatRelative(entry.date)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</Card>
