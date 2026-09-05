<script lang="ts">
	import { IconChevronRight } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import type { DashboardReview } from '$lib/api/types';
	import { localizedGroup } from '$lib/utils/translations';

	interface Props {
		reviews: DashboardReview[];
	}

	let { reviews }: Props = $props();
</script>

<ul class="space-y-2">
	{#each reviews as review (review.applicationId)}
		<li class="min-w-0">
			<!--
				Straight to the applicants, not to the form's first section:
				the reason this row exists is that somebody is waiting.
			-->
			<a
				href="/dashboard/{review.groupSlug}/applications/{review.applicationId}?section=applicants"
				class="flex items-center gap-3 rounded-lg border border-border-base bg-background-secondary p-3
					transition-colors hover:border-accent/50"
			>
				<span class="h-9 w-1 shrink-0 rounded-full" style="background: {review.color}"></span>

				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-text">{review.name}</p>
					<span class="mt-0.5 flex min-w-0 items-center gap-1.5">
						<Avatar src={review.groupIcon} name={localizedGroup(review)} size={14} />
						<span class="truncate text-xs text-text-muted">{localizedGroup(review)}</span>
					</span>
				</div>

				<Badge tone="warning">{review.pendingCount}</Badge>
				<IconChevronRight size={15} class="shrink-0 text-text-subtle" />
			</a>
		</li>
	{/each}
</ul>
