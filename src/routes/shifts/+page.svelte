<script lang="ts">
	import { IconCalendarTime } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatDateTime, formatRelative } from '$lib/utils/format';
	import { signupTotals } from '$lib/utils/signups';
	import { loginUrl } from '$lib/api/client';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	let { data }: PageProps = $props();

	/** Groups occurrences under a day heading. */
	let byDay = $derived.by(() => {
		const days = new Map<string, typeof data.occurrences>();

		for (const occurrence of data.occurrences) {
			const key = new Date(occurrence.start).toDateString();
			days.set(key, [...(days.get(key) ?? []), occurrence]);
		}

		return [...days.entries()];
	});
</script>

<svelte:head>
	<title>{m.shifts_shifts_trp_tools()}</title>
	<meta name="description" content={m.shifts_meta_description()} />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-10">
	<PageHeader title={m.common_shifts()} description={m.shifts_everything_scheduled_across_groups_are()} />

	{#if !data.signedIn}
		<EmptyState
			title={m.shifts_sign_see_shifts()}
			description={m.shifts_shifts_come_from_groups_roblox_account()}
		>
			{#snippet icon()}<IconCalendarTime size={28} stroke={1.5} />{/snippet}
			{#snippet action()}
				<Button href={loginUrl()} data-sveltekit-reload>{m.common_sign_with_roblox()}</Button>
			{/snippet}
		</EmptyState>
	{:else if data.occurrences.length === 0}
		<EmptyState
			title={m.common_nothing_scheduled()}
			description={data.groups.length === 0
				? m.shifts_are_not_member_any_group_trp()
				: m.shifts_no_shifts_are_coming_up_next()}
		>
			{#snippet icon()}<IconCalendarTime size={28} stroke={1.5} />{/snippet}
			{#snippet action()}
				<Button href="/groups" variant="secondary">{m.shifts_browse_groups()}</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="space-y-8">
			{#each byDay as [day, occurrences] (day)}
				<section>
					<h2 class="mb-3 text-sm font-semibold tracking-wide text-text-muted uppercase">
						{new Date(day).toLocaleDateString(undefined, {
							weekday: 'long',
							day: 'numeric',
							month: 'long'
						})}
					</h2>

					<ul class="space-y-2">
						{#each occurrences as occurrence (occurrence.eventId + occurrence.start)}
							{@const { filled, capacity } = signupTotals(occurrence.sheets)}
							<li>
								<a
									href="/dashboard/{occurrence.groupId}/shifts"
									class="card flex items-center gap-3 p-4 transition-colors hover:border-border-strong"
								>
									<span
										class="h-10 w-1 shrink-0 rounded-full"
										style="background: {occurrence.color}"
									></span>

									<div class="min-w-0 flex-1">
										<p class="truncate font-medium text-text">{localized(occurrence, 'name')}</p>
										<div class="mt-0.5 flex items-center gap-1.5">
											<Avatar src={occurrence.groupIcon} name={occurrence.groupName} size={14} />
											<span class="truncate text-xs text-text-muted">
												{occurrence.groupName} · {formatDateTime(occurrence.start)}
											</span>
										</div>
									</div>

									<div class="flex shrink-0 items-center gap-2">
										{#if capacity > 0}
											<Badge tone={filled >= capacity ? 'success' : 'neutral'}>
												{filled}/{capacity}
											</Badge>
										{/if}
										<span class="hidden text-xs text-text-subtle sm:block">
											{formatRelative(occurrence.start)}
										</span>
									</div>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
