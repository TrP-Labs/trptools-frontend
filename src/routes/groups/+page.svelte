<script lang="ts">
	import { goto } from '$app/navigation';
	import { IconSearch, IconUsersGroup } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatNumber } from '$lib/utils/format';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	// Seeded from the URL so the server renders the current term, then owned by
	// the input. The effect re-syncs it when navigation changes the URL.
	// svelte-ignore state_referenced_locally
	let query = $state(data.search);

	$effect(() => {
		query = data.search;
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = query.trim();
		goto(trimmed ? `/groups?search=${encodeURIComponent(trimmed)}` : '/groups', {
			keepFocus: true
		});
	}
</script>

<svelte:head>
	<title>{m.groups_groups_trp_tools()}</title>
	<meta name="description" content={m.groups_meta_description()} />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-10">
	<PageHeader
		title={m.common_groups()}
		description={m.groups_transit_operators_have_published_page_trp()}
	/>

	<form onsubmit={submit} class="mb-6 flex max-w-md gap-2">
		<div class="relative flex-1">
			<IconSearch
				size={16}
				class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
			/>
			<input
				bind:value={query}
				type="search"
				placeholder={m.groups_search_groups()}
				aria-label={m.groups_search_groups()}
				class="w-full rounded-lg border border-border-base bg-background-secondary py-2 pr-3 pl-9 text-sm
					text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
			/>
		</div>
	</form>

	{#if data.failed}
		<EmptyState
			title={m.groups_could_not_reach_api()}
			description={m.groups_group_directory_temporarily_unavailable_try_agai()}
		/>
	{:else if data.groups.length === 0}
		<EmptyState
			title={data.search ? `No groups match “${data.search}”` : m.groups_no_public_groups_yet()}
			description={data.search
				? m.groups_try_different_search_term()
				: m.groups_groups_appear_here_once_they_set()}
		>
			{#snippet icon()}<IconUsersGroup size={28} stroke={1.5} />{/snippet}
		</EmptyState>
	{:else}
		<!-- A grid item sizes its track to its own content unless given a minimum. -->
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.groups as group (group.slug)}
				<li class="min-w-0">
					<a
						href="/g/{group.slug}"
						class="card group flex h-full flex-col p-5 transition-colors hover:border-border-strong"
					>
						<div class="flex items-center gap-3">
							<Avatar src={group.icon} name={group.name} size={44} />
							<div class="min-w-0">
								<h2 class="truncate font-semibold text-text">{group.name}</h2>
								<p class="text-xs text-text-muted">
									{formatNumber(group.members)} members
								</p>
							</div>
						</div>

						{#if group.tagline}
							<p class="mt-3 line-clamp-2 text-sm text-text-muted">{group.tagline}</p>
						{/if}

						<div class="mt-auto flex items-center gap-2 pt-4">
							<span
								class="inline-block size-2 rounded-full"
								style="background: {group.accentColor}"
							></span>
							<span class="text-xs text-text-subtle">
								{group.routeCount}
								{group.routeCount === 1 ? 'route' : 'routes'}
							</span>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
