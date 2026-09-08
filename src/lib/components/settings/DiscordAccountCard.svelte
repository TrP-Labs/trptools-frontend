<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { IconBrandDiscord } from '@tabler/icons-svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { announceDiscordResult, startDiscordLink } from '$lib/utils/discordLink';
	import { formatRelative } from '$lib/utils/format';
	import type { DiscordAccount } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * The Discord account connected to this TrP Tools one.
	 *
	 * Nothing on the site is gated on it. A group may require one before it
	 * accepts a sign-up or a staff application, and that is the whole of what
	 * connecting decides — which is why this card explains what it is *for*
	 * rather than asking for it.
	 */
	interface Props {
		account: DiscordAccount | null;
		/** Re-reads the account after it changes. */
		onchange: () => Promise<void> | void;
	}

	let { account, onchange }: Props = $props();

	let busy = $state(false);

	// Discord sends the browser back here with a marker in the URL rather than
	// a toast, since the callback is a fresh navigation holding no client
	// state. `afterNavigate` rather than an effect — see the helper.
	afterNavigate(() => announceDiscordResult(() => void onchange()));

	async function connect() {
		busy = true;
		// The button stays busy while the browser is on its way to Discord;
		// only a failure to get started hands the page back.
		if (!(await startDiscordLink('/settings'))) busy = false;
	}

	async function disconnect() {
		if (!confirm(m.settings_discord_disconnect_confirm())) return;

		busy = true;
		try {
			const { error } = await api.auth.discord.delete();
			if (error) throw error;

			toasts.success(m.settings_discord_disconnected());
			await onchange();
		} catch (error) {
			toasts.error(errorMessage(error, m.settings_discord_could_not_disconnect()));
		} finally {
			busy = false;
		}
	}
</script>

<Card
	title={m.settings_discord_account()}
	description={m.settings_discord_groups_running_shifts_can_reach_you()}
>
	{#snippet actions()}
		{#if account}
			<Button variant="secondary" loading={busy} onclick={connect}>
				{m.settings_discord_change_account()}
			</Button>
			<Button variant="danger" disabled={busy} onclick={disconnect}>
				{m.settings_discord_disconnect()}
			</Button>
		{:else}
			<Button loading={busy} onclick={connect}>
				<IconBrandDiscord size={16} /> {m.settings_discord_connect()}
			</Button>
		{/if}
	{/snippet}

	<div class="flex flex-wrap items-center gap-3">
		{#if account}
			<Avatar src={account.avatar} name={account.username} size={44} />
			<div class="min-w-0">
				<p class="truncate font-medium text-text">{account.username}</p>
				{#if account.linkedAt}
					<p class="text-xs text-text-subtle">
						{m.settings_discord_connected_ago({ when: formatRelative(account.linkedAt) })}
					</p>
				{/if}
			</div>
		{:else}
			<span class="text-text-subtle"><IconBrandDiscord size={28} stroke={1.5} /></span>
			<p class="text-sm text-text-muted">{m.settings_discord_nothing_connected()}</p>
		{/if}
	</div>
</Card>
