<script lang="ts">
	import PageCounter from '$lib/components/users/PageCounter.svelte';
	import { afterNavigate } from '$app/navigation';
	import { announceDiscordResult } from '$lib/utils/discordLink';
	import { refreshData } from '$lib/utils/refresh';
	import { IconCalendarTime, IconClock, IconRepeat } from '@tabler/icons-svelte';
	import GroupCrumb from '$lib/components/layout/GroupCrumb.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import NotificationButton from '$lib/components/users/NotificationButton.svelte';
	import { formatDateTime, formatRelative } from '$lib/utils/format';
	import { withAlpha } from '$lib/utils/color';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let shift = $derived(data.shift);

	/**
	 * Coming back from connecting a Discord account lands on this page rather
	 * than on settings, so this is where the outcome is announced — and the
	 * sheets re-read, since a successful link is what turns their buttons back
	 * on. Here rather than inside `SignupSheets`, which is drawn once per
	 * occurrence: a toast per sheet block is a toast too many.
	 */
	afterNavigate(() => announceDiscordResult(() => void refreshData()));


	let hours = $derived(Math.floor(shift.duration / 60));
	let minutes = $derived(shift.duration % 60);
	let length = $derived(
		[hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}m` : ''].filter(Boolean).join(' ') || '0m'
	);
</script>
<PageCounter groupId={group.id} kind="shift_view" targetId={shift.eventId} />


<svelte:head>
	<title>{localized(shift, 'name')} — {localized(group, 'name')} — TrP Tools</title>
	<meta name="description" content={localized(shift, 'description') || m.g_shift_meta_description({ shift: localized(shift, 'name'), group: localized(group, 'name') })} />
	<meta property="og:title" content="{localized(shift, 'name')} — {localized(group, 'name')}" />
	<meta property="og:description" content={localized(shift, 'description') || m.g_shift_meta_description({ shift: localized(shift, 'name'), group: localized(group, 'name') })} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={group.icon ?? ''} />
</svelte:head>

<section
	class="border-b border-border-base"
	style="background: linear-gradient(180deg, {withAlpha(shift.color, 0.18)}, transparent);"
>
	<div class="mx-auto max-w-4xl px-4 py-8">
		<GroupCrumb {group} current={localized(shift, 'name')} />

		<div class="mt-5 flex flex-wrap items-start gap-5">
			<span class="h-16 w-1.5 shrink-0 rounded-full" style="background: {shift.color}"></span>

			<div class="min-w-0 flex-1">
				<h1 class="text-3xl font-semibold tracking-tight text-balance wrap-anywhere">{localized(shift, 'name')}</h1>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<Badge><IconRepeat size={13} /> {shift.recurrenceText}</Badge>
					<Badge><IconClock size={13} /> {length}</Badge>
				</div>
			</div>
		</div>
		<div data-page-actions class="mt-6 flex flex-wrap items-center gap-3 border-t border-border-base pt-4"><NotificationButton groupId={group.id} eventId={shift.eventId} userId={data.user?.userId} /></div>
	</div>
</section>

<div class="mx-auto max-w-4xl space-y-10 px-4 py-10">

	{#if localized(shift, 'description')}
		<section>
			<h2 class="mb-3 text-lg font-semibold">{m.g_shift_about_shift()}</h2>
			<p class="text-sm leading-relaxed whitespace-pre-line text-text-muted">{localized(shift, 'description')}</p>
		</section>
	{/if}

	<section>
		<h2 class="mb-3 text-lg font-semibold">{m.g_shift_next_occurrences()}</h2>

		{#if data.occurrences.length === 0}
			<EmptyState title={m.common_nothing_scheduled()} description={m.g_shift_no_occurrences_next_two_months()}>
				{#snippet icon()}<IconCalendarTime size={24} stroke={1.5} />{/snippet}
			</EmptyState>
		{:else}
			<ul class="space-y-2">
				{#each data.occurrences as occurrence (occurrence.start)}
					<li id={`occurrence-${new Date(occurrence.start).getTime()}`} class="card scroll-mt-20 flex flex-wrap items-center gap-3 p-4">
						<span class="h-8 w-1 shrink-0 rounded-full" style="background: {shift.color}"></span>
						<div class="min-w-0 flex-1">
							<a href="/g/{group.slug}/shift/{shift.slug}/{new Date(occurrence.start).getTime()}" class="font-medium text-text hover:text-accent">{formatDateTime(occurrence.start)}</a>
							<p class="text-xs text-text-subtle">{formatRelative(occurrence.start)}</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
