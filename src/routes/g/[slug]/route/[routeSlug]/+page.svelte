<script lang="ts">
	import { IconBuildingWarehouse, IconPhoto } from '@tabler/icons-svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import RoutePreferenceButton from '$lib/components/routes/RoutePreferenceButton.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import GroupCrumb from '$lib/components/layout/GroupCrumb.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ImageGallery from '$lib/components/media/ImageGallery.svelte';
	import ReportButton from '$lib/components/moderation/ReportButton.svelte';
	import { withAlpha } from '$lib/utils/color';
	import { formatShare } from '$lib/utils/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let route = $derived(data.route);
</script>

<svelte:head>
	<title>Route {route.name} — {group.name} — TrP Tools</title>
	<meta name="description" content={route.description || `Route ${route.name} on ${group.name}.`} />
	<meta property="og:title" content="Route {route.name} — {group.name}" />
	<meta property="og:description" content={route.description || `Route ${route.name} on ${group.name}.`} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={route.icon ?? route.images[0]?.url ?? group.icon ?? ''} />
</svelte:head>

<section
	class="border-b border-border-base"
	style="background: linear-gradient(180deg, {withAlpha(route.color, 0.18)}, transparent);"
>
	<div class="mx-auto max-w-4xl px-4 py-8">
		<GroupCrumb {group} current="Route {route.name}" />

		<div class="mt-5 flex flex-wrap items-center gap-5">
			<RouteBadge
				label={route.name}
				color={route.color}
				textColor={route.textColor}
				shape={route.shape}
				icon={route.icon}
				size="lg"
			/>

			<div class="min-w-0 flex-1">
				<h1 class="text-3xl font-semibold tracking-tight text-balance">Route {route.name}</h1>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<Badge tone="accent">{formatShare(route.targetShare)}% target share</Badge>
					{#if !route.autoAssign}<Badge tone="warning">Assigned by hand</Badge>{/if}

					<!--
						Labelled here, unlike the icon on a route card: there is
						room for it, and this is where somebody reading about a
						route decides whether they want to drive it.
					-->
					{#if data.user}
						<RoutePreferenceButton
							routeId={route.id}
							routeName={route.name}
							builtIn={route.builtIn}
							showLabel
						/>
					{/if}

					<ReportButton targetType="ROUTE" targetId={route.id} label="route {route.name}" />
				</div>
			</div>
		</div>
	</div>
</section>

<div class="mx-auto max-w-4xl space-y-10 px-4 py-10">
	{#if route.description}
		<section>
			<h2 class="mb-3 text-lg font-semibold">About this route</h2>
			<p class="text-sm leading-relaxed whitespace-pre-line text-text-muted">{route.description}</p>
		</section>
	{/if}

	<section>
		<h2 class="mb-3 text-lg font-semibold">Runs from</h2>

		{#if data.depots.length === 0}
			<p class="text-sm text-text-muted">
				This route can be dispatched from every depot in the group.
			</p>
		{:else}
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each data.depots as depot (depot.id)}
					<li>
						<a
							href="/g/{group.slug}/depot/{depot.slug}"
							class="card flex items-center gap-3 p-3 transition-colors hover:border-accent/50"
						>
							<DepotBadge
								number={depot.number}
								color={depot.color}
								icon={depot.icon}
								name={depot.name}
								size="sm"
							/>
							<span class="min-w-0 flex-1 truncate font-medium text-text">{depot.name}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section>
		<h2 class="mb-3 text-lg font-semibold">Maps and photos</h2>

		{#if route.images.length === 0}
			<EmptyState title="No images yet" description="This route has no maps or photos published.">
				{#snippet icon()}<IconPhoto size={24} stroke={1.5} />{/snippet}
			</EmptyState>
		{:else}
			<ImageGallery images={route.images} layout="grid" />
		{/if}
	</section>

	<a
		href="/g/{group.slug}"
		class="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
	>
		<IconBuildingWarehouse size={15} /> All routes and depots on {group.name}
	</a>
</div>
