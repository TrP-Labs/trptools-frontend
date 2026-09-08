<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconEyeOff,
		IconLock,
		IconPhoto,
		IconRadio,
		IconRoute,
		IconWorld
	} from '@tabler/icons-svelte';
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import RouteEditor, { type RouteDraft } from '$lib/components/routes/RouteEditor.svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { formatShare } from '$lib/utils/format';
	import { toasts } from '$lib/stores/toast.svelte';
	import { localized } from '$lib/utils/translations';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let route = $derived(data.route);
	let base = $derived(`/dashboard/${group.slug}/routes`);

	/**
	 * The draft is seeded from the route and re-seeded whenever the loaded
	 * route changes, so a save — or a move to another route — never leaves the
	 * form showing the last one's values.
	 */
	// Seeded through a function rather than from `data` inline: reading a prop
	// in a `$state` initialiser is a reference the compiler cannot see through,
	// and it warns about exactly that.
	let draft = $state<RouteDraft>(seedDraft());
	let seededId = $state(seedId());

	// Seeded through functions rather than from `data` inline: a prop read in a
	// `$state` initialiser is a reference the compiler warns about, since it
	// captures the first value and nothing after it.
	function seedDraft() {
		return toDraft(data.route);
	}

	function seedId() {
		return data.route.id;
	}

	$effect(() => {
		if (route.id !== seededId) {
			draft = toDraft(route);
			seededId = route.id;
		}
	});

	function toDraft(source: typeof data.route): RouteDraft {
		return {
			name: source.name,
			description: source.description,
			color: source.color,
			textColor: source.textColor,
			shape: source.shape,
			autoAssign: source.autoAssign,
			targetShare: source.targetShare,
			visibility: source.visibility,
			showOnGroupPage: source.showOnGroupPage,
			archived: source.archived,
			depots: [...source.depots],
			translations: structuredClone(source.translations)
		};
	}

	let busy = $state(false);

	let sections = $derived<ObjectSection[]>([
		{ id: 'route', label: m.routes_route_editor_route(), icon: IconRoute },
		{ id: 'dispatch', label: m.common_dispatch(), icon: IconRadio },
		{ id: 'public', label: m.common_public_page(), icon: IconWorld },
		{ id: 'availability', label: m.routes_route_editor_availability(), icon: IconPhoto }
	]);

	async function save() {
		busy = true;
		try {
			const { error } = await api.routes({ routeId: route.id }).patch({ ...draft });
			if (error) throw error;

			toasts.success(m.dashboard_routes_route_saved());
			await refreshData();
			draft = seedDraft();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_routes_could_not_save_route()));
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!confirm(m.dashboard_routes_delete_confirm({ route: localized(route, 'name') }))) return;

		busy = true;
		try {
			const { error } = await api.routes({ routeId: route.id }).delete();
			if (error) throw error;

			toasts.success(m.dashboard_routes_route_deleted());
			await goto(base);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_routes_could_not_delete_route()));
		} finally {
			busy = false;
		}
	}
</script>

<ObjectPage
	backHref={base}
	backLabel={m.common_routes()}
	title={localized(route, 'name')}
	description={localized(route, 'description') || undefined}
	accent={route.color}
	{sections}
>
	{#snippet meta()}
		<RouteBadge
			label={localized(route, 'name')}
			color={route.color}
			textColor={route.textColor}
			shape={route.shape}
			icon={route.icon}
			size="sm"
		/>
		{#if route.builtIn}<Badge><IconLock size={13} /> {m.routes_built_in()}</Badge>{/if}
		{#if route.archived}<Badge>{m.common_disabled()}</Badge>{/if}
		{#if route.moderation === 'HIDDEN'}<Badge tone="danger">{m.common_hidden()}</Badge>{/if}
		{#if !route.autoAssign}<Badge tone="warning">{m.dashboard_routes_manual_only()}</Badge>{/if}
		{#if route.visibility !== 'PUBLIC'}
			<Badge>{m.common_members_only()}</Badge>
		{:else if !route.showOnGroupPage}
			<Badge><IconEyeOff size={13} /> {m.dashboard_routes_not_group_page()}</Badge>
		{/if}
		<Badge tone="accent">{formatShare(route.targetShare)}%</Badge>
	{/snippet}

	{#snippet children(section)}
		<Card>
			<RouteEditor
				sourceLocale={group.sourceLocale}
				bind:draft
				show={[section as 'route' | 'dispatch' | 'public' | 'availability']}
				depots={data.depots}
				mode="edit"
				builtIn={route.builtIn}
				routeId={route.id}
				groupId={group.id}
				images={route.images}
				icon={route.icon}
				{busy}
				onsave={save}
				ondelete={remove}
				onimageschanged={refreshData}
			/>
		</Card>
	{/snippet}
</ObjectPage>
