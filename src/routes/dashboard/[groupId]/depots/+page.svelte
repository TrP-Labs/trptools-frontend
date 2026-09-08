<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		IconBuildingWarehouse,
		IconChevronRight,
		IconEyeOff,
		IconPlus
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import DepotEditor, { depotPayload, type DepotDraft } from '$lib/components/depots/DepotEditor.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { localized } from '$lib/utils/translations';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let groupId = $derived(data.group.id);
	let base = $derived(`/dashboard/${data.group.slug}/depots`);

	function emptyDraft(): DepotDraft {
		const highest = data.depots.reduce((max, depot) => Math.max(max, depot.number), 0);

		return {
			number: highest + 1,
			name: '',
			description: '',
			color: '#4287f5',
			aliases: '',
			visibility: 'PUBLIC',
			showOnGroupPage: true,
			archived: false,
			translations: {}
		};
	}

	let createOpen = $state(false);
	let createDraft = $state<DepotDraft>(emptyDraft());
	let creating = $state(false);

	function openCreate() {
		createDraft = emptyDraft();
		createOpen = true;
	}

	async function createDepot() {
		creating = true;
		try {
			const { archived: _archived, ...values } = depotPayload(createDraft);

			const { data: created, error } = await api.depots.post({ groupId, ...values });
			if (!created) throw error;

			toasts.success(m.dashboard_depots_created({ number: createDraft.number }));
			createOpen = false;

			// Straight into the depot that was just made: its icon, its images
			// and everything else it can carry live on its own page.
			await goto(`${base}/${created.id}`);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_depots_could_not_create_depot()));
		} finally {
			creating = false;
		}
	}

	let active = $derived(data.depots.filter((depot) => !depot.archived));
	let disabled = $derived(data.depots.filter((depot) => depot.archived));
</script>

<PageHeader
	title={m.common_depots()}
	description={m.dashboard_depots_spawn_locations_game_identified_by_number()}
>
	{#snippet actions()}
		<Button variant="secondary" href="/dashboard/{data.group.slug}/routes">{m.common_routes()}</Button>
		<Button onclick={openCreate}><IconPlus size={16} /> {m.dashboard_depots_new_depot()}</Button>
	{/snippet}
</PageHeader>

{#if data.depots.length === 0}
	<EmptyState
		title={m.dashboard_depots_no_depots()}
		description={m.dashboard_depots_every_group_normally_starts_with_main()}
	>
		{#snippet icon()}<IconBuildingWarehouse size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button onclick={openCreate}><IconPlus size={16} /> {m.dashboard_depots_new_depot()}</Button>
		{/snippet}
	</EmptyState>
{:else}
	<!--
		A row says what a depot *is*; everything that changes one lives on its
		own page (§10.1). The list used to open into stacked editors, so a
		group with a dozen depots met a wall of controls with no way to tell
		which belonged to which.
	-->
	<ul class="space-y-3">
		{#each [...active, ...disabled] as depot (depot.id)}
			<li>
				<a
					href="{base}/{depot.id}"
					class="card flex items-center gap-3 p-4 transition-colors hover:border-accent/50
						{depot.archived ? 'opacity-60' : ''}"
				>
					<DepotBadge
						number={depot.number}
						color={depot.color}
						icon={depot.icon}
						name={localized(depot, 'name')}
						size="sm"
					/>

					<div class="min-w-0 flex-1">
						<p class="truncate font-medium text-text">{localized(depot, 'name')}</p>
						{#if localized(depot, 'description')}
							<p class="truncate text-sm text-text-muted">{localized(depot, 'description')}</p>
						{/if}
					</div>

					<div class="hidden shrink-0 items-center gap-2 sm:flex">
						{#if depot.archived}<Badge>{m.common_disabled()}</Badge>{/if}
						{#if depot.moderation === 'HIDDEN'}<Badge tone="danger">{m.common_hidden()}</Badge>{/if}
						{#if depot.visibility !== 'PUBLIC'}
							<Badge>{m.common_members_only()}</Badge>
						{:else if !depot.showOnGroupPage}
							<Badge><IconEyeOff size={13} /> {m.dashboard_depots_not_group_page()}</Badge>
						{/if}
						{#if depot.images.length > 0}
							<Badge>{m.common_images_count({ count: depot.images.length })}</Badge>
						{/if}
					</div>

					<IconChevronRight size={18} class="shrink-0 text-text-subtle" />
				</a>
			</li>
		{/each}
	</ul>
{/if}

<Modal
	bind:open={createOpen}
	title={m.dashboard_depots_new_depot()}
	description={m.dashboard_depots_give_number_game_uses()}
	size="lg"
>
	<DepotEditor
		sourceLocale={data.group.sourceLocale}
		bind:draft={createDraft}
		mode="create"
		busy={creating}
		onsave={createDepot}
	/>

	<p class="mt-3 text-xs text-text-subtle">
		{m.dashboard_depots_icon_images_can_added_once_depot()}
	</p>
</Modal>
