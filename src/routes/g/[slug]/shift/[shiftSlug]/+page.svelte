<script lang="ts">
	import { IconCalendarTime, IconClock, IconRepeat } from '@tabler/icons-svelte';
	import GroupCrumb from '$lib/components/layout/GroupCrumb.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import SignupSheets from '$lib/components/shifts/SignupSheets.svelte';
	import { formatDateTime, formatRelative } from '$lib/utils/format';
	import { signupTotals } from '$lib/utils/signups';
	import { withAlpha } from '$lib/utils/color';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let shift = $derived(data.shift);

	/**
	 * Occurrences whose sign-up window is open and that carry a sheet this
	 * viewer's rank reaches. The API decides both, so an empty list means
	 * there is genuinely nothing here for them.
	 */
	let openSignups = $derived(
		data.signupOccurrences.filter(
			(occurrence) => occurrence.signupsOpen && occurrence.sheets.length > 0
		)
	);

	/**
	 * When the next window opens, for somebody who has a sheet but is early.
	 *
	 * Null when they have no sheets at all — in which case the page says
	 * nothing rather than advertising a form they will never be shown.
	 */
	let nextSignupOpening = $derived.by(() => {
		if (openSignups.length > 0) return null;
		if (!data.hasAnySheet) return null;

		const upcoming = data.signupOccurrences
			.filter((occurrence) => !occurrence.signupsOpen)
			.map((occurrence) => new Date(occurrence.signupsOpenAt))
			.filter((when) => when.getTime() > Date.now())
			.sort((a, b) => a.getTime() - b.getTime());

		return upcoming[0] ?? null;
	});

	let hours = $derived(Math.floor(shift.duration / 60));
	let minutes = $derived(shift.duration % 60);
	let length = $derived(
		[hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}m` : ''].filter(Boolean).join(' ') || '0m'
	);
</script>

<svelte:head>
	<title>{shift.name} — {group.name} — TrP Tools</title>
	<meta name="description" content={shift.description || `${shift.name} on ${group.name}.`} />
	<meta property="og:title" content="{shift.name} — {group.name}" />
	<meta property="og:description" content={shift.description || `${shift.name} on ${group.name}.`} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={group.icon ?? ''} />
</svelte:head>

<section
	class="border-b border-border-base"
	style="background: linear-gradient(180deg, {withAlpha(shift.color, 0.18)}, transparent);"
>
	<div class="mx-auto max-w-4xl px-4 py-8">
		<GroupCrumb {group} current={shift.name} />

		<div class="mt-5 flex flex-wrap items-start gap-5">
			<span class="h-16 w-1.5 shrink-0 rounded-full" style="background: {shift.color}"></span>

			<div class="min-w-0 flex-1">
				<h1 class="text-3xl font-semibold tracking-tight text-balance">{shift.name}</h1>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<Badge><IconRepeat size={13} /> {shift.recurrenceText}</Badge>
					<Badge><IconClock size={13} /> {length}</Badge>
				</div>
			</div>
		</div>
	</div>
</section>

<div class="mx-auto max-w-4xl space-y-10 px-4 py-10">
	<!--
		Sign-ups come first.

		They are the only thing on this page anybody has to act on, and they are
		only here at all for the handful of people whose rank carries a sheet —
		so burying them under the recurrence blurb made the one actionable part
		of the page the last thing you reach.
	-->
	{#if openSignups.length > 0}
		<section>
			<h2 class="mb-3 text-lg font-semibold">{m.g_shift_sign_up()}</h2>

			<ul class="space-y-4">
				{#each openSignups as occurrence (occurrence.start)}
					{@const totals = signupTotals(occurrence.sheets)}
					<li class="card overflow-hidden">
						<div class="flex flex-wrap items-center gap-3 p-4">
							<span class="h-8 w-1 shrink-0 rounded-full" style="background: {shift.color}"></span>
							<div class="min-w-0 flex-1">
								<p class="font-medium text-text">{formatDateTime(occurrence.start)}</p>
								<p class="text-xs text-text-subtle">{formatRelative(occurrence.start)}</p>
							</div>

							{#if totals.capacity > 0}
								<Badge tone={totals.filled >= totals.capacity ? 'success' : 'neutral'}>
									{totals.filled}/{totals.capacity} signed up
								</Badge>
							{/if}
						</div>

						<div class="border-t border-border-base bg-background-secondary/40 p-4">
							<SignupSheets
								sheets={occurrence.sheets}
								eventId={shift.eventId}
								occurrence={occurrence.start}
								userId={data.user?.userId}
							/>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{:else if nextSignupOpening}
		<!-- Only shown to somebody who actually has a sheet coming. -->
		<section class="card flex flex-wrap items-center gap-3 p-4">
			<IconClock size={18} class="shrink-0 text-text-subtle" />
			<p class="text-sm text-text-muted">
				Sign-ups for the next one open {formatRelative(nextSignupOpening)}.
			</p>
		</section>
	{/if}

	{#if shift.description}
		<section>
			<h2 class="mb-3 text-lg font-semibold">{m.g_shift_about_shift()}</h2>
			<p class="text-sm leading-relaxed whitespace-pre-line text-text-muted">{shift.description}</p>
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
					<li class="card flex flex-wrap items-center gap-3 p-4">
						<span class="h-8 w-1 shrink-0 rounded-full" style="background: {shift.color}"></span>
						<div class="min-w-0 flex-1">
							<p class="font-medium text-text">{formatDateTime(occurrence.start)}</p>
							<p class="text-xs text-text-subtle">{formatRelative(occurrence.start)}</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
