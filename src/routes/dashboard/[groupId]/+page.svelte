<script lang="ts">
	import {
		IconBuildingWarehouse,
		IconCalendarTime,
		IconClipboardText,
		IconRoute,
		IconUsers
	} from '@tabler/icons-svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import GroupApplicants from '$lib/components/dashboard/GroupApplicants.svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import { can, PERM } from '$lib/utils/permissions';
	import { formatDateTime, formatNumber, formatRelative } from '$lib/utils/format';
	import { signupTotals } from '$lib/utils/signups';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	let { data }: PageProps = $props();

	let group = $derived(data.group);

	let reviewer = $derived(can(group.permissions, PERM.REVIEW_APPLICATIONS));

	// The applicant count earns a tile of its own for whoever can act on it —
	// somebody waiting is the one number on this page that is a task.
	let stats = $derived([
		{ label: m.common_routes(), value: formatNumber(data.routes.length), icon: IconRoute },
		{ label: m.common_shifts(), value: formatNumber(data.shifts.length), icon: IconCalendarTime },
		...(reviewer
			? [
					{
						label: m.dashboard_applicants_waiting(),
						value: formatNumber(data.applicants.length),
						icon: IconClipboardText
					}
				]
			: []),
		{ label: m.dashboard_members(), value: formatNumber(group.members), icon: IconUsers }
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
			<p class="flex-1 text-sm text-text">{m.dashboard_dispatch_room_open_right_now()}</p>
			<Button size="sm" href="/dashboard/{group.slug}/dispatch">{m.dashboard_join_dispatch()}</Button>
		</div>
	{/if}

	<!--
		Literal class names, both of them: Tailwind reads the source for the
		classes it emits, so a column count built from a variable produces no
		CSS at all and the row silently collapses to one column.
	-->
	<div class="grid gap-4 sm:grid-cols-2 {stats.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}">
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

	<!--
		`min-w-0` on every card, because a grid item's automatic minimum is its
		content's min-content width — and a truncating line of text still
		reports the full width of the string it is truncating. Without it one
		long application name pushes the whole page sideways on a phone.
	-->
	<div class="grid gap-6 lg:grid-cols-2">
		{#if reviewer}
			<Card
				class="min-w-0"
				title={m.common_applications()}
				description={m.dashboard_who_is_waiting_on_decision()}
			>
				{#snippet actions()}
					<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/applications">
						{m.common_manage()}
					</Button>
				{/snippet}

				{#if data.applicants.length === 0}
					<EmptyState
						title={m.dashboard_nobody_waiting()}
						description={m.dashboard_applications_people_send_show_here()}
					>
						{#snippet icon()}<IconClipboardText size={24} stroke={1.5} />{/snippet}
					</EmptyState>
				{:else}
					<GroupApplicants applicants={data.applicants} groupSlug={group.slug} />
				{/if}
			</Card>
		{/if}

		<Card
			class="min-w-0"
			title={m.dashboard_next_shifts()}
			description={m.dashboard_next_occurrences_across_every_schedule()}
		>
			{#snippet actions()}
				<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/shifts">{m.common_manage()}</Button>
			{/snippet}

			{#if data.upcoming.length === 0}
				<EmptyState title={m.common_nothing_scheduled()} description={m.dashboard_create_shift_get_started()}>
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
								<p class="truncate text-sm font-medium text-text">{localized(occurrence, 'name')}</p>
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

		<Card
			class="min-w-0"
			title={m.common_routes()}
			description={m.dashboard_what_automatic_dispatch_can_assign()}
		>
			{#snippet actions()}
				{#if can(group.permissions, PERM.MANAGE_ROUTES)}
					<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/routes">{m.common_manage()}</Button>
				{/if}
			{/snippet}

			{#if data.routes.length === 0}
				<EmptyState title={m.dashboard_no_routes_yet()} description={m.dashboard_add_routes_so_dispatch_has_something()}>
					{#snippet icon()}<IconRoute size={24} stroke={1.5} />{/snippet}
				</EmptyState>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#each data.routes as route (route.id)}
						<RouteBadge
							label={localized(route, 'name')}
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

		<Card
			class="min-w-0"
			title={m.common_depots()}
			description={m.dashboard_where_vehicles_spawn_what_dispatch_matches()}
		>
			{#snippet actions()}
				{#if can(group.permissions, PERM.MANAGE_DEPOTS)}
					<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/depots">{m.common_manage()}</Button>
				{/if}
			{/snippet}

			{#if data.depots.length === 0}
				<EmptyState title={m.dashboard_no_depots()} description={m.dashboard_automatic_assignment_needs_depots_work()}>
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
								name={localized(depot, 'name')}
								size="sm"
							/>
							<span class="min-w-0 text-sm text-text-muted wrap-anywhere">{localized(depot, 'name')}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	</div>

	{#if can(group.permissions, PERM.MANAGE_OPEN_CLOUD) && !group.hasOpenCloudKey}
		<Card
			title={m.dashboard_connect_open_cloud_key()}
			description={m.dashboard_roblox_now_requires_authentication_read_group()}
		>
			{#snippet actions()}
				<Button size="sm" href="/dashboard/{group.slug}/settings">{m.dashboard_set_up()}</Button>
			{/snippet}

			<p class="text-sm text-text-muted">
				{m.dashboard_without_key_trp_tools_falls_back()} <code
					class="rounded bg-background-muted px-1 py-0.5 font-mono text-xs">{m.dashboard_group_read()}</code
				> {m.dashboard_keeps_permissions_accurate_raises_rate_limit()}
			</p>
		</Card>
	{/if}
</div>
