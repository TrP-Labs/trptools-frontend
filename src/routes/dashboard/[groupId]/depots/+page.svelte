<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconBuildingWarehouse,
		IconChevronDown,
		IconEyeOff,
		IconPlus,
		IconTrash
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import FieldGroup from '$lib/components/ui/FieldGroup.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ImageManager from '$lib/components/media/ImageManager.svelte';
	import IconUploader from '$lib/components/media/IconUploader.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { Depot } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let groupId = $derived(data.group.id);

	interface DepotDraft {
		number: number;
		name: string;
		description: string;
		color: string;
		/** Free text in the form; split into the array the API wants on save. */
		aliases: string;
		visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
		/** Whether the group's public page lists this depot. */
		showOnGroupPage: boolean;
		archived: boolean;
	}

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
			archived: false
		};
	}

	function toDraft(depot: Depot): DepotDraft {
		return {
			number: depot.number,
			name: depot.name,
			description: depot.description,
			color: depot.color,
			aliases: depot.aliases.join(', '),
			visibility: depot.visibility,
			showOnGroupPage: depot.showOnGroupPage,
			archived: depot.archived
		};
	}

	/** `aliases` is a comma-separated field in the form, a list over the wire. */
	function payload(draft: DepotDraft) {
		const { aliases, ...values } = draft;
		return {
			...values,
			number: Number(values.number) || 0,
			aliases: aliases
				.split(',')
				.map((alias) => alias.trim())
				.filter(Boolean)
				.slice(0, 12)
		};
	}

	const visibilities = [
		{ value: 'PUBLIC' as const, label: m.common_public() },
		{ value: 'PRIVATE' as const, label: m.common_members_only() }
	];

	let createOpen = $state(false);
	let createDraft = $state<DepotDraft>({
		number: 1,
		name: '',
		description: '',
		color: '#4287f5',
		aliases: '',
		visibility: 'PUBLIC',
		showOnGroupPage: true,
		archived: false
	});
	let creating = $state(false);

	let expandedId = $state<string | null>(null);
	let editDraft = $state<DepotDraft>(emptyDraft());
	let savingId = $state<string | null>(null);

	function openCreate() {
		createDraft = emptyDraft();
		createOpen = true;
	}

	function expand(depot: Depot) {
		if (expandedId === depot.id) {
			expandedId = null;
			return;
		}
		expandedId = depot.id;
		editDraft = toDraft(depot);
	}

	async function createDepot() {
		creating = true;
		try {
			const { archived: _archived, ...values } = payload(createDraft);

			const { data: created, error } = await api.depots.post({ groupId, ...values });
			if (!created) throw error;

			toasts.success(m.dashboard_depots_created({ number: createDraft.number }));
			createOpen = false;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_depots_could_not_create_depot()));
		} finally {
			creating = false;
		}
	}

	async function saveDepot(depotId: string) {
		savingId = depotId;
		try {
			const { error } = await api.depots({ depotId }).patch(payload(editDraft));
			if (error) throw error;

			toasts.success(m.dashboard_depots_depot_saved());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_depots_could_not_save_depot()));
		} finally {
			savingId = null;
		}
	}

	async function deleteDepot(depot: Depot) {
		if (
			!confirm(
				m.dashboard_depots_delete_confirm({ number: depot.number, name: depot.name })
			)
		)
			return;

		savingId = depot.id;
		try {
			const { error } = await api.depots({ depotId: depot.id }).delete();
			if (error) throw error;

			toasts.success(m.dashboard_depots_depot_deleted());
			expandedId = null;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_depots_could_not_delete_depot()));
		} finally {
			savingId = null;
		}
	}
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
	<div class="space-y-3">
		{#each data.depots as depot (depot.id)}
			{@const open = expandedId === depot.id}
			<div class="card overflow-hidden {depot.archived ? 'opacity-60' : ''}">
				<button
					type="button"
					onclick={() => expand(depot)}
					aria-expanded={open}
					class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-background-secondary/60"
				>
					<DepotBadge
						number={depot.number}
						color={depot.color}
						icon={depot.icon}
						name={depot.name}
						size="sm"
					/>

					<div class="min-w-0 flex-1">
						<p class="truncate font-medium text-text">{depot.name}</p>
						{#if depot.description}
							<p class="truncate text-sm text-text-muted">{depot.description}</p>
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
							<Badge>{depot.images.length} {depot.images.length === 1 ? 'image' : 'images'}</Badge>
						{/if}
					</div>

					<IconChevronDown
						size={18}
						class="shrink-0 text-text-muted transition-transform {open ? 'rotate-180' : ''}"
					/>
				</button>

				{#if open}
					<div class="space-y-6 border-t border-border-base p-4">
						<FieldGroup title={m.dashboard_depots_depot()} description={m.dashboard_depots_how_game_identifies_spawn()}>
							<Field label={m.dashboard_depots_depot_number()} hint={m.dashboard_depots_number_game_uses_spawn_location()}>
								<Input type="number" min="0" max="9999" bind:value={editDraft.number} />
							</Field>

							<Field label={m.common_name()}>
								<Input bind:value={editDraft.name} maxlength={60} />
							</Field>

							<Field label={m.common_color()}>
								<ColorInput bind:value={editDraft.color} />
							</Field>

							<Field label={m.common_description()} class="sm:col-span-2">
								<Textarea
									bind:value={editDraft.description}
									rows={3}
									maxlength={2000}
									placeholder={m.dashboard_depots_where_what_runs_from_anything_worth()}
								/>
							</Field>

							<Field
								label={m.dashboard_depots_other_names_game()}
								hint={m.dashboard_depots_comma_separated_dispatch_matches_spawn_name()}
								class="sm:col-span-2"
							>
								<Input bind:value={editDraft.aliases} placeholder={m.dashboard_depots_e_g_hardbass_island()} />
							</Field>

							<div class="sm:col-span-2">
								<IconUploader
									groupId={data.group.id}
									ownerType="DEPOT"
									ownerId={depot.id}
									current={depot.icon}
									label={m.dashboard_depots_depot_icon()}
									hint={m.dashboard_depots_replaces_numbered_tile_wherever_depot_appears()}
								/>
							</div>
						</FieldGroup>

						<FieldGroup title={m.common_public_page()} description={m.dashboard_depots_what_visitors_group_see()} columns={1}>
							<Field label={m.common_visibility()} hint={m.dashboard_depots_members_only_keeps_depot_inside_dashboard()}>
								<Select
									bind:value={editDraft.visibility}
									options={visibilities}
									class="sm:max-w-64"
								/>
							</Field>

							<Toggle
								bind:checked={editDraft.showOnGroupPage}
								disabled={editDraft.visibility !== 'PUBLIC'}
								label={m.dashboard_depots_list_group_page()}
								description={editDraft.visibility === 'PUBLIC'
									? m.dashboard_depots_off_keeps_depot_at_its_own()
									: m.dashboard_depots_members_only_depots_never_appear_group()}
							/>

							<ImageManager
								groupId={data.group.id}
								ownerType="DEPOT"
								ownerId={depot.id}
								images={depot.images}
								label={m.dashboard_depots_depot_images()}
								hint={m.dashboard_depots_shown_public_page_up_12_images()}
							/>
						</FieldGroup>

						<FieldGroup title={m.dashboard_depots_availability()} columns={1}>
							<Toggle
								bind:checked={editDraft.archived}
								label={m.common_disabled()}
								description={m.dashboard_depots_hidden_from_dispatch_public_page_routes()}
							/>
						</FieldGroup>

						<div class="flex flex-wrap gap-2 border-t border-border-base pt-4">
							<Button onclick={() => saveDepot(depot.id)} loading={savingId === depot.id}>
								{m.common_save_changes()}
							</Button>
							<Button
								variant="danger"
								onclick={() => deleteDepot(depot)}
								disabled={savingId === depot.id}
							>
								<IconTrash size={16} /> {m.common_delete()}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<Modal bind:open={createOpen} title={m.dashboard_depots_new_depot()} description={m.dashboard_depots_give_number_game_uses()}>
	<div class="space-y-6">
		<FieldGroup title={m.dashboard_depots_depot()} description={m.dashboard_depots_how_game_identifies_spawn()}>
			<Field label={m.dashboard_depots_depot_number()}>
				<Input type="number" min="0" max="9999" bind:value={createDraft.number} />
			</Field>

			<Field label={m.common_name()}>
				<Input bind:value={createDraft.name} maxlength={60} placeholder={m.dashboard_depots_e_g_cat_island()} />
			</Field>

			<Field label={m.common_color()}>
				<ColorInput bind:value={createDraft.color} />
			</Field>

			<Field label={m.common_description()} class="sm:col-span-2">
				<Textarea bind:value={createDraft.description} rows={3} maxlength={2000} />
			</Field>

			<Field
				label={m.dashboard_depots_other_names_game()}
				hint={m.dashboard_depots_comma_separated_only_needed_when_game()}
				class="sm:col-span-2"
			>
				<Input bind:value={createDraft.aliases} placeholder={m.dashboard_depots_e_g_hardbass_island()} />
			</Field>
		</FieldGroup>

		<FieldGroup title={m.common_public_page()} columns={1}>
			<Field label={m.common_visibility()}>
				<Select bind:value={createDraft.visibility} options={visibilities} class="sm:max-w-64" />
			</Field>

			<Toggle
				bind:checked={createDraft.showOnGroupPage}
				disabled={createDraft.visibility !== 'PUBLIC'}
				label={m.dashboard_depots_list_group_page()}
				description={m.dashboard_depots_off_keeps_depot_at_its_own()}
			/>
		</FieldGroup>
	</div>

	<p class="mt-3 text-xs text-text-subtle">
		{m.dashboard_depots_icon_images_can_added_once_depot()}
	</p>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (createOpen = false)}>{m.common_cancel()}</Button>
		<Button onclick={createDepot} loading={creating} disabled={!createDraft.name.trim()}>
			{m.dashboard_depots_create_depot()}
		</Button>
	{/snippet}
</Modal>
