<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconBan,
		IconChevronDown,
		IconClipboardList,
		IconCrown,
		IconHeadphones,
		IconMicrophone,
		IconPlus,
		IconRefresh,
		IconTrash,
		IconUsers
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import FieldGroup from '$lib/components/ui/FieldGroup.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import RankSignupEditor from '$lib/components/shifts/RankSignupEditor.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { PERMISSION_DESCRIPTIONS, PERMISSION_LABELS } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let groupId = $derived(data.group.id);

	const levels = [
		{ level: 0, icon: IconBan },
		{ level: 1, icon: IconHeadphones },
		{ level: 2, icon: IconMicrophone },
		{ level: 3, icon: IconCrown }
	];

	let bindOpen = $state(false);
	let busyId = $state<string | null>(null);

	/**
	 * One rank open at a time, like the routes and depots screens.
	 *
	 * Every rank used to be laid out in full, sign-up sheet and all, so a group
	 * with six ranks opened on a wall of controls with no way to tell which
	 * belonged to which. The row says what a rank is; the panel is for changing
	 * it.
	 */
	let expandedId = $state<string | null>(null);

	function toggleExpanded(rankId: string) {
		expandedId = expandedId === rankId ? null : rankId;
	}

	async function patchRank(rankId: string, body: Record<string, unknown>) {
		busyId = rankId;
		try {
			const { error } = await api.ranks({ rankId }).patch(body);
			if (error) throw error;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not update that rank'));
		} finally {
			busyId = null;
		}
	}

	async function bindRank(robloxId: string, name: string) {
		busyId = robloxId;
		try {
			const { error } = await api.ranks.group({ groupId }).post({ robloxId });
			if (error) throw error;

			toasts.success(`Bound ${name}`);
			bindOpen = false;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not bind that rank'));
		} finally {
			busyId = null;
		}
	}

	async function unbindRank(rankId: string, name: string) {
		if (!confirm(`Unbind “${name}”? Members holding it will lose TrP Tools access.`)) return;

		busyId = rankId;
		try {
			const { error } = await api.ranks({ rankId }).delete();
			if (error) throw error;

			toasts.success('Rank unbound');
			if (expandedId === rankId) expandedId = null;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not unbind that rank'));
		} finally {
			busyId = null;
		}
	}
</script>

<PageHeader
	title="Ranks"
	description="Map your Roblox roles to what they can do here. Access follows Roblox, so promotions apply on their own. Ranks marked visible appear on your public staff list."
