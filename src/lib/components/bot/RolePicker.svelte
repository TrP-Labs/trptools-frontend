<script lang="ts">
	import { IconAt, IconCheck, IconRefresh, IconSearch } from '@tabler/icons-svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import PickerStatus from './PickerStatus.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { BotRole } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * Picks a Discord role to ping.
	 *
	 * Same reasoning as the channel picker: whether the bot can actually
	 * mention a role depends on the role hierarchy and on its own permissions,
	 * both of which change without warning. A role it cannot mention still
	 * posts, it just never notifies anyone — which is the quiet failure worth
	 * showing before it happens.
	 */
	interface Props {
		open: boolean;
		groupId: string;
		title?: string;
		description?: string;
		value: string | null;
		allowNone?: boolean;
		onselect: (roleId: string | null) => void;
	}

	let {
		open = $bindable(false),
		groupId,
		title = m.dashboard_bot_choose_role(),
		description,
		value,
		allowNone = true,
		onselect
	}: Props = $props();

	let roles = $state<BotRole[]>([]);
	let loading = $state(false);
	let loaded = $state(false);
	let search = $state('');

	async function load(refresh = false) {
		loading = true;
		try {
			const { data, error } = await api
				.bot({ groupId })
				.roles.get(refresh ? { query: { refresh: '1' } } : {});
			if (error) throw error;

			roles = data ?? [];
			loaded = true;
		} catch (error) {
			toasts.error(errorMessage(error, m.bot_role_picker_could_not_read_role_list()));
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open && !loaded) void load();
	});

	let filtered = $derived(
		roles.filter((role) => role.name.toLowerCase().includes(search.trim().toLowerCase()))
	);

	function choose(roleId: string | null) {
		onselect(roleId);
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
					placeholder={m.bot_role_picker_search_roles()}
					aria-label={m.bot_role_picker_search_roles()}
					class="w-full rounded-lg border border-border-base bg-background-secondary py-2 pr-3 pl-8
						text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
				/>
			</div>

			<Button size="sm" variant="secondary" onclick={() => load(true)} disabled={loading}>
				<IconRefresh size={15} class={loading ? 'animate-spin' : ''} /> {m.bot_role_picker_refresh()}
			</Button>
		</div>

		<p class="text-xs text-text-subtle">
			{m.bot_role_picker_roles_are_listed_highest_first_one()}
		</p>

		{#if loading && roles.length === 0}
			<div class="flex justify-center py-10"><Spinner /></div>
		{:else if filtered.length === 0}
			<EmptyState
				title={search ? m.bot_role_picker_nothing_matches() : m.bot_role_picker_no_roles_found()}
				description={search
					? m.bot_role_picker_no_role_server_matches_search()
					: m.bot_role_picker_server_has_no_roles_bot_can()}
			>
				{#snippet icon()}<IconAt size={24} stroke={1.5} />{/snippet}
			</EmptyState>
		{:else}
			<ul class="space-y-1">
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
							<span class="min-w-0 flex-1 text-sm text-text-muted">{m.bot_role_picker_no_ping()}</span>
							{#if value === null}<IconCheck size={16} class="shrink-0 text-accent" />{/if}
						</button>
					</li>
				{/if}

				{#each filtered as role (role.id)}
					{@const selected = role.id === value}
					<li>
						<button
							type="button"
							onclick={() => choose(role.id)}
							class="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors
								{selected
								? 'border-accent bg-accent/10'
								: 'border-border-base hover:bg-background-secondary'}"
						>
							<span
								aria-hidden="true"
								class="size-3 shrink-0 rounded-full"
								style="background: {role.color}"
							></span>

							<span class="min-w-0 flex-1">
								<span class="flex items-center gap-2">
									<span class="truncate text-sm text-text">{role.name}</span>
									{#if role.managed}<Badge>{m.bot_role_picker_integration()}</Badge>{/if}
								</span>
								<span class="mt-0.5 flex">
									<PickerStatus
										ok={role.canMention}
										label={m.bot_role_picker_mention()}
										okText="the bot can ping this role"
										failText="the bot cannot ping this role"
									/>
								</span>
							</span>

							{#if selected}<IconCheck size={16} class="shrink-0 text-accent" />{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</Modal>
