<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import { IconPlus, IconUsersGroup } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatNumber } from '$lib/utils/format';
	import { permissionLabel } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let addOpen = $state(false);
	let addingId = $state<string | null>(null);

	async function addGroup(robloxId: string) {
		addingId = robloxId;
		try {
			const { data: created, error } = await api.groups.post({ robloxId });
			if (!created) throw error;

			toasts.success(m.dashboard_group_added());
			addOpen = false;
			await refreshData();
			await goto(`/dashboard/${created.slug}`);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_could_not_add_group()));
		} finally {
			addingId = null;
		}
	}
</script>

<svelte:head><title>{m.dashboard_dashboard_trp_tools()}</title></svelte:head>

<div class="mx-auto max-w-7xl px-4 py-10">
	<PageHeader title={m.common_dashboard()} description={m.dashboard_groups_can_manage_dispatch()}>
		{#snippet actions()}
			<Button onclick={() => (addOpen = true)}>
				<IconPlus size={16} /> {m.dashboard_add_group_2()}
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.groups.length === 0}
		<EmptyState
			title={m.dashboard_no_groups_yet()}
			description={m.dashboard_add_roblox_group_own_start_managing()}
		>
			{#snippet icon()}<IconUsersGroup size={28} stroke={1.5} />{/snippet}
			{#snippet action()}
				<Button onclick={() => (addOpen = true)}><IconPlus size={16} /> {m.dashboard_add_group_2()}</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<!-- A grid item sizes its track to its own content unless given a minimum. -->
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.groups as group (group.id)}
				<li class="min-w-0">
					<a
						href="/dashboard/{group.slug}"
						class="card flex h-full flex-col p-5 transition-colors hover:border-border-strong"
					>
						<div class="flex items-center gap-3">
							<Avatar src={group.icon} name={group.name} size={44} />
							<div class="min-w-0">
								<h2 class="truncate font-semibold text-text">{group.name}</h2>
								<p class="text-xs text-text-muted">{formatNumber(group.members)} members</p>
							</div>
						</div>

						{#if group.tagline}
							<p class="mt-3 line-clamp-2 text-sm text-text-muted">{group.tagline}</p>
						{/if}

						<div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
							<Badge tone="accent">{permissionLabel(group.permissionLevel)}</Badge>
							<Badge tone={group.visibility === 'PUBLIC' ? 'success' : 'neutral'}>
								{group.visibility === 'PUBLIC'
									? m.common_public()
									: group.visibility === 'UNLISTED'
										? m.dashboard_unlisted()
										: m.dashboard_private()}
							</Badge>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<Modal
	bind:open={addOpen}
	title={m.dashboard_add_group()}
	description={m.dashboard_only_roblox_groups_own_can_added()}
>
	{#if data.creatable.length === 0}
		<p class="text-sm text-text-muted">
			{m.dashboard_no_eligible_groups_found_need_owner()}
		</p>
	{:else}
		<ul class="space-y-2">
			{#each data.creatable as group (group.robloxId)}
				<li
					class="flex items-center gap-3 rounded-lg border border-border-base bg-background-secondary p-3"
				>
					<Avatar src={group.icon} name={group.name} size={36} />
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-text">{group.name}</p>
						<p class="text-xs text-text-subtle">Roblox ID {group.robloxId}</p>
					</div>
					<Button
						size="sm"
						loading={addingId === group.robloxId}
						onclick={() => addGroup(group.robloxId)}
					>
						{m.dashboard_add()}
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
