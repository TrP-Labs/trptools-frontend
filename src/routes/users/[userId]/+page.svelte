<script lang="ts">
	import { IconExternalLink, IconThumbDown, IconThumbUp } from '@tabler/icons-svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import type { RouteShape } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	let { data }: PageProps = $props();
	let profile = $derived(data.profile);
	let name = $derived(profile.displayName ?? profile.username ?? `User ${profile.robloxId}`);

	/**
	 * Null means the section is switched off, an empty array means nothing has
	 * been marked. The two look the same on screen — neither draws a heading —
	 * but only one of them is somebody's decision, so they stay apart.
	 */
	let favourites = $derived(profile.favoriteRoutes ?? []);
	let disliked = $derived(profile.dislikedRoutes ?? []);
</script>

<svelte:head>
	<title>{name} — TrP Tools</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6 px-4 py-12">
	<div class="card flex flex-wrap items-center gap-5 p-6">
		<Avatar src={profile.avatar} {name} size={80} />

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-2xl font-semibold text-text">{name}</h1>
			{#if profile.username && profile.username !== profile.displayName}
				<p class="text-sm text-text-muted">@{profile.username}</p>
			{/if}

			<div class="mt-3 flex flex-wrap items-center gap-2">
				{#if profile.siteRank !== 'user'}
					<Badge tone="accent" class="capitalize">{profile.siteRank}</Badge>
				{/if}
				<a
					href="https://www.roblox.com/users/{profile.robloxId}/profile"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-full border border-border-base px-2.5 py-0.5
						text-xs text-text-muted transition-colors hover:text-text"
				>
					{m.users_roblox_profile()} <IconExternalLink size={12} />
				</a>
			</div>
		</div>
	</div>

	<!--
		The routes this person has asked for, and the ones they have asked to
		avoid. Both sections are published only if their owner said so, and a
		route a group has not published never reaches the page at all — so
		these lists say nothing the group's own pages do not.
	-->
	{#each [{ routes: favourites, title: m.users_favorite_routes(), tone: 'success' }, { routes: disliked, title: m.users_disliked_routes(), tone: 'danger' }] as section (section.title)}
		{#if section.routes.length > 0}
			<section>
				<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
					{#if section.tone === 'success'}
						<IconThumbUp size={17} class="text-success" />
					{:else}
						<IconThumbDown size={17} class="text-danger" />
					{/if}
					{section.title}
				</h2>

				<!--
					`auto-rows-fr` keeps every card the same height.
					
					A custom route carries its group on a second line and a
					global one does not, so left to themselves the rows come
					out different heights and the grid looks ragged. Equal rows
					settle it without a guessed pixel height, so nothing has to
					be revisited when the type scale changes.
				-->
				<ul class="grid auto-rows-fr gap-3 sm:grid-cols-2">
					{#each section.routes as route (route.routeId ?? localized(route, 'name'))}
						{@const badge = {
							label: localized(route, 'name'),
							color: route.color,
							textColor: route.textColor,
							shape: route.shape as RouteShape,
							icon: route.icon
						}}
						<li>
							<!--
								A route the game ships with belongs to no group
								and has no one page to open, so it is a plain
								card with its name on the line the badge sits
								on. A custom route keeps its group underneath
								and links to it.
							-->
							{#if route.global}
								<div class="card flex h-full items-center gap-3 p-3">
									<RouteBadge {...badge} size="sm" />
									<span class="min-w-0 flex-1 truncate font-medium text-text">{localized(route, 'name')}</span>
								</div>
							{:else}
								<a
									href="/g/{route.groupSlug}/route/{route.routeSlug}"
									class="card flex h-full items-center gap-3 p-3 transition-colors
										hover:border-accent/50"
								>
									<RouteBadge {...badge} size="sm" />
									<span class="min-w-0 flex-1">
										<span class="block truncate font-medium text-text">{localized(route, 'name')}</span>
										<span class="block truncate text-xs text-text-muted">{route.groupName}</span>
									</span>
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</div>
