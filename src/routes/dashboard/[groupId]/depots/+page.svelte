<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { IconBuildingWarehouse, IconChevronDown, IconPlus, IconTrash } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
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
		{ value: 'PUBLIC' as const, label: 'Public' },
		{ value: 'PRIVATE' as const, label: 'Members only' }
	];

	let createOpen = $state(false);
	let createDraft = $state<DepotDraft>({
		number: 1,
		name: '',
		description: '',
		color: '#4287f5',
		aliases: '',
		visibility: 'PUBLIC',
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

			toasts.success(`Depot ${createDraft.number} created`);
			createOpen = false;
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not create that depot'));
		} finally {
			creating = false;
		}
	}

	async function saveDepot(depotId: string) {
		savingId = depotId;
		try {
			const { error } = await api.depots({ depotId }).patch(payload(editDraft));
			if (error) throw error;

			toasts.success('Depot saved');
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save that depot'));
		} finally {
			savingId = null;
		}
	}

	async function deleteDepot(depot: Depot) {
		if (
			!confirm(
				`Delete depot ${depot.number} (${depot.name})? Routes that only served this depot will fall back to serving all depots.`
			)
		)
			return;

		savingId = depot.id;
		try {
			const { error } = await api.depots({ depotId: depot.id }).delete();
			if (error) throw error;

			toasts.success('Depot deleted');
			expandedId = null;
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not delete that depot'));
		} finally {
			savingId = null;
		}
	}
</script>

<PageHeader
	title="Depots"
	description="Spawn locations in game, identified by number. Routes declare which depots they run from."
>
	{#snippet actions()}
		<Button variant="secondary" href="/dashboard/{data.group.slug}/routes">Routes</Button>
		<Button onclick={openCreate}><IconPlus size={16} /> New depot</Button>
	{/snippet}
</PageHeader>

{#if data.depots.length === 0}
	<EmptyState
		title="No depots"
		description="Every group normally starts with Main Island and Cat Island. Add them back to enable automatic assignment."
	>
		{#snippet icon()}<IconBuildingWarehouse size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button onclick={openCreate}><IconPlus size={16} /> New depot</Button>
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
						{#if depot.archived}<Badge>Disabled</Badge>{/if}
						{#if depot.moderation === 'HIDDEN'}<Badge tone="danger">Hidden</Badge>{/if}
						{#if depot.visibility !== 'PUBLIC'}<Badge>Members only</Badge>{/if}
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
					<div class="grid gap-4 border-t border-border-base p-4 sm:grid-cols-2">
						<Field label="Depot number" hint="The number the game uses for this spawn location.">
							<Input type="number" min="0" max="9999" bind:value={editDraft.number} />
						</Field>

						<Field label="Name">
							<Input bind:value={editDraft.name} maxlength={60} />
						</Field>

						<Field label="Colour">
							<ColorInput bind:value={editDraft.color} />
						</Field>

						<Field label="Visibility" hint="Public depots appear on the group's public page.">
							<Select bind:value={editDraft.visibility} options={visibilities} />
						</Field>

						<Field label="Description" class="sm:col-span-2">
							<Textarea
								bind:value={editDraft.description}
								rows={3}
								maxlength={2000}
								placeholder="Where it is, what runs from it, anything worth knowing."
							/>
						</Field>

						<Field
							label="Other names in game"
							hint="Comma separated. Dispatch matches the spawn name the game reports against this depot; the trailing word 'Depot' and punctuation are ignored automatically, so this is only needed when the game calls it something genuinely different."
							class="sm:col-span-2"
						>
							<Input bind:value={editDraft.aliases} placeholder="e.g. Hardbass Island" />
						</Field>

						<div class="sm:col-span-2">
							<IconUploader
								groupId={data.group.id}
								ownerType="DEPOT"
								ownerId={depot.id}
								current={depot.icon}
								label="Depot icon"
								hint="Replaces the numbered tile wherever this depot appears. Square images work best. Saved as soon as it uploads."
							/>
						</div>

						<div class="sm:col-span-2">
							<Toggle
								bind:checked={editDraft.archived}
								label="Disabled"
								description="Hidden from dispatch and the public page. Routes keep their link to it."
							/>
						</div>

						<div class="sm:col-span-2">
							<ImageManager
								groupId={data.group.id}
								ownerType="DEPOT"
								ownerId={depot.id}
								images={depot.images}
								label="Depot images"
								hint="Shown on the public page. Up to 12 images."
							/>
						</div>

						<div class="flex flex-wrap gap-2 sm:col-span-2">
							<Button onclick={() => saveDepot(depot.id)} loading={savingId === depot.id}>
								Save changes
							</Button>
							<Button variant="danger" onclick={() => deleteDepot(depot)} disabled={savingId === depot.id}>
								<IconTrash size={16} /> Delete
							</Button>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<Modal bind:open={createOpen} title="New depot" description="Give it the number the game uses.">
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Depot number">
			<Input type="number" min="0" max="9999" bind:value={createDraft.number} />
		</Field>

		<Field label="Name">
			<Input bind:value={createDraft.name} maxlength={60} placeholder="e.g. Cat Island" />
		</Field>

		<Field label="Colour">
			<ColorInput bind:value={createDraft.color} />
		</Field>

		<Field label="Visibility">
			<Select bind:value={createDraft.visibility} options={visibilities} />
		</Field>

		<Field label="Description" class="sm:col-span-2">
			<Textarea bind:value={createDraft.description} rows={3} maxlength={2000} />
		</Field>

		<Field
			label="Other names in game"
			hint="Comma separated. Only needed when the game calls this depot something different."
			class="sm:col-span-2"
		>
			<Input bind:value={createDraft.aliases} placeholder="e.g. Hardbass Island" />
		</Field>
	</div>

	<p class="mt-3 text-xs text-text-subtle">
		The icon and images can be added once the depot exists.
	</p>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (createOpen = false)}>Cancel</Button>
		<Button onclick={createDepot} loading={creating} disabled={!createDraft.name.trim()}>
			Create depot
		</Button>
	{/snippet}
</Modal>
