<script lang="ts">
	import {
		IconBuildingWarehouse,
		IconCalendarTime,
		IconChevronDown,
		IconChevronRight,
		IconChevronUp,
		IconExternalLink,
		IconFlag,
		IconLink,
		IconRoute,
		IconUsers
	} from '@tabler/icons-svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import RankRoster from '$lib/components/users/RankRoster.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import MenuItem from '$lib/components/ui/MenuItem.svelte';
	import ReportButton from '$lib/components/moderation/ReportButton.svelte';
	import { reportDialog } from '$lib/stores/report.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatDateTime, formatNumber, formatRelative } from '$lib/utils/format';
	import { withAlpha } from '$lib/utils/color';
	import type { ReportTarget } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let group = $derived(data.group);

	/**
	 * A group page opens as a summary, not a catalogue.
	 *
	 * Groups that run thirty routes would otherwise push their depots, staff
	 * and shifts several screens down. The first few are enough to show what a
	 * group is, and the rest are one button away. Depots are capped tighter
	 * because they stack one per row rather than two across.
	 */
	const ROUTE_PREVIEW = 4;
	const DEPOT_PREVIEW = 2;

	let allRoutes = $state(false);
	let allDepots = $state(false);

	let visibleRoutes = $derived(allRoutes ? group.routes : group.routes.slice(0, ROUTE_PREVIEW));
	let visibleDepots = $derived(allDepots ? group.depots : group.depots.slice(0, DEPOT_PREVIEW));

	async function copyLink(path: string) {
		try {
			await navigator.clipboard.writeText(new URL(path, location.origin).toString());
			toasts.success('Link copied');
		} catch {
			toasts.error('Could not copy that link');
		}
	}

	function report(targetType: ReportTarget, targetId: string, label: string) {
		reportDialog.open({ targetType, targetId, label });
	}
</script>

<svelte:head>
	<title>{group.name} — TrP Tools</title>
	<meta name="description" content={group.tagline || group.description.slice(0, 160)} />
	<meta property="og:title" content={group.name} />
	<meta property="og:description" content={group.tagline || group.description.slice(0, 160)} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={group.bannerImage ?? group.icon ?? ''} />
</svelte:head>

