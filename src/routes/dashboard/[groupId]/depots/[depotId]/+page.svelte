<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import { IconBuildingWarehouse, IconEyeOff, IconPhoto, IconWorld } from '@tabler/icons-svelte';
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import DepotEditor, {
		depotPayload,
		type DepotDraft,
		type DepotSection
	} from '$lib/components/depots/DepotEditor.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { localized } from '$lib/utils/translations';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let depot = $derived(data.depot);
	let base = $derived(`/dashboard/${group.slug}/depots`);

	// Seeded through a function rather than from `data` inline: reading a prop
	// in a `$state` initialiser is a reference the compiler cannot see through,
	// and it warns about exactly that.
	let draft = $state<DepotDraft>(seedDraft());
	let seededId = $state(seedId());

	// Seeded through functions rather than from `data` inline: a prop read in a
	// `$state` initialiser is a reference the compiler warns about, since it
	// captures the first value and nothing after it.
	function seedDraft() {
		return toDraft(data.depot);
	}

	function seedId() {
		return data.depot.id;
	}

	// Re-seeded whenever the loaded depot changes, so a save — or a move to
	// another depot — never leaves the form showing the last one's values.
	$effect(() => {
		if (depot.id !== seededId) {
			draft = toDraft(depot);
			seededId = depot.id;
		}
	});

	function toDraft(source: typeof data.depot): DepotDraft {
		return {
			number: source.number,
			name: source.name,
			description: source.description,
			color: source.color,
			aliases: source.aliases.join(', '),
			visibility: source.visibility,
			showOnGroupPage: source.showOnGroupPage,
			archived: source.archived,
			translations: structuredClone(source.translations)
		};
	}

	let busy = $state(false);

	let sections = $derived<ObjectSection[]>([
		{ id: 'depot', label: m.dashboard_depots_depot(), icon: IconBuildingWarehouse },
		{ id: 'public', label: m.common_public_page(), icon: IconWorld },
		{ id: 'availability', label: m.dashboard_depots_availability(), icon: IconPhoto }
	]);

	async function save() {
		busy = true;
		try {
			const { error } = await api.depots({ depotId: depot.id }).patch(depotPayload(draft));
			if (error) throw error;

			toasts.success(m.dashboard_depots_depot_saved());
			await refreshData();
			draft = seedDraft();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_depots_could_not_save_depot()));
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (
			!confirm(
				m.dashboard_depots_delete_confirm({ number: depot.number, name: localized(depot, 'name') })
			)
		)
			return;

		busy = true;
		try {
			const { error } = await api.depots({ depotId: depot.id }).delete();
			if (error) throw error;

			toasts.success(m.dashboard_depots_depot_deleted());
			await goto(base);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_depots_could_not_delete_depot()));
		} finally {
			busy = false;
		}
	}
</script>

<ObjectPage
	backHref={base}
	backLabel={m.common_depots()}
	title={localized(depot, 'name')}
	description={localized(depot, 'description') || undefined}
	accent={depot.color}
	{sections}
>
	{#snippet meta()}
		<DepotBadge
			number={depot.number}
			color={depot.color}
			icon={depot.icon}
			name={localized(depot, 'name')}
			size="sm"
		/>
		{#if depot.archived}<Badge>{m.common_disabled()}</Badge>{/if}
		{#if depot.moderation === 'HIDDEN'}<Badge tone="danger">{m.common_hidden()}</Badge>{/if}
		{#if depot.visibility !== 'PUBLIC'}
			<Badge>{m.common_members_only()}</Badge>
		{:else if !depot.showOnGroupPage}
			<Badge><IconEyeOff size={13} /> {m.dashboard_depots_not_group_page()}</Badge>
		{/if}
	{/snippet}

	{#snippet children(section)}
		<Card>
			<DepotEditor
				sourceLocale={group.sourceLocale}
				bind:draft
				show={[section as DepotSection]}
				mode="edit"
				depotId={depot.id}
				groupId={group.id}
				images={depot.images}
				icon={depot.icon}
				{busy}
				onsave={save}
				ondelete={remove}
				onimageschanged={refreshData}
			/>
		</Card>
	{/snippet}
</ObjectPage>
