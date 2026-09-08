<script lang="ts">
	import { goto } from '$app/navigation';
	import { IconChevronRight, IconEyeOff, IconLock, IconPlus, IconRoute } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import RouteEditor, { type RouteDraft } from '$lib/components/routes/RouteEditor.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { formatShare } from '$lib/utils/format';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	let { data }: PageProps = $props();

	let groupId = $derived(data.group.id);
	let base = $derived(`/dashboard/${data.group.slug}/routes`);

	function emptyDraft(): RouteDraft {
		return {
			name: '',
			description: '',
			color: '#4287f5',
			textColor: '#111111',
			shape: 'AUTO',
			autoAssign: true,
			targetShare: 20,
			visibility: 'PUBLIC',
			showOnGroupPage: true,
			archived: false,
			depots: [],
			translations: {}
		};
	}

	let createOpen = $state(false);
	let createDraft = $state(emptyDraft());
	let creating = $state(false);

	async function createRoute() {
		creating = true;
		try {
			// A route cannot be created already archived.
			const { archived: _archived, ...values } = createDraft;

			const { data: created, error } = await api.routes.post({ groupId, ...values });
			if (!created) throw error;

			toasts.success(m.dashboard_routes_created({ name: createDraft.name }));
			createOpen = false;
			createDraft = emptyDraft();

			// Straight into the route that was just made: everything else about
			// it — its depots, its share, its images — lives on its own page.
			await goto(`${base}/${created.id}`);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_routes_could_not_create_route()));
		} finally {
			creating = false;
		}
	}

	let active = $derived(data.routes.filter((route) => !route.archived));
	let disabled = $derived(data.routes.filter((route) => route.archived));

	/** What each route's share works out to across the group as a whole. */
	let shareTotal = $derived(
		active.filter((route) => route.autoAssign).reduce((sum, route) => sum + route.targetShare, 0)
	);
</script>

<PageHeader
	title={m.common_routes()}
	description={m.dashboard_routes_every_route_here_can_assigned_automatically()}
>
	{#snippet actions()}
		<Button variant="secondary" href="/dashboard/{data.group.slug}/depots">{m.common_depots()}</Button>
		<Button onclick={() => (createOpen = true)}>
			<IconPlus size={16} /> {m.dashboard_routes_new_route()}
		</Button>
	{/snippet}
</PageHeader>

{#if data.depots.length === 0}
	<div class="mb-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
		<p class="text-text">
			{m.dashboard_routes_group_has_no_depots_automatic_assignment()}
		</p>
		<Button size="sm" variant="secondary" class="mt-2.5" href="/dashboard/{data.group.slug}/depots">
			{m.dashboard_routes_manage_depots()}
		</Button>
	</div>
{/if}

{#if shareTotal > 0}
	<p class="mb-4 text-xs text-text-subtle">
		{m.dashboard_routes_target_shares_are_relative_not_absolute()}
	</p>
{/if}

{#if data.routes.length === 0}
	<EmptyState
		title={m.dashboard_routes_no_routes_yet()}
		description={m.dashboard_routes_create_first_route_give_dispatch_something()}
	>
		{#snippet icon()}<IconRoute size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button onclick={() => (createOpen = true)}>
				<IconPlus size={16} /> {m.dashboard_routes_new_route()}
			</Button>
		{/snippet}
	</EmptyState>
{:else}
	<!--
		A row says what a route *is*; everything that changes one lives on its
		own page (§10.1). The list used to open into stacked editors, so a
		group with twenty routes met a wall of controls with no way to tell
		which belonged to which.
	-->
	<ul class="space-y-3">
		{#each [...active, ...disabled] as route (route.id)}
			<li>
				<a
					href="{base}/{route.id}"
					class="card flex items-center gap-3 p-4 transition-colors hover:border-accent/50
						{route.archived ? 'opacity-60' : ''}"
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
						<p class="flex items-center gap-1.5 truncate font-medium text-text">
							{localized(route, 'name')}
							{#if route.builtIn}<IconLock size={13} class="shrink-0 text-text-subtle" />{/if}
						</p>
						{#if localized(route, 'description')}
							<p class="truncate text-sm text-text-muted">{localized(route, 'description')}</p>
						{/if}
					</div>

					<div class="hidden shrink-0 items-center gap-2 sm:flex">
						{#if route.archived}<Badge>{m.common_disabled()}</Badge>{/if}
						{#if route.moderation === 'HIDDEN'}<Badge tone="danger">{m.common_hidden()}</Badge>{/if}
						{#if !route.autoAssign}<Badge tone="warning">{m.dashboard_routes_manual_only()}</Badge>{/if}
						{#if route.visibility !== 'PUBLIC'}
							<Badge>{m.common_members_only()}</Badge>
						{:else if !route.showOnGroupPage}
							<Badge><IconEyeOff size={13} /> {m.dashboard_routes_not_group_page()}</Badge>
						{/if}
						<Badge tone="accent">{formatShare(route.targetShare)}%</Badge>
						<Badge>
							{route.depots.length === 0
								? m.dashboard_routes_all_depots()
								: m.common_depots_count({ count: route.depots.length })}
						</Badge>
					</div>

					<IconChevronRight size={18} class="shrink-0 text-text-subtle" />
				</a>
			</li>
		{/each}
	</ul>
{/if}

<Modal bind:open={createOpen} title={m.dashboard_routes_new_route()} size="lg">
	<RouteEditor
		sourceLocale={data.group.sourceLocale}
		bind:draft={createDraft}
		depots={data.depots}
		mode="create"
		busy={creating}
		onsave={createRoute}
	/>
</Modal>
