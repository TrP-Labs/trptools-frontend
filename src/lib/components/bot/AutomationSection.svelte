<script lang="ts">
	import AutomationRow from '$lib/components/bot/AutomationRow.svelte';
	import type { BotConfig } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * The things the bot does on its own, and how long before a shift.
	 *
	 * Every row is the same shape — a switch and a lead time — which is why
	 * they are one section rather than scattered among the settings they
	 * automate. A row switched off is not a feature switched off: the slash
	 * command still works, it just waits to be asked.
	 */
	interface Props {
		config: BotConfig;
		busy: boolean;
		patch: (body: Partial<BotConfig>) => void;
	}

	let { config, busy, patch }: Props = $props();
</script>

<section class="card p-4">
	<h2 class="text-sm font-semibold text-text">{m.dashboard_bot_automation()}</h2>
	<p class="mt-1 text-xs text-text-muted">{m.dashboard_bot_let_bot_run_these_itself_slash()}</p>

	<div class="mt-4 space-y-2">
		<AutomationRow
			label={m.dashboard_bot_announce_upcoming_shifts()}
			description={m.dashboard_bot_post_shift_coming_up()}
			enabled={config.autoAnnounce}
			lead={config.autoAnnounceLead}
			disabled={busy}
			onchange={({ enabled, lead }) =>
				patch({
					...(enabled !== undefined ? { autoAnnounce: enabled } : {}),
					...(lead !== undefined ? { autoAnnounceLead: lead } : {})
				})}
		/>

		<AutomationRow
			label={m.dashboard_bot_post_sign_up_sheets()}
			description={m.dashboard_bot_open_staff_sign_ups_next_shift()}
			enabled={config.autoSignups}
			lead={config.autoSignupsLead}
			disabled={busy}
			onchange={({ enabled, lead }) =>
				patch({
					...(enabled !== undefined ? { autoSignups: enabled } : {}),
					...(lead !== undefined ? { autoSignupsLead: lead } : {})
				})}
		/>

		<AutomationRow
			label={m.dashboard_bot_remind_host()}
			description={m.dashboard_bot_ping_host_role_shift_needs_opening()}
			enabled={config.autoHostReminder}
			lead={config.autoHostReminderLead}
			disabled={busy}
			onchange={({ enabled, lead }) =>
				patch({
					...(enabled !== undefined ? { autoHostReminder: enabled } : {}),
					...(lead !== undefined ? { autoHostReminderLead: lead } : {})
				})}
		/>

		<AutomationRow
			label={m.dashboard_bot_let_staff()}
			description={m.dashboard_bot_give_staff_who_signed_up_join()}
			enabled={config.autoStaffStart}
			lead={config.autoStaffStartLead}
			disabled={busy}
			onchange={({ enabled, lead }) =>
				patch({
					...(enabled !== undefined ? { autoStaffStart: enabled } : {}),
					...(lead !== undefined ? { autoStaffStartLead: lead } : {})
				})}
		/>

		<AutomationRow
			label={m.dashboard_bot_announce_start()}
			description={m.dashboard_bot_post_join_link_publicly_when_shift()}
			enabled={config.autoBegin}
			lead={config.autoBeginLead}
			disabled={busy}
			onchange={({ enabled, lead }) =>
				patch({
					...(enabled !== undefined ? { autoBegin: enabled } : {}),
					...(lead !== undefined ? { autoBeginLead: lead } : {})
				})}
		/>

		<AutomationRow
			label={m.dashboard_bot_close_shift_out()}
			description={m.dashboard_bot_clear_sign_up_messages_post_satisfaction()}
			enabled={config.autoComplete}
			lead={config.autoCompleteDelay}
			leadLabel="minutes after the shift ends"
			disabled={busy}
			onchange={({ enabled, lead }) =>
				patch({
					...(enabled !== undefined ? { autoComplete: enabled } : {}),
					...(lead !== undefined ? { autoCompleteDelay: lead } : {})
				})}
		/>
	</div>
</section>
