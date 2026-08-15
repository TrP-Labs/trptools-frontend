<script lang="ts">
	import { IconCalendarTime } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatDateTime, formatRelative } from '$lib/utils/format';
	import { loginUrl } from '$lib/api/client';
	import type { PageProps } from './$types';

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
	<title>Shifts — TrP Tools</title>
	<meta name="description" content="Upcoming shifts across your groups." />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-10">
	<PageHeader title="Shifts" description="Everything scheduled across the groups you are in." />

	{#if !data.signedIn}
		<EmptyState
			title="Sign in to see your shifts"
			description="Your shifts come from the groups your Roblox account belongs to."
		>
			{#snippet icon()}<IconCalendarTime size={28} stroke={1.5} />{/snippet}
			{#snippet action()}
				<Button href={loginUrl()} data-sveltekit-reload>Sign in with Roblox</Button>
			{/snippet}
		</EmptyState>
	{:else if data.occurrences.length === 0}
		<EmptyState
			title="Nothing scheduled"
			description={data.groups.length === 0
				? 'You are not a member of any group on TrP Tools yet.'
				: 'No shifts are coming up in the next month.'}
		>
			{#snippet icon()}<IconCalendarTime size={28} stroke={1.5} />{/snippet}
			{#snippet action()}
				<Button href="/groups" variant="secondary">Browse groups</Button>
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
							{@const filled = occurrence.slots.reduce((n, slot) => n + slot.signups.length, 0)}
							{@const capacity = occurrence.slots.reduce((n, slot) => n + slot.capacity, 0)}
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
										<p class="truncate font-medium text-text">{occurrence.name}</p>
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
