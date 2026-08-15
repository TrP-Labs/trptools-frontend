<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
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
	import { PERMISSION_LABELS } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let addOpen = $state(false);
	let addingId = $state<string | null>(null);

	async function addGroup(robloxId: string) {
		addingId = robloxId;
		try {
			const { data: created, error } = await api.groups.post({ robloxId });
			if (!created) throw error;

			toasts.success('Group added');
			addOpen = false;
			await invalidateAll();
			await goto(`/dashboard/${created.slug}`);
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not add that group'));
		} finally {
			addingId = null;
		}
	}
</script>

<svelte:head><title>Dashboard — TrP Tools</title></svelte:head>

<div class="mx-auto max-w-7xl px-4 py-10">
	<PageHeader title="Dashboard" description="Groups you can manage or dispatch for.">
		{#snippet actions()}
			<Button onclick={() => (addOpen = true)}>
				<IconPlus size={16} /> Add group
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.groups.length === 0}
		<EmptyState
			title="No groups yet"
			description="Add a Roblox group you own to start managing routes, shifts and dispatch."
		>
			{#snippet icon()}<IconUsersGroup size={28} stroke={1.5} />{/snippet}
			{#snippet action()}
				<Button onclick={() => (addOpen = true)}><IconPlus size={16} /> Add group</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.groups as group (group.id)}
				<li>
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
							<Badge tone="accent">{PERMISSION_LABELS[group.permissionLevel]}</Badge>
							<Badge tone={group.visibility === 'PUBLIC' ? 'success' : 'neutral'}>
								{group.visibility === 'PUBLIC'
									? 'Public'
									: group.visibility === 'UNLISTED'
										? 'Unlisted'
										: 'Private'}
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
	title="Add a group"
	description="Only Roblox groups you own can be added to TrP Tools."
>
	{#if data.creatable.length === 0}
		<p class="text-sm text-text-muted">
			No eligible groups found. You need to be the owner of a Roblox group, and it must not already
			be on TrP Tools. If you just claimed ownership, it can take a minute to show up here.
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
						Add
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
