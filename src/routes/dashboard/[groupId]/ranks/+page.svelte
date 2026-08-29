<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconChevronRight,
		IconClipboardList,
		IconPlus,
		IconUsers
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { PERMISSION_DESCRIPTIONS, PERMISSION_LABELS } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let groupId = $derived(data.group.id);
	let base = $derived(`/dashboard/${data.group.slug}/ranks`);

	let bindOpen = $state(false);
	let busyId = $state<string | null>(null);

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
</script>

<PageHeader
	title="Ranks"
	description="Map your Roblox roles to what they can do here. Access follows Roblox, so promotions apply on their own. Open a rank to set its permissions, public listing and sign-up sheet."
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
	<!--
		A card says what a rank *is*; everything that changes one lives on its
		own page. The whole list used to open into stacked editors, so a group
		with six ranks met a wall of controls with no way to tell which belonged
		to which.
	-->
	<ul class="space-y-3">
		{#each data.ranks as rank (rank.id)}
			{@const sheet = data.signups[rank.id] ?? null}
			<li>
				<a
					href="{base}/{rank.id}"
					class="card flex items-center gap-3 p-4 transition-colors hover:border-accent/50"
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
						{#if rank.cachedRank === 255}<Badge tone="accent">Owner</Badge>{/if}
						<Badge>Rank {rank.cachedRank}</Badge>
						<Badge tone={rank.permissionLevel > 0 ? 'accent' : undefined}>
							{PERMISSION_LABELS[rank.permissionLevel]}
						</Badge>
						{#if rank.visible}<Badge>On staff list</Badge>{/if}
						{#if sheet}
							<Badge><IconClipboardList size={13} /> Sheet</Badge>
						{/if}
					</div>

					<IconChevronRight size={18} class="shrink-0 text-text-subtle" />
				</a>
			</li>
		{/each}
	</ul>
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
