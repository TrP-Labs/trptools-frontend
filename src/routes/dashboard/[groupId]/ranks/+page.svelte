<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		IconBan,
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

	async function patchRank(rankId: string, body: Record<string, unknown>) {
		busyId = rankId;
		try {
			const { error } = await api.ranks({ rankId }).patch(body);
			if (error) throw error;
			await invalidateAll();
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
			await invalidateAll();
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
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not unbind that rank'));
		} finally {
			busyId = null;
		}
	}
</script>

<PageHeader
	title="Ranks"
	description="Map your Roblox roles to what they can do here. Access follows Roblox, so promotions apply on their own. Ranks marked visible appear on your public roster."
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
			<div class="card p-4">
				<div class="flex flex-wrap items-start gap-4">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<span
								class="inline-block size-3 shrink-0 rounded-full"
								style="background: {rank.color}"
							></span>
							<p class="font-medium text-text">{rank.cachedName}</p>
							<Badge>Rank {rank.cachedRank}</Badge>
							{#if isOwner}<Badge tone="accent">Owner</Badge>{/if}
						</div>
						<p class="mt-1 text-xs text-text-muted">
							{PERMISSION_DESCRIPTIONS[rank.permissionLevel]}
						</p>
					</div>

					<div class="flex shrink-0 items-center gap-1">
						{#each levels as option (option.level)}
							{@const active = rank.permissionLevel === option.level}
							<button
								type="button"
								disabled={isOwner || busyId === rank.id}
								title={PERMISSION_LABELS[option.level]}
								aria-label={PERMISSION_LABELS[option.level]}
								aria-pressed={active}
								onclick={() => patchRank(rank.id, { permissionLevel: option.level })}
								class="rounded-lg border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50
									{active
									? 'border-accent bg-accent/15 text-accent'
									: 'border-border-base text-text-subtle hover:text-text'}"
							>
								<option.icon size={17} />
							</button>
						{/each}
					</div>
				</div>

				<div class="mt-4 space-y-4 border-t border-border-base pt-4">
					<Field
						label="Roster description"
						hint="Shown under this rank on the group's public roster."
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

					<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
						<div class="flex items-center gap-2">
							<span class="text-xs font-semibold tracking-wide text-text-muted uppercase">Colour</span>
							<ColorInput
								value={rank.color}
								disabled={busyId === rank.id}
								oncommit={(color) => patchRank(rank.id, { color })}
							/>
						</div>

						<div class="min-w-56 flex-1">
							<Toggle
								checked={rank.visible}
								label="Show on public roster"
								description="Lists this rank and the people holding it on your public page."
								onchange={(visible) => patchRank(rank.id, { visible })}
							/>
						</div>

						<div class="flex gap-1">
							<Button
								size="sm"
								variant="ghost"
								onclick={() => patchRank(rank.id, { refresh: true })}
								disabled={busyId === rank.id}
							>
								<IconRefresh size={15} /> Refresh
							</Button>

							{#if !isOwner}
								<Button
									size="sm"
									variant="ghost"
									onclick={() => unbindRank(rank.id, rank.cachedName)}
									disabled={busyId === rank.id}
								>
									<IconTrash size={15} />
								</Button>
							{/if}
						</div>
					</div>
				</div>
				<RankSignupEditor
					{groupId}
					groupSlug={data.group.slug}
					rankId={rank.id}
					rankName={rank.cachedName}
					rankColor={rank.color}
					signup={data.signups[rank.id] ?? null}
					botConnected={data.botConnected}
					channelNames={data.channelNames}
					roleNames={data.roleNames}
				/>
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
