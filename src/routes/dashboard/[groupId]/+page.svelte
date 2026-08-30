<script lang="ts">
	import {
		IconBuildingWarehouse,
		IconCalendarTime,
		IconRoute,
		IconUsers
	} from '@tabler/icons-svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import { formatDateTime, formatNumber, formatRelative } from '$lib/utils/format';
	import { signupTotals } from '$lib/utils/signups';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let group = $derived(data.group);

	let stats = $derived([
		{ label: 'Routes', value: formatNumber(data.routes.length), icon: IconRoute },
		{ label: 'Shifts', value: formatNumber(data.shifts.length), icon: IconCalendarTime },
		{ label: 'Members', value: formatNumber(group.members), icon: IconUsers }
	]);
</script>

<div class="space-y-6">
	{#if data.openRoomId}
		<div
			class="flex flex-wrap items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3"
		>
			<span class="relative flex size-2.5">
				<span
					class="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75"
				></span>
				<span class="relative inline-flex size-2.5 rounded-full bg-success"></span>
			</span>
			<p class="flex-1 text-sm text-text">A dispatch room is open right now.</p>
			<Button size="sm" href="/dashboard/{group.slug}/dispatch">Join dispatch</Button>
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-3">
		{#each stats as stat (stat.label)}
			<div class="card flex items-center gap-3 p-4">
				<span class="grid size-10 place-items-center rounded-lg bg-background-muted text-accent">
					<stat.icon size={19} stroke={1.7} />
				</span>
				<div>
					<p class="text-xl font-semibold text-text tabular-nums">{stat.value}</p>
					<p class="text-xs text-text-muted">{stat.label}</p>
				</div>
			</div>
		{/each}
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card title="Next shifts" description="The next occurrences across every schedule.">
			{#snippet actions()}
				<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/shifts">Manage</Button>
			{/snippet}

			{#if data.upcoming.length === 0}
				<EmptyState title="Nothing scheduled" description="Create a shift to get started.">
					{#snippet icon()}<IconCalendarTime size={24} stroke={1.5} />{/snippet}
				</EmptyState>
			{:else}
				<ul class="space-y-3">
					{#each data.upcoming as occurrence (occurrence.eventId + occurrence.start)}
						{@const { filled, capacity } = signupTotals(occurrence.sheets)}
						<li class="flex items-start gap-3">
							<span
								class="mt-1 h-9 w-1 shrink-0 rounded-full"
								style="background: {occurrence.color}"
							></span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-text">{occurrence.name}</p>
								<p class="text-xs text-text-muted">
									{formatDateTime(occurrence.start)} · {formatRelative(occurrence.start)}
								</p>
							</div>
							{#if capacity > 0}
								<Badge tone={filled >= capacity ? 'success' : 'neutral'}>
									{filled}/{capacity}
								</Badge>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</Card>

		<Card title="Routes" description="What automatic dispatch can assign.">
			{#snippet actions()}
				{#if group.permissionLevel >= 3}
					<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/routes">Manage</Button>
				{/if}
			{/snippet}

			{#if data.routes.length === 0}
				<EmptyState title="No routes yet" description="Add routes so dispatch has something to assign.">
					{#snippet icon()}<IconRoute size={24} stroke={1.5} />{/snippet}
				</EmptyState>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#each data.routes as route (route.id)}
						<RouteBadge
							label={route.name}
							color={route.color}
							textColor={route.textColor}
							shape={route.shape}
							icon={route.icon}
							size="sm"
						/>
					{/each}
				</div>
			{/if}
		</Card>

		<Card title="Depots" description="Where vehicles spawn, and what dispatch matches them against.">
			{#snippet actions()}
				{#if group.permissionLevel >= 3}
					<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/depots">Manage</Button>
				{/if}
			{/snippet}

			{#if data.depots.length === 0}
				<EmptyState title="No depots" description="Automatic assignment needs depots to work.">
					{#snippet icon()}<IconBuildingWarehouse size={24} stroke={1.5} />{/snippet}
				</EmptyState>
			{:else}
				<ul class="flex flex-wrap gap-3">
					{#each data.depots as depot (depot.id)}
						<li class="flex min-w-0 max-w-full items-center gap-2">
							<DepotBadge
								number={depot.number}
								color={depot.color}
								icon={depot.icon}
								name={depot.name}
								size="sm"
							/>
							<span class="min-w-0 text-sm text-text-muted wrap-anywhere">{depot.name}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	</div>

	{#if group.permissionLevel >= 3 && !group.hasOpenCloudKey}
		<Card
			title="Connect an Open Cloud key"
			description="Roblox now requires authentication to read group membership."
		>
			{#snippet actions()}
				<Button size="sm" href="/dashboard/{group.slug}/settings">Set up</Button>
			{/snippet}

			<p class="text-sm text-text-muted">
				Without a key, TrP Tools falls back to slower endpoints that Roblox is retiring, and rank
				checks may become unreliable. Adding a key scoped to <code
					class="rounded bg-background-muted px-1 py-0.5 font-mono text-xs">group:read</code
				> keeps permissions accurate and raises the rate limit substantially.
			</p>
		</Card>
	{/if}
</div>
