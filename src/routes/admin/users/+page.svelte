<script lang="ts">
	import { untrack } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { IconBan, IconClockPause, IconSearch, IconUserCheck, IconUsers } from '@tabler/icons-svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import BanDialog from '$lib/components/moderation/BanDialog.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatDateTime, formatRelative } from '$lib/utils/format';
	import type { AdminUser } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Seeded from the URL once; after that the box is the user's to type in.
	let term = $state(untrack(() => data.q));
	let busyId = $state<string | null>(null);

	// One dialog instance for the whole list, opened against a row.
	let pending = $state<AdminUser | null>(null);
	let mode = $state<'suspend' | 'ban'>('suspend');

	const filters = [
		{ value: 'ALL', label: 'All' },
		{ value: 'BANNED', label: 'Suspended' }
	] as const;

	function search(status = data.status) {
		const params = new URLSearchParams();
		if (term.trim()) params.set('q', term.trim());
		if (status !== 'ALL') params.set('status', status);

		return goto(`/admin/users${params.size > 0 ? `?${params}` : ''}`, { keepFocus: true });
	}

	function open(user: AdminUser, next: 'suspend' | 'ban') {
		mode = next;
		pending = user;
	}

	function name(user: AdminUser) {
		return user.displayName ?? user.username ?? `Roblox ${user.robloxId}`;
	}

	async function lift(user: AdminUser) {
		busyId = user.userId;
		try {
			const { error } = await api.admin.users({ userId: user.userId }).unban.post({});
			if (error) throw error;

			toasts.success(`${name(user)} can sign in again`);
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not lift that suspension'));
		} finally {
			busyId = null;
		}
	}
</script>

<form
	class="mb-4 flex flex-wrap gap-2"
	onsubmit={(event) => {
		event.preventDefault();
		search();
	}}
>
	<div class="min-w-56 flex-1">
		<Input bind:value={term} placeholder="Username, display name or Roblox ID" maxlength={100} />
	</div>
	<Button type="submit" variant="secondary"><IconSearch size={15} /> Search</Button>
</form>

<div class="mb-4 flex gap-1.5">
	{#each filters as filter (filter.value)}
		<button
			type="button"
			onclick={() => search(filter.value)}
			aria-pressed={data.status === filter.value}
			class="rounded-lg border px-3 py-1.5 text-sm transition-colors
				{data.status === filter.value
				? 'border-accent bg-accent/15 text-accent'
				: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
		>
			{filter.label}
		</button>
	{/each}
</div>

{#if data.users.length === 0}
	<EmptyState
		title="No accounts found"
		description={data.status === 'BANNED'
			? 'Nobody is suspended right now.'
			: data.q
				? 'Nothing matched that search.'
				: 'Accounts appear here once somebody has signed in.'}
	>
		{#snippet icon()}<IconUsers size={28} stroke={1.5} />{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-3">
		{#each data.users as user (user.userId)}
			<li class="card flex flex-wrap items-start gap-4 p-4">
				<Avatar src={user.avatar} name={name(user)} size={40} />

				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<a href="/users/{user.userId}" class="font-medium text-text hover:underline">
							{name(user)}
						</a>
						{#if user.siteRank === 'admin'}
							<Badge tone="accent">Site admin</Badge>
						{/if}
						{#if user.ban?.active}
							<Badge tone="danger">
								{user.ban.expiresAt ? 'Suspended' : 'Banned'}
							</Badge>
						{:else if user.ban}
							<Badge>Suspension lapsed</Badge>
						{/if}
					</div>

					<p class="mt-0.5 text-xs text-text-subtle">
						{user.username ? `@${user.username} · ` : ''}Roblox {user.robloxId} · joined
						{formatRelative(user.createdAt)}
					</p>

					{#if user.ban}
						<div class="mt-2 rounded-lg bg-background-secondary px-3 py-2 text-sm text-text-muted">
							<p>
								{user.ban.expiresAt
									? `${user.ban.active ? 'Lifts' : 'Lifted'} ${formatDateTime(user.ban.expiresAt)}`
									: 'Permanent'}
								· set {formatRelative(user.ban.bannedAt)}
								{#if user.ban.by}
									by {user.ban.by.displayName ?? user.ban.by.username}
								{/if}
							</p>
							{#if user.ban.reason}
								<p class="mt-1 text-text">{user.ban.reason}</p>
							{/if}
						</div>
					{/if}
				</div>

				{#if user.siteRank !== 'admin'}
					<div class="flex shrink-0 flex-wrap gap-2">
						{#if user.ban?.active}
							<Button size="sm" loading={busyId === user.userId} onclick={() => lift(user)}>
								<IconUserCheck size={15} /> Lift
							</Button>
						{:else}
							<Button size="sm" variant="secondary" onclick={() => open(user, 'suspend')}>
								<IconClockPause size={15} /> Suspend
							</Button>
							<Button size="sm" variant="danger" onclick={() => open(user, 'ban')}>
								<IconBan size={15} /> Ban
							</Button>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<BanDialog
	target={pending}
	{mode}
	onclose={() => (pending = null)}
	ondone={() => invalidateAll()}
/>
