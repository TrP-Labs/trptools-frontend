<script lang="ts">
	import { IconCalendarTime, IconClock, IconRepeat } from '@tabler/icons-svelte';
	import GroupCrumb from '$lib/components/layout/GroupCrumb.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { formatDateTime, formatRelative } from '$lib/utils/format';
	import { withAlpha } from '$lib/utils/color';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let shift = $derived(data.shift);

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
	{#if shift.description}
		<section>
			<h2 class="mb-3 text-lg font-semibold">About this shift</h2>
			<p class="text-sm leading-relaxed whitespace-pre-line text-text-muted">{shift.description}</p>
		</section>
	{/if}

	<section>
		<h2 class="mb-3 text-lg font-semibold">Next occurrences</h2>

		{#if data.occurrences.length === 0}
			<EmptyState title="Nothing scheduled" description="No occurrences in the next two months.">
				{#snippet icon()}<IconCalendarTime size={24} stroke={1.5} />{/snippet}
			</EmptyState>
		{:else}
			<ul class="space-y-3">
				{#each data.occurrences as occurrence (occurrence.start)}
					<li class="card flex flex-wrap items-center gap-3 p-4">
						<div class="min-w-0 flex-1">
							<p class="font-medium text-text">{formatDateTime(occurrence.start)}</p>
							<p class="text-xs text-text-subtle">{formatRelative(occurrence.start)}</p>
						</div>

						{#if occurrence.capacity > 0}
							<div class="w-44 shrink-0">
								<div class="h-1.5 overflow-hidden rounded-full bg-background-muted">
									<div
										class="h-full rounded-full transition-[width]"
										style="width: {Math.min(
											100,
											(occurrence.filled / occurrence.capacity) * 100
										)}%; background: {shift.color}"
									></div>
								</div>
								<p class="mt-1 text-right text-xs text-text-subtle">
									{occurrence.filled} of {occurrence.capacity} slots filled
								</p>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<p class="text-sm text-text-muted">
		Signing up happens in the
		<a href="/shifts" class="text-accent hover:underline">shifts area</a> once you are signed in.
	</p>
</div>
