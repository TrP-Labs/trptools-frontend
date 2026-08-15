<script lang="ts">
	import { IconCrown } from '@tabler/icons-svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { RoomPresence } from '$lib/api/types';

	interface Props {
		open: boolean;
		roomId: string;
		/** User ids from the stream. Re-fetches profiles when they change. */
		present: string[];
	}

	let { open = $bindable(false), roomId, present }: Props = $props();

	let people = $state<RoomPresence[]>([]);
	let loading = $state(false);

	// The stream carries ids only, so names are fetched on demand rather than
	// resolved on every join and leave.
	$effect(() => {
		if (!open) return;

		const ids = present.join(',');
		void ids;

		loading = people.length === 0;

		api
			.dispatch({ roomId })
			.presence.get()
			.then(({ data }) => {
				if (data) people = data;
			})
			.catch((error) => toasts.error(errorMessage(error, 'Could not load who is here')))
			.finally(() => (loading = false));
	});
</script>

<Modal bind:open title="In this room" description="Everyone with the dispatch stream open right now.">
	{#if loading}
		<div class="flex justify-center py-8"><Spinner /></div>
	{:else if people.length === 0}
		<p class="py-6 text-center text-sm text-text-muted">Nobody is connected right now.</p>
	{:else}
		<ul class="divide-y divide-border-base">
			{#each people as person (person.userId)}
				<li class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
					<Avatar
						src={person.avatar}
						name={person.displayName ?? person.username}
						size={32}
					/>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-text">
							{person.displayName ?? person.username ?? 'Unknown dispatcher'}
						</p>
						{#if person.username && person.displayName && person.username !== person.displayName}
							<p class="truncate text-xs text-text-subtle">@{person.username}</p>
						{/if}
					</div>
					{#if person.host}
						<Badge tone="accent"><IconCrown size={12} /> Host</Badge>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
