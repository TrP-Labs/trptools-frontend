<script lang="ts">
	import { IconHash, IconRefresh, IconSearch, IconSpeakerphone, IconCheck } from '@tabler/icons-svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import PickerStatus from './PickerStatus.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { BotChannel } from '$lib/api/types';

	/**
	 * Picks a Discord channel for one setting.
	 *
	 * The list is fetched live rather than stored, because what matters is not
	 * which channels existed when the group was set up but whether the bot can
	 * post in them *now* — a permission change or a rename is invisible until
	 * something silently fails to send. The refresh button drops the API's
	 * cached guild read so a channel created seconds ago appears at once.
	 */
	interface Props {
		open: boolean;
		groupId: string;
		title?: string;
		description?: string;
		/** The currently chosen channel id, or null. */
		value: string | null;
		/** Whether "no channel" is a valid answer. */
		allowNone?: boolean;
		onselect: (channelId: string | null) => void;
	}

	let {
		open = $bindable(false),
		groupId,
		title = 'Choose a channel',
		description,
		value,
		allowNone = true,
		onselect
	}: Props = $props();

	let channels = $state<BotChannel[]>([]);
	let loading = $state(false);
	let loaded = $state(false);
	let search = $state('');

	async function load(refresh = false) {
		loading = true;
		try {
			const { data, error } = await api
				.bot({ groupId })
				.channels.get(refresh ? { query: { refresh: '1' } } : {});
			if (error) throw error;

			channels = data ?? [];
			loaded = true;
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not read the channel list'));
		} finally {
			loading = false;
		}
	}

	// Fetched when the dialog opens rather than on mount: a bot page carries
	// several of these and none should cost a Discord read until it is used.
	$effect(() => {
		if (open && !loaded) void load();
	});

	let filtered = $derived(
		channels.filter((channel) => channel.name.toLowerCase().includes(search.trim().toLowerCase()))
	);

	/** Channels keyed by their category, preserving Discord's own ordering. */
	let grouped = $derived.by(() => {
		const groups = new Map<string, BotChannel[]>();

		for (const channel of filtered) {
			const key = channel.parentName ?? '';
			const bucket = groups.get(key) ?? [];
			bucket.push(channel);
			groups.set(key, bucket);
		}

		return [...groups.entries()];
	});

	function choose(channelId: string | null) {
		onselect(channelId);
		open = false;
	}
</script>

<Modal bind:open {title} {description} size="md">
	<div class="space-y-3">
		<div class="flex gap-2">
			<div class="relative min-w-0 flex-1">
				<IconSearch
					size={15}
					class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
				/>
				<input
					bind:value={search}
					type="search"
					placeholder="Search channels"
					aria-label="Search channels"
					class="w-full rounded-lg border border-border-base bg-background-secondary py-2 pr-3 pl-8
						text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
				/>
			</div>

			<Button size="sm" variant="secondary" onclick={() => load(true)} disabled={loading}>
				<IconRefresh size={15} class={loading ? 'animate-spin' : ''} /> Refresh
			</Button>
		</div>

		<p class="text-xs text-text-subtle">
			Dots show what the bot can do in each channel right now. A channel it cannot send to will
			never receive anything, however it is configured.
		</p>

		{#if loading && channels.length === 0}
			<div class="flex justify-center py-10"><Spinner /></div>
		{:else if filtered.length === 0}
			<EmptyState
				title={search ? 'Nothing matches' : 'No channels found'}
				description={search
					? 'No channel in this server matches that search.'
					: 'The bot cannot see any channels it could post in. Check its permissions in Discord, then refresh.'}
			>
				{#snippet icon()}<IconHash size={24} stroke={1.5} />{/snippet}
			</EmptyState>
		{:else}
			<ul class="space-y-3">
				{#if allowNone}
					<li>
						<button
							type="button"
							onclick={() => choose(null)}
							class="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors
								{value === null
								? 'border-accent bg-accent/10'
								: 'border-border-base hover:bg-background-secondary'}"
						>
							<span class="min-w-0 flex-1 text-sm text-text-muted">Not set</span>
							{#if value === null}<IconCheck size={16} class="shrink-0 text-accent" />{/if}
						</button>
					</li>
				{/if}

				{#each grouped as [category, entries] (category)}
					<li>
						{#if category}
							<p
								class="px-1 pb-1 text-[0.6875rem] font-semibold tracking-wide text-text-subtle uppercase"
							>
								{category}
							</p>
						{/if}

						<ul class="space-y-1">
							{#each entries as channel (channel.id)}
								{@const selected = channel.id === value}
								<li>
									<button
										type="button"
										onclick={() => choose(channel.id)}
										class="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors
											{selected
											? 'border-accent bg-accent/10'
											: 'border-border-base hover:bg-background-secondary'}"
									>
										<span class="shrink-0 text-text-subtle">
											{#if channel.type === 5}
												<IconSpeakerphone size={16} />
											{:else}
												<IconHash size={16} />
											{/if}
										</span>

										<span class="min-w-0 flex-1">
											<span class="block truncate text-sm text-text">{channel.name}</span>
											<span class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
												<PickerStatus ok={channel.canRead} label="Read" />
												<PickerStatus ok={channel.canSend} label="Send" />
											</span>
										</span>

										{#if selected}<IconCheck size={16} class="shrink-0 text-accent" />{/if}
									</button>
								</li>
							{/each}
						</ul>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</Modal>
