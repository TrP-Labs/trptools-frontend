<script lang="ts">
	import { IconAlertTriangle, IconBrandDiscord, IconCheck, IconX } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { BotCleanup, BotConfig } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * What closing a shift out takes down, and whether the bot can.
	 *
	 * The switches and the channel check belong together: deleting needs
	 * Manage Messages and Read Message History, Discord grants both per
	 * channel, and a bot that looks healthy on the Server tab can still be
	 * refused in the one channel that matters. Splitting the two apart is how
	 * a group finds out hours after a shift instead of before one.
	 */
	interface Props {
		config: BotConfig;
		cleanup: BotCleanup | null;
		busy: boolean;
		patch: (body: Partial<BotConfig>) => void;
		onreadd: () => void;
		installing: boolean;
	}

	let { config, cleanup, busy, patch, onreadd, installing }: Props = $props();
</script>

<section class="card p-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 class="text-sm font-semibold text-text">{m.dashboard_bot_end_shift_cleanup()}</h2>
			<p class="mt-1 text-xs text-text-muted">
				{m.dashboard_bot_closing_shift_out_deletes_messages_bot()}
			</p>
		</div>

		{#if cleanup && cleanup.targets.length > 0}
			{#if cleanup.ready}
				<Badge tone="success"><IconCheck size={13} /> {m.dashboard_bot_ready()}</Badge>
			{:else}
				<Badge tone="warning">
					<IconAlertTriangle size={13} />
					{m.dashboard_bot_cannot_delete()}
				</Badge>
			{/if}
		{/if}
	</div>

	<div class="mt-4 space-y-4">
		<Toggle
			checked={config.clearSignups}
			label={m.dashboard_bot_sign_up_channels()}
			description={m.dashboard_bot_sheets_themselves_come_pings_each_rank()}
			disabled={busy}
			onchange={(value) => patch({ clearSignups: value })}
		/>
		<Toggle
			checked={config.clearAnnouncements}
			label={m.dashboard_bot_shift_announcement_channel()}
			description={m.dashboard_bot_upcoming_notice_start_announcement_live_dispatch()}
			disabled={busy}
			onchange={(value) => patch({ clearAnnouncements: value })}
		/>
		<Toggle
			checked={config.clearHostReminders}
			label={m.dashboard_bot_host_channel()}
			description={m.dashboard_bot_shift_needs_host_reminder()}
			disabled={busy}
			onchange={(value) => patch({ clearHostReminders: value })}
		/>
	</div>

	<div class="mt-4 border-t border-border-base pt-4">
		<p class="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
			{m.dashboard_bot_channels_will_clear()}
		</p>

		{#if !cleanup || cleanup.targets.length === 0}
			<p class="text-sm text-text-muted">{m.dashboard_bot_no_channels_are_set_yet_so()}</p>
		{:else}
			<ul class="space-y-1.5">
				{#each cleanup.targets as target (target.channelId)}
					<li class="flex flex-wrap items-center gap-2 text-sm">
						{#if !target.enabled}
							<IconX size={14} class="shrink-0 text-text-subtle" />
							<span class="text-text-subtle">#{target.name}</span>
							<span class="text-xs text-text-subtle">
								{m.dashboard_bot_kept_purpose({ purpose: target.purpose })}
							</span>
						{:else if target.canDelete}
							<IconCheck size={14} class="shrink-0 text-success" />
							<span class="text-text-muted">#{target.name}</span>
							<span class="text-xs text-text-subtle">{target.purpose}</span>
						{:else}
							<IconAlertTriangle size={14} class="shrink-0 text-danger" />
							<span class="text-danger">#{target.name}</span>
							<span class="text-xs text-danger">
								{m.dashboard_bot_cannot_delete_here_needs_manage_messages()}
							</span>
						{/if}
					</li>
				{/each}
			</ul>

			{#if !cleanup.ready}
				<p class="mt-3 text-sm text-text-muted">
					{m.dashboard_bot_give_bot_s_role_those_two()}
				</p>
				<div class="mt-3">
					<Button size="sm" variant="secondary" onclick={onreadd} loading={installing}>
						<IconBrandDiscord size={15} /> {m.dashboard_bot_re_add_with_full_permissions()}
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</section>
