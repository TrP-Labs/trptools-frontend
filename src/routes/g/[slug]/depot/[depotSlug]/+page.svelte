<script lang="ts">
	import { IconPhoto, IconRoute } from '@tabler/icons-svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import GroupCrumb from '$lib/components/layout/GroupCrumb.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ImageGallery from '$lib/components/media/ImageGallery.svelte';
	import ReportButton from '$lib/components/moderation/ReportButton.svelte';
	import { withAlpha } from '$lib/utils/color';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let depot = $derived(data.depot);
</script>

<svelte:head>
	<title>{localized(depot, 'name')} — {localized(group, 'name')} — TrP Tools</title>
	<meta name="description" content={localized(depot, 'description') || `Depot ${depot.number} on ${localized(group, 'name')}.`} />
	<meta property="og:title" content="{localized(depot, 'name')} — {localized(group, 'name')}" />
	<meta property="og:description" content={localized(depot, 'description') || `Depot ${depot.number} on ${localized(group, 'name')}.`} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={depot.icon ?? depot.images[0]?.url ?? group.icon ?? ''} />
</svelte:head>

<section
	class="border-b border-border-base"
	style="background: linear-gradient(180deg, {withAlpha(depot.color, 0.18)}, transparent);"
>
	<div class="mx-auto max-w-4xl px-4 py-8">
		<GroupCrumb {group} current={localized(depot, 'name')} />

		<div class="mt-5 flex flex-wrap items-center gap-5">
			<DepotBadge
				number={depot.number}
				color={depot.color}
				icon={depot.icon}
				name={localized(depot, 'name')}
				size="lg"
			/>

			<div class="min-w-0 flex-1">
				<!--
					A depot is named by whoever runs it, and nothing stops that being
					one long word. `wrap-anywhere` is what breaks it: `break-words`
					leaves the min-content size intact, so the word goes on widening
					every box it is measured in.
				-->
				<h1 class="text-3xl font-semibold tracking-tight text-balance wrap-anywhere">
					{localized(depot, 'name')}
				</h1>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<Badge>{m.g_depot_number({ number: depot.number })}</Badge>
					<Badge><IconRoute size={13} /> {data.routes.length} routes</Badge>
					<ReportButton targetType="DEPOT" targetId={depot.id} label={m.g_report_label_depot({ number: depot.number })} />
				</div>
			</div>
		</div>
	</div>
</section>

<div class="mx-auto max-w-4xl space-y-10 px-4 py-10">
	{#if localized(depot, 'description')}
		<section>
			<h2 class="mb-3 text-lg font-semibold">{m.g_depot_about_depot()}</h2>
			<p class="text-sm leading-relaxed whitespace-pre-line text-text-muted">{localized(depot, 'description')}</p>
		</section>
	{/if}

	<section>
		<h2 class="mb-3 text-lg font-semibold">{m.g_depot_routes_from_here()}</h2>

		{#if data.routes.length === 0}
			<EmptyState title={m.g_depot_no_routes()} description={m.g_depot_nothing_published_runs_from_depot_yet()}>
				{#snippet icon()}<IconRoute size={24} stroke={1.5} />{/snippet}
			</EmptyState>
		{:else}
			<!-- See the route page: the minimum belongs on the grid item. -->
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each data.routes as route (route.id)}
					<li class="min-w-0">
						<a
							href="/g/{group.slug}/route/{route.slug}"
							class="card flex items-center gap-3 p-3 transition-colors hover:border-accent/50"
						>
							<RouteBadge
								label={localized(route, 'name')}
								color={route.color}
								textColor={route.textColor}
								shape={route.shape}
								icon={route.icon}
								size="sm"
							/>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium text-text">{localized(route, 'name')}</p>
								{#if localized(route, 'description')}
									<p class="truncate text-sm text-text-muted">{localized(route, 'description')}</p>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section>
		<h2 class="mb-3 text-lg font-semibold">{m.g_depot_photos()}</h2>

		{#if depot.images.length === 0}
			<EmptyState title={m.g_depot_no_images_yet()} description={m.g_depot_depot_has_no_photos_published()}>
				{#snippet icon()}<IconPhoto size={24} stroke={1.5} />{/snippet}
			</EmptyState>
		{:else}
			<ImageGallery images={depot.images} layout="grid" />
		{/if}
	</section>
</div>
