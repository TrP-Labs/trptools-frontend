<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconBrandDiscord, IconLock } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DiscordSetting from '$lib/components/bot/DiscordSetting.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { SignupSheetDetail } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * Where this sheet is posted in Discord.
	 *
	 * Covered over entirely when no bot is connected: settings that cannot
	 * take effect are worse than settings that are absent.
	 */
	interface Props {
		groupId: string;
		groupSlug: string;
		sheet: SignupSheetDetail;
		botConnected: boolean;
		channelNames?: Record<string, string>;
		roleNames?: Record<string, string>;
	}

	let {
		groupId,
		groupSlug,
		sheet,
		botConnected,
		channelNames = {},
		roleNames = {}
	}: Props = $props();

	let busy = $state(false);

	async function save(patch: Record<string, unknown>) {
		busy = true;
		try {
			const { error } = await api.signups({ sheetId: sheet.id }).patch(patch);
			if (error) throw error;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.signups_could_not_save_setting()));
		} finally {
			busy = false;
		}
	}
</script>

<div class="relative overflow-hidden rounded-lg border border-border-base">
	<div class="space-y-3 p-4" class:pointer-events-none={!botConnected}>
		<p class="text-sm text-text-muted">{m.signups_discord_hint()}</p>

		<DiscordSetting
			{groupId}
			kind="channel"
			label={m.shifts_rank_signup_discord_sheet_channel()}
			description={m.signups_discord_channel_hint()}
			value={sheet.discordChannel}
			names={channelNames}
			disabled={busy || !botConnected}
			onchange={(discordChannel) => save({ discordChannel })}
		/>

		<DiscordSetting
			{groupId}
			kind="role"
			label={m.shifts_rank_signup_discord_ping_role()}
			description={m.shifts_rank_signup_discord_pinged_when_sheet_goes_up()}
			value={sheet.discordPingRole}
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
			<p class="text-sm text-text-muted">
				{m.shifts_rank_signup_discord_connect_discord_server_post_sheet_there()}
			</p>
			<Button size="sm" variant="secondary" href="/dashboard/{groupSlug}/bot">
				<IconBrandDiscord size={15} /> {m.shifts_rank_signup_discord_set_up_bot()}
			</Button>
		</div>
	{/if}
</div>
