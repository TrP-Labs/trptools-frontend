<script lang="ts">
	import { IconChevronRight } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatRelative } from '$lib/utils/format';
	import type { PendingApplicant } from '$lib/api/types';
	import { localized } from '$lib/utils/translations';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * People waiting on a decision in one group, oldest first.
	 *
	 * A person per row rather than a form per row, which is what the home
	 * page's queue across every group shows: inside a single group the useful
	 * question is who is waiting and how long they have been, and the form
	 * they applied to is a label on that.
	 */
	interface Props {
		applicants: PendingApplicant[];
		groupSlug: string;
	}

	let { applicants, groupSlug }: Props = $props();
</script>

<ul class="space-y-2">
	{#each applicants as applicant (applicant.id)}
		<li class="min-w-0">
			<!--
				Straight to the applicants, not to the form's first section:
				the reason this row exists is that somebody is waiting.
			-->
			<a
				href="/dashboard/{groupSlug}/applications/{applicant.application.id}?section=applicants"
				class="flex items-center gap-3 rounded-lg border border-border-base bg-background-secondary p-3
					transition-colors hover:border-accent/50"
			>
				<span class="h-9 w-1 shrink-0 rounded-full" style="background: {applicant.application.color}"></span>

				<Avatar
					src={applicant.applicant.avatar}
					name={applicant.applicant.displayName ?? applicant.applicant.username}
					size={28}
				/>

				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-text">
						{applicant.applicant.displayName ??
							applicant.applicant.username ??
							m.dashboard_settings_removed_account()}
					</p>
					<p class="truncate text-xs text-text-muted">
						{localized(applicant.application, 'name')} · {formatRelative(applicant.submittedAt)}
					</p>
				</div>

				<!--
					Wrapped rather than given `hidden` directly: Badge's own
					`inline-flex` and a `hidden` passed in are the same
					specificity, so which one wins is down to stylesheet order.
				-->
				{#if applicant.application.rankName}
					<span class="hidden shrink-0 sm:flex">
						<Badge>{applicant.application.rankName}</Badge>
					</span>
				{/if}

				<IconChevronRight size={15} class="shrink-0 text-text-subtle" />
			</a>
		</li>
	{/each}
</ul>
