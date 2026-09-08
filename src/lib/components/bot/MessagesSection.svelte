<script lang="ts">
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import DiscordSetting from '$lib/components/bot/DiscordSetting.svelte';
	import LanguageTags from '$lib/components/i18n/LanguageTags.svelte';
	import type { BotConfig } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * What the bot says, and where it says it.
	 *
	 * The three cards here were three separate stops down a long page, and
	 * they answer one question between them: a message's language, the channel
	 * it lands in, and what the join button on it looks like. Language leads,
	 * because it applies to every message the other two arrange rather than
	 * being another setting among them.
	 */
	interface Props {
		groupId: string;
		groupSlug: string;
		config: BotConfig;
		channelNames: Record<string, string>;
		roleNames: Record<string, string>;
		busy: boolean;
		patch: (body: Partial<BotConfig>) => void;
	}

	let { groupId, groupSlug, config, channelNames, roleNames, busy, patch }: Props = $props();
</script>

<div class="space-y-6">
	<section class="card p-4">
		<h2 class="text-sm font-semibold text-text">{m.dashboard_bot_languages()}</h2>
		<p class="mt-1 mb-4 text-xs text-text-muted">{m.dashboard_bot_languages_description()}</p>

		<LanguageTags
			value={config.languages}
			disabled={busy}
			onchange={(languages) => patch({ languages })}
		/>
	</section>

	<section class="card p-4">
		<h2 class="text-sm font-semibold text-text">{m.dashboard_bot_channels_roles()}</h2>
		<p class="mt-1 text-xs text-text-muted">
			{m.dashboard_bot_where_bot_posts_who_pings_sign()}
			<a href="/dashboard/{groupSlug}/ranks" class="text-accent hover:underline">
				{m.common_ranks()}
			</a>
			{m.dashboard_bot_page()}
		</p>

		<div class="mt-4 space-y-2">
			<DiscordSetting
				{groupId}
				kind="channel"
				label={m.dashboard_bot_shift_announcements()}
				description={m.dashboard_bot_where_upcoming_starting_shifts_are_announced()}
				value={config.announcementChannel}
				names={channelNames}
				disabled={busy}
				onchange={(value) => patch({ announcementChannel: value })}
			/>

			<DiscordSetting
				{groupId}
				kind="channel"
				label={m.dashboard_bot_polls()}
				description={m.dashboard_bot_where_satisfaction_poll_goes_after_shift()}
				value={config.pollChannel}
				names={channelNames}
				disabled={busy}
				onchange={(value) => patch({ pollChannel: value })}
			/>

			<DiscordSetting
				{groupId}
				kind="channel"
				label={m.dashboard_bot_host_channel()}
				description={m.dashboard_bot_where_hosts_are_reminded_shift_theirs()}
				value={config.hostChannel}
				names={channelNames}
				disabled={busy}
				onchange={(value) => patch({ hostChannel: value })}
			/>

			<DiscordSetting
				{groupId}
				kind="role"
				label={m.dashboard_bot_shift_ping_role()}
				description={m.dashboard_bot_pinged_when_shift_starts()}
				value={config.shiftPingRole}
				names={roleNames}
				disabled={busy}
				onchange={(value) => patch({ shiftPingRole: value })}
			/>

			<!--
				A sub-setting of the ping role above, so it is indented to
				match that row's label rather than sitting in the list as a
				peer. It used to be disabled until a role was set, which
				made it look broken: clicking did nothing and said nothing.
				With no role there is nothing to ping, so it is not shown.
			-->
			{#if config.shiftPingRole}
				<div class="ml-7 rounded-lg border border-border-base px-3 py-2.5">
					<Toggle
						checked={config.pingUpcoming}
						label={m.dashboard_bot_ping_upcoming_notice_too()}
						disabled={busy}
						onchange={(value) => patch({ pingUpcoming: value })}
					/>
				</div>
			{/if}

			<DiscordSetting
				{groupId}
				kind="role"
				label={m.dashboard_bot_host_ping_role()}
				description={m.dashboard_bot_pinged_by_host_reminder_before_shift()}
				value={config.hostPingRole}
				names={roleNames}
				disabled={busy}
				onchange={(value) => patch({ hostPingRole: value })}
			/>
		</div>
	</section>

	<section class="card p-4">
		<h2 class="text-sm font-semibold text-text">{m.dashboard_bot_join_link()}</h2>
		<!--
			The place and the server owner used to be text boxes here. Neither
			was a decision worth offering: there is one place, and the server is
			the group owner’s. A host who needs a different server for one shift
			sets it on that shift with /edit-shift, where it expires with the
			shift instead of quietly outliving whoever changed it.
		-->
		<p class="mt-1 text-xs text-text-muted">
			{m.dashboard_bot_announcements_link_group_owner_s_private()}
			<code class="rounded bg-background-muted px-1 py-0.5">/edit-shift</code>
			{m.dashboard_bot_discord_point_one_shift_somewhere_else()}
		</p>

		<div class="mt-4">
			<Toggle
				checked={config.announceJoinCode}
				label={m.dashboard_bot_show_join_code_publicly()}
				description={m.dashboard_bot_join_button_carries_either_way_staff()}
				disabled={busy}
				onchange={(value) => patch({ announceJoinCode: value })}
			/>
		</div>
	</section>
</div>