>
	{#snippet actions()}
		<Button onclick={() => (bindOpen = true)}><IconPlus size={16} /> Bind a role</Button>
	{/snippet}
</PageHeader>

{#if data.ranks.length === 0}
	<EmptyState title="No ranks bound" description="Bind a Roblox role to grant access.">
		{#snippet icon()}<IconUsers size={28} stroke={1.5} />{/snippet}
	</EmptyState>
{:else}
	<div class="space-y-3">
		{#each data.ranks as rank (rank.id)}
			{@const isOwner = rank.cachedRank === 255}
			{@const open = expandedId === rank.id}
			{@const sheet = data.signups[rank.id] ?? null}
			<div class="card overflow-hidden">
				<button
					type="button"
					onclick={() => toggleExpanded(rank.id)}
					aria-expanded={open}
					class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-background-secondary/60"
				>
					<span
						class="inline-block size-3 shrink-0 rounded-full"
						style="background: {rank.color}"
					></span>

					<div class="min-w-0 flex-1">
						<p class="truncate font-medium text-text">{rank.cachedName}</p>
						<p class="truncate text-sm text-text-muted">
							{PERMISSION_DESCRIPTIONS[rank.permissionLevel]}
						</p>
					</div>

					<div class="hidden shrink-0 items-center gap-2 sm:flex">
						{#if isOwner}<Badge tone="accent">Owner</Badge>{/if}
						<Badge>Rank {rank.cachedRank}</Badge>
						<Badge tone={rank.permissionLevel > 0 ? 'accent' : undefined}>
							{PERMISSION_LABELS[rank.permissionLevel]}
						</Badge>
						{#if rank.visible}<Badge>On staff list</Badge>{/if}
						{#if sheet}
							<Badge><IconClipboardList size={13} /> Sheet</Badge>
						{/if}
					</div>

					<IconChevronDown
						size={18}
						class="shrink-0 text-text-muted transition-transform {open ? 'rotate-180' : ''}"
					/>
				</button>

				{#if open}
					<div class="space-y-6 border-t border-border-base p-4">
						<FieldGroup
							title="Access"
							description="What members holding this rank can do here."
							columns={1}
						>
							<div class="flex flex-wrap items-center gap-1">
								{#each levels as option (option.level)}
									{@const active = rank.permissionLevel === option.level}
									<button
										type="button"
										disabled={isOwner || busyId === rank.id}
										title={PERMISSION_DESCRIPTIONS[option.level]}
										aria-pressed={active}
										onclick={() => patchRank(rank.id, { permissionLevel: option.level })}
										class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors
											disabled:cursor-not-allowed disabled:opacity-50
											{active
											? 'border-accent bg-accent/15 text-accent'
											: 'border-border-base text-text-subtle hover:text-text'}"
									>
										<option.icon size={17} />
										{PERMISSION_LABELS[option.level]}
									</button>
								{/each}
							</div>

							{#if isOwner}
								<p class="text-xs text-text-subtle">
									The owner rank always keeps full access, so it cannot be changed here.
								</p>
							{/if}
						</FieldGroup>

						<FieldGroup
							title="Staff list"
							description="How this rank appears on the group's public page."
							columns={1}
						>
							<Toggle
								checked={rank.visible}
								label="Show on the public staff list"
								description="Lists this rank and the people holding it on your public page."
								disabled={busyId === rank.id}
								onchange={(visible) => patchRank(rank.id, { visible })}
							/>

							<div class="grid gap-4 sm:grid-cols-[1fr_auto]">
								<Field
									label="Description"
									hint="Shown under this rank on the group's public staff list."
								>
									<Input
										value={rank.description}
										maxlength={300}
										disabled={busyId === rank.id}
										placeholder="e.g. Drives assigned routes on shift."
										onblur={(event) => {
											const next = (event.currentTarget as HTMLInputElement).value;
											if (next !== rank.description) patchRank(rank.id, { description: next });
										}}
									/>
								</Field>

								<Field label="Colour">
									<ColorInput
										value={rank.color}
										disabled={busyId === rank.id}
										oncommit={(color) => patchRank(rank.id, { color })}
									/>
								</Field>
							</div>
						</FieldGroup>

						<RankSignupEditor
							{groupId}
							groupSlug={data.group.slug}
							rankId={rank.id}
							rankName={rank.cachedName}
							rankColor={rank.color}
							signup={sheet}
							botConnected={data.botConnected}
							channelNames={data.channelNames}
							roleNames={data.roleNames}
						/>

						<div class="flex flex-wrap gap-2 border-t border-border-base pt-4">
							<Button
								size="sm"
								variant="secondary"
								onclick={() => patchRank(rank.id, { refresh: true })}
								disabled={busyId === rank.id}
							>
								<IconRefresh size={15} /> Refresh from Roblox
							</Button>

							{#if !isOwner}
								<Button
									size="sm"
									variant="ghost"
									onclick={() => unbindRank(rank.id, rank.cachedName)}
									disabled={busyId === rank.id}
								>
									<IconTrash size={15} /> Unbind
								</Button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<Modal
	bind:open={bindOpen}
	title="Bind a Roblox role"
	description="Roles in your Roblox group that are not bound yet."
>
	{#if data.creatable.length === 0}
		<p class="text-sm text-text-muted">Every role in this group is already bound.</p>
	{:else}
		<ul class="space-y-2">
			{#each data.creatable as role (role.robloxId)}
				<li
					class="flex items-center gap-3 rounded-lg border border-border-base bg-background-secondary p-3"
				>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-text">{role.name}</p>
						<p class="text-xs text-text-subtle">Rank {role.rank}</p>
					</div>
					<Button
						size="sm"
						loading={busyId === role.robloxId}
						onclick={() => bindRank(role.robloxId, role.name)}
					>
						Bind
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
