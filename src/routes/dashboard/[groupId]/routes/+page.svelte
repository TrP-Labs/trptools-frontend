<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconChevronDown, IconLock, IconPlus, IconRoute } from '@tabler/icons-svelte';
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
	import type { RouteRecord } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let groupId = $derived(data.group.id);

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
			archived: false,
			depots: []
		};
	}

	function toDraft(route: RouteRecord): RouteDraft {
		return {
			name: route.name,
			description: route.description,
			color: route.color,
			textColor: route.textColor,
			shape: route.shape,
			autoAssign: route.autoAssign,
			targetShare: route.targetShare,
			visibility: route.visibility,
			archived: route.archived,
			depots: [...route.depots]
		};
	}

	let createOpen = $state(false);
	let createDraft = $state(emptyDraft());
	let creating = $state(false);

	let expandedId = $state<string | null>(null);
	let editDraft = $state<RouteDraft>(emptyDraft());
	let savingId = $state<string | null>(null);

	function expand(route: RouteRecord) {
		if (expandedId === route.id) {
			expandedId = null;
			return;
		}
		expandedId = route.id;
		editDraft = toDraft(route);
	}

	async function createRoute() {
		creating = true;
		try {
			// A route cannot be created already archived.
			const { archived: _archived, ...values } = createDraft;

			const { data: created, error } = await api.routes.post({ groupId, ...values });
			if (!created) throw error;

			toasts.success(`Route ${createDraft.name} created`);
			createOpen = false;
			createDraft = emptyDraft();
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not create that route'));
		} finally {
			creating = false;
		}
	}

	async function saveRoute(routeId: string) {
		savingId = routeId;
		try {
			const { error } = await api.routes({ routeId }).patch({ ...editDraft });
			if (error) throw error;

			toasts.success('Route saved');
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save that route'));
		} finally {
			savingId = null;
		}
	}

	async function deleteRoute(route: RouteRecord) {
		if (!confirm(`Delete route ${route.name}? This cannot be undone.`)) return;

		savingId = route.id;
		try {
			const { error } = await api.routes({ routeId: route.id }).delete();
			if (error) throw error;

			toasts.success('Route deleted');
			expandedId = null;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not delete that route'));
		} finally {
			savingId = null;
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
	title="Routes"
	description="Every route here can be assigned automatically, including ones you invent."
>
	{#snippet actions()}
		<Button variant="secondary" href="/dashboard/{data.group.slug}/depots">Depots</Button>
		<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> New route</Button>
	{/snippet}
</PageHeader>

{#if data.depots.length === 0}
	<div class="mb-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
		<p class="text-text">
			This group has no depots. Automatic assignment uses depots to decide which routes a vehicle is
			eligible for.
		</p>
		<Button size="sm" variant="secondary" class="mt-2.5" href="/dashboard/{data.group.slug}/depots">
			Manage depots
		</Button>
	</div>
{/if}

{#if shareTotal > 0}
	<p class="mb-4 text-xs text-text-subtle">
		Target shares are relative, not absolute — each vehicle goes to whichever eligible route is
		furthest below its share.
	</p>
{/if}

{#if data.routes.length === 0}
	<EmptyState title="No routes yet" description="Create your first route to give dispatch something to assign.">
		{#snippet icon()}<IconRoute size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> New route</Button>
		{/snippet}
	</EmptyState>
{:else}
	<div class="space-y-3">
		{#each [...active, ...disabled] as route (route.id)}
			{@const open = expandedId === route.id}
			<div class="card overflow-hidden {route.archived ? 'opacity-60' : ''}">
				<button
					type="button"
					onclick={() => expand(route)}
					aria-expanded={open}
					class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-background-secondary/60"
				>
					<RouteBadge
						label={route.name}
						color={route.color}
						textColor={route.textColor}
						shape={route.shape}
						icon={route.icon}
						size="sm"
					/>

					<div class="min-w-0 flex-1">
						<p class="flex items-center gap-1.5 truncate font-medium text-text">
							{route.name}
							{#if route.builtIn}<IconLock size={13} class="shrink-0 text-text-subtle" />{/if}
						</p>
						{#if route.description}
							<p class="truncate text-sm text-text-muted">{route.description}</p>
						{/if}
					</div>

					<div class="hidden shrink-0 items-center gap-2 sm:flex">
						{#if route.archived}<Badge>Disabled</Badge>{/if}
						{#if route.moderation === 'HIDDEN'}<Badge tone="danger">Hidden</Badge>{/if}
						{#if !route.autoAssign}<Badge tone="warning">Manual only</Badge>{/if}
						{#if route.visibility !== 'PUBLIC'}<Badge>Members only</Badge>{/if}
						<Badge tone="accent">{formatShare(route.targetShare)}%</Badge>
						<Badge>
							{route.depots.length === 0
								? 'All depots'
								: `${route.depots.length} ${route.depots.length === 1 ? 'depot' : 'depots'}`}
						</Badge>
					</div>

					<IconChevronDown
						size={18}
						class="shrink-0 text-text-muted transition-transform {open ? 'rotate-180' : ''}"
					/>
				</button>

				{#if open}
					<div class="border-t border-border-base p-4">
						<RouteEditor
							bind:draft={editDraft}
							depots={data.depots}
							mode="edit"
							builtIn={route.builtIn}
							routeId={route.id}
							groupId={data.group.id}
							images={route.images}
							icon={route.icon}
							busy={savingId === route.id}
							onsave={() => saveRoute(route.id)}
							ondelete={() => deleteRoute(route)}
						/>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<Modal bind:open={createOpen} title="New route" size="lg">
	<RouteEditor
		bind:draft={createDraft}
		depots={data.depots}
		mode="create"
		busy={creating}
		onsave={createRoute}
	/>
</Modal>
