<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconBrandDiscord, IconLock } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import DiscordSetting from '$lib/components/bot/DiscordSetting.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { RankSignup } from '$lib/api/types';

	/**
	 * Where this rank's sign-up sheet is posted in Discord.
	 *
	 * Covered over entirely when no bot is connected: settings that cannot
	 * take effect are worse than settings that are absent.
	 */
	interface Props {
		groupId: string;
		groupSlug: string;
		rankId: string;
		signup: RankSignup | null;
		botConnected: boolean;
		channelNames?: Record<string, string>;
		roleNames?: Record<string, string>;
	}

	let {
		groupId,
		groupSlug,
		rankId,
		signup,
		botConnected,
		channelNames = {},
		roleNames = {}
	}: Props = $props();

	let busy = $state(false);

	async function save(patch: Record<string, unknown>) {
		busy = true;
		try {
			const { error } = await api.ranks({ rankId }).signup.put(patch);
			if (error) throw error;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save that setting'));
		} finally {
			busy = false;
		}
	}
</script>

{#if !signup}
	<EmptyState
		title="No sign-up sheet yet"
		description="Add a sheet in Sign-ups first — there is nothing to post until there is."
	>
		{#snippet icon()}<IconBrandDiscord size={28} stroke={1.5} />{/snippet}
	</EmptyState>
{:else}
	<div class="relative overflow-hidden rounded-lg border border-border-base">
		<div class="space-y-3 p-4" class:pointer-events-none={!botConnected}>
			<p class="text-sm text-text-muted">
				Post this rank's sheet in Discord as well. Sign-ups stay in step both ways.
			</p>

			<DiscordSetting
				{groupId}
				kind="channel"
				label="Sheet channel"
				description="Where this rank's sheet is posted."
				value={signup.discordChannel}
				names={channelNames}
				disabled={busy || !botConnected}
				onchange={(discordChannel) => save({ discordChannel })}
			/>

			<DiscordSetting
				{groupId}
				kind="role"
				label="Ping role"
				description="Pinged when the sheet goes up."
				value={signup.discordPingRole}
				names={roleNames}
				disabled={busy || !botConnected}
				onchange={(discordPingRole) => save({ discordPingRole })}
			/>
		</div>

		{#if !botConnected}
			<div
				class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/80 px-4 text-center backdrop-blur-[2px]"
			>
				<IconLock size={20} class="text-text-subtle" />
				<p class="text-sm text-text-muted">Connect a Discord server to post this sheet there too.</p>
				<Button size="sm" variant="secondary" href="/dashboard/{groupSlug}/bot">
					<IconBrandDiscord size={15} /> Set up the bot
				</Button>
			</div>
		{/if}
	</div>
{/if}