<!-- Banner -->
<section class="relative border-b border-border-base">
	{#if group.bannerImage}
		<img
			src={group.bannerImage}
			alt=""
			class="absolute inset-0 h-full w-full object-cover"
			fetchpriority="high"
		/>
		<!-- The group's own accent still tints the banner, so the page keeps its identity. -->
		<div
			class="absolute inset-0"
			style="background: linear-gradient(180deg, {withAlpha(group.accentColor, 0.55)}, rgb(0 0 0 / 0.75));"
		></div>
	{:else}
		<div
			class="absolute inset-0"
			style="background: linear-gradient(180deg, {withAlpha(group.accentColor, 0.16)}, transparent);"
		></div>
	{/if}

	<div class="relative mx-auto max-w-5xl px-4 py-10">
		<div class="flex flex-wrap items-start gap-5">
			<Avatar src={group.icon} name={group.name} size={88} class="rounded-2xl" />

			<div class="min-w-0 flex-1">
				<h1
					class="text-3xl font-semibold tracking-tight text-balance {group.bannerImage
						? 'text-white'
						: ''}"
				>
					{group.name}
				</h1>

				{#if group.tagline}
					<p class="mt-1.5 text-pretty {group.bannerImage ? 'text-white/80' : 'text-text-muted'}">
						{group.tagline}
					</p>
				{/if}

				<div class="mt-4 flex flex-wrap items-center gap-2">
					<Badge><IconUsers size={13} /> {formatNumber(group.members)} members</Badge>
					{#if group.showRoutes}
						<Badge><IconRoute size={13} /> {group.routes.length} routes</Badge>
					{/if}
					{#if group.depots.length > 0}
						<Badge><IconBuildingWarehouse size={13} /> {group.depots.length} depots</Badge>
					{/if}
					<a
						href="https://www.roblox.com/groups/{group.robloxId}"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1.5 rounded-full border border-border-base px-2.5 py-0.5
							text-xs transition-colors {group.bannerImage
							? 'border-white/30 text-white/80 hover:text-white'
							: 'text-text-muted hover:text-text'}"
					>
						Roblox group <IconExternalLink size={12} />
					</a>

					<ReportButton targetType="GROUP" targetId={group.id} label="this group" />
				</div>
			</div>
		</div>
	</div>
</section>

<div class="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-3">
	<div class="space-y-10 lg:col-span-2">
		{#if group.about}
			<section>
				<h2 class="mb-3 text-lg font-semibold">About</h2>
				<p class="text-sm leading-relaxed whitespace-pre-line text-text-muted">{group.about}</p>
			</section>
		{/if}

		{#if group.showRoutes}
			<section>
				<h2 class="mb-3 text-lg font-semibold">Routes</h2>

				{#if group.routes.length === 0}
					<EmptyState title="No public routes" description="This group has not published any routes yet." />
				{:else}
					<!--
						Each card opens the route's own page. Images used to be
						strung along the bottom of every card, which made the
						list unreadable; they live on that page now.
					-->
					<ul class="grid gap-3 sm:grid-cols-2">
						{#each visibleRoutes as route (route.id)}
							{@const href = `/g/${group.slug}/route/${route.slug}`}
							<li class="card group relative flex items-center gap-3 p-4 transition-colors hover:border-accent/50">
								<a {href} class="absolute inset-0" aria-label="Open route {route.name}"></a>

								<RouteBadge
									label={route.name}
									color={route.color}
									textColor={route.textColor}
									shape={route.shape}
									icon={route.icon}
									size="md"
								/>

								<div class="pointer-events-none min-w-0 flex-1">
									<p class="font-medium text-text">{route.name}</p>
									{#if route.description}
										<p class="mt-0.5 line-clamp-2 text-sm text-text-muted">{route.description}</p>
									{:else if route.images.length > 0}
										<p class="mt-0.5 text-sm text-text-subtle">
											{route.images.length}
											{route.images.length === 1 ? 'image' : 'images'}
										</p>
									{/if}
								</div>

								<div class="relative z-10 flex items-center gap-1">
									<OverflowMenu label="Route actions">
										{#snippet children(close)}
											<MenuItem
												onclick={() => {
													close();
													copyLink(href);
												}}
											>
												<IconLink size={15} /> Copy link
											</MenuItem>
											<MenuItem
												tone="danger"
												onclick={() => {
													close();
													report('ROUTE', route.id, `route ${route.name}`);
												}}
											>
												<IconFlag size={15} /> Report route
											</MenuItem>
										{/snippet}
									</OverflowMenu>

									<IconChevronRight size={16} class="text-text-subtle" />
								</div>
							</li>
						{/each}
					</ul>

					{#if group.routes.length > ROUTE_PREVIEW}
						<button
							type="button"
							onclick={() => (allRoutes = !allRoutes)}
							aria-expanded={allRoutes}
							class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border-base px-3 py-1.5
								text-sm text-text-muted transition-colors hover:bg-background-secondary hover:text-text"
						>
							{#if allRoutes}
								Show less <IconChevronUp size={15} />
							{:else}
								Show {group.routes.length - ROUTE_PREVIEW} more <IconChevronDown size={15} />
							{/if}
						</button>
					{/if}
				{/if}
			</section>
		{/if}

		{#if group.depots.length > 0}
			<section>
				<h2 class="mb-3 text-lg font-semibold">Depots</h2>

				<ul class="space-y-3">
					{#each visibleDepots as depot (depot.id)}
						{@const href = `/g/${group.slug}/depot/${depot.slug}`}
						<li class="card group relative flex items-center gap-3 p-4 transition-colors hover:border-accent/50">
							<a {href} class="absolute inset-0" aria-label="Open depot {depot.name}"></a>

							<DepotBadge
								number={depot.number}
								color={depot.color}
								icon={depot.icon}
								name={depot.name}
								size="sm"
							/>

							<div class="pointer-events-none min-w-0 flex-1">
								<p class="font-medium text-text">{depot.name}</p>
								{#if depot.description}
									<p class="mt-0.5 line-clamp-2 text-sm text-text-muted">{depot.description}</p>
								{:else if depot.images.length > 0}
									<p class="mt-0.5 text-sm text-text-subtle">
										{depot.images.length}
										{depot.images.length === 1 ? 'image' : 'images'}
									</p>
								{/if}
							</div>

							<div class="relative z-10 flex items-center gap-1">
								<OverflowMenu label="Depot actions">
									{#snippet children(close)}
										<MenuItem
											onclick={() => {
												close();
												copyLink(href);
											}}
										>
											<IconLink size={15} /> Copy link
										</MenuItem>
										<MenuItem
											tone="danger"
											onclick={() => {
												close();
												report('DEPOT', depot.id, `depot ${depot.number}`);
											}}
										>
											<IconFlag size={15} /> Report depot
										</MenuItem>
									{/snippet}
								</OverflowMenu>

								<IconChevronRight size={16} class="text-text-subtle" />
							</div>
						</li>
					{/each}
				</ul>

				{#if group.depots.length > DEPOT_PREVIEW}
					<button
						type="button"
						onclick={() => (allDepots = !allDepots)}
						aria-expanded={allDepots}
						class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border-base px-3 py-1.5
							text-sm text-text-muted transition-colors hover:bg-background-secondary hover:text-text"
					>
						{#if allDepots}
							Show less <IconChevronUp size={15} />
						{:else}
							Show {group.depots.length - DEPOT_PREVIEW} more <IconChevronDown size={15} />
						{/if}
					</button>
				{/if}
			</section>
		{/if}

		{#if group.showRoster && group.roster.length > 0}
			<section>
				<h2 class="mb-3 text-lg font-semibold">Staff</h2>
				<RankRoster roster={group.roster} />
			</section>
		{/if}
	</div>

	<aside class="lg:col-span-1">
		{#if group.showShifts}
			<h2 class="mb-3 text-lg font-semibold">Upcoming shifts</h2>

			{#if group.upcomingShifts.length === 0}
				<EmptyState title="Nothing scheduled" description="No shifts in the next two weeks.">
					{#snippet icon()}<IconCalendarTime size={24} stroke={1.5} />{/snippet}
				</EmptyState>
			{:else}
				<ul class="space-y-3">
					{#each group.upcomingShifts as shift (shift.eventId + shift.start)}
						<li class="card overflow-hidden">
							<a
								href="/g/{group.slug}/shift/{shift.slug}"
								class="flex items-start gap-3 p-4 transition-colors hover:bg-background-secondary/60"
							>
								<span class="mt-1 h-10 w-1 shrink-0 rounded-full" style="background: {shift.color}"
								></span>
								<div class="min-w-0 flex-1">
									<p class="font-medium text-text">{shift.name}</p>
									<p class="mt-0.5 text-sm text-text-muted">{formatDateTime(shift.start)}</p>
									<p class="text-xs text-text-subtle">{formatRelative(shift.start)}</p>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</aside>
</div>
