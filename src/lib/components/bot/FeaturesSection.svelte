<script lang="ts">
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { BotConfig } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * What the bot is allowed to do at all.
	 *
	 * The master switches, kept apart from Automation next door: this decides
	 * whether a thing can happen, that one decides whether it happens without
	 * being asked. Turning one off here also takes its slash command away, so
	 * it is the switch to reach for when a group wants a feature gone rather
	 * than merely manual.
	 */
	interface Props {
		config: BotConfig;
		busy: boolean;
		patch: (body: Partial<BotConfig>) => void;
	}

	let { config, busy, patch }: Props = $props();
</script>

<section class="card p-4">
	<h2 class="text-sm font-semibold text-text">{m.dashboard_bot_features()}</h2>
	<p class="mt-1 text-xs text-text-muted">
		{m.dashboard_bot_turning_one_off_stops_entirely_including()}
	</p>

	<div class="mt-4 space-y-4">
		<Toggle
			checked={config.announcementsEnabled}
			label={m.dashboard_bot_shift_announcements()}
			description={m.dashboard_bot_announce_upcoming_starting_shifts()}
			disabled={busy}
			onchange={(value) => patch({ announcementsEnabled: value })}
		/>
		<Toggle
			checked={config.signupsEnabled}
			label={m.dashboard_bot_sign_up_sheets()}
			description={m.dashboard_bot_post_per_rank_staff_sign_up()}
			disabled={busy}
			onchange={(value) => patch({ signupsEnabled: value })}
		/>
		<Toggle
			checked={config.pollsEnabled}
			label={m.dashboard_bot_post_shift_polls()}
			description={m.dashboard_bot_ask_how_shift_went_once_ends()}
			disabled={busy}
			onchange={(value) => patch({ pollsEnabled: value })}
		/>
		<Toggle
			checked={config.remindersEnabled}
			label={m.dashboard_bot_reminders()}
			description={m.dashboard_bot_remind_hosts_signed_up_staff_before()}
			disabled={busy}
			onchange={(value) => patch({ remindersEnabled: value })}
		/>
		<Toggle
			checked={config.manifestEnabled}
			label={m.dashboard_bot_live_dispatch_manifest()}
			description={m.dashboard_bot_post_live_picture_dispatch_board_under()}
			disabled={busy}
			onchange={(value) => patch({ manifestEnabled: value })}
		/>
	</div>
</section>
