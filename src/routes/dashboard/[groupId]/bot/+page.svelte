<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import { page } from '$app/state';
	import {
		IconAlertTriangle,
		IconBrandDiscord,
		IconCheck,
		IconPlugConnected,
		IconTrash,
		IconX
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import DiscordSetting from '$lib/components/bot/DiscordSetting.svelte';
	import AutomationRow from '$lib/components/bot/AutomationRow.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { BotConfig } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let groupId = $derived(data.group.id);
	let overview = $derived(data.overview);
	let config = $derived(overview.config);
	let guild = $derived(overview.guild);
	let cleanup = $derived(data.cleanup);

	let busy = $state(false);
	let installing = $state(false);

	/**
	 * The install redirect lands back here with a marker rather than a toast
	 * from the server, since it is a fresh navigation with no client state.
	 *
	 * `history.replaceState` was used to clear the marker, which changes the
	 * address bar but not SvelteKit's own `page.url` — so the effect saw
	 * `installed=1` forever and fired again on every reload of the page data,
	 * which is once per settings toggle. SvelteKit's `replaceState` updates
	 * both. The flag is belt and braces: this must announce once, whatever
	 * else re-runs it.
	 */
	let announced = false;

	$effect(() => {
		const installed = page.url.searchParams.get('installed') === '1';
		const failure = page.url.searchParams.get('botError');

		if (announced || (!installed && !failure)) return;
		announced = true;

		if (installed) toasts.success(m.dashboard_bot_discord_server_connected());
		else if (failure) toasts.error(INSTALL_ERRORS[failure] ?? 'Could not connect that Discord server');

		replaceState(page.url.pathname, {});
	});

	const INSTALL_ERRORS: Record<string, string> = {
		cancelled: 'The Discord authorisation was cancelled',
		expired: 'That install link expired — try again',
		'guild-taken': 'That Discord server is already connected to another group',
		'exchange-failed': 'Discord refused the install. Check the bot’s redirect URI.',
		'unknown-group': 'That group no longer exists',
		unavailable: 'Discord is not configured on this instance'
	};

	async function beginInstall() {
		installing = true;
		try {
			const { data: result, error } = await api.bot.install.get({ query: { groupId } });
			if (error) throw error;
			if (result) window.location.href = result.url;
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_bot_could_not_start_discord_install()));
			installing = false;
		}
	}

	async function patch(body: Partial<BotConfig>) {
		busy = true;
		try {
			const { error } = await api.bot({ groupId }).patch(body);
			if (error) throw error;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_bot_could_not_save_setting()));
		} finally {
			busy = false;
		}
	}

	async function disconnect() {
		if (
			!confirm(
				m.dashboard_bot_disconnect_server_confirm()
			)
		)
			return;

		busy = true;
		try {
			const { error } = await api.bot({ groupId }).delete();
			if (error) throw error;

			toasts.success(m.dashboard_bot_discord_server_disconnected());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_bot_could_not_disconnect_server()));
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader
	title={m.dashboard_bot_discord_bot()}
	description={m.dashboard_bot_announce_shifts_collect_staff_sign_ups()}
>
	{#snippet actions()}
		{#if config}
			<Button variant="ghost" onclick={disconnect} disabled={busy}>
				<IconTrash size={16} /> {m.dashboard_bot_disconnect()}
			</Button>
		{/if}
	{/snippet}
</PageHeader>

{#if !overview.available}
	<EmptyState
		title={m.dashboard_bot_discord_not_configured()}
		description={m.dashboard_bot_trp_tools_instance_has_no_discord()}
	>
		{#snippet icon()}<IconBrandDiscord size={28} stroke={1.5} />{/snippet}
	</EmptyState>
{:else if !config || !guild}
	<EmptyState
		title={m.dashboard_bot_no_discord_server_connected()}
		description={m.dashboard_bot_add_bot_server_announce_shifts_run()}
	>
		{#snippet icon()}<IconBrandDiscord size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button onclick={beginInstall} loading={installing}>
				<IconBrandDiscord size={16} /> {m.dashboard_bot_add_discord()}
			</Button>
		{/snippet}
	</EmptyState>
{:else}
	<div class="space-y-6">
		<!-- Connected server, and whether the bot is actually able to work -->
		<div class="card p-4">
			<div class="flex flex-wrap items-center gap-3">
				{#if guild.icon}
					<img src={guild.icon} alt="" class="size-10 shrink-0 rounded-xl" />
				{:else}
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background-muted text-text-subtle"
					>
						<IconBrandDiscord size={20} />
					</span>
				{/if}

				<div class="min-w-0 flex-1">
					<p class="truncate font-medium text-text">{guild.name ?? m.dashboard_bot_unknown_server()}</p>
					<p class="text-xs text-text-subtle">{guild.guildId}</p>
				</div>

				{#if !guild.present}
					<Badge tone="danger"><IconAlertTriangle size={13} /> {m.dashboard_bot_bot_removed()}</Badge>
				{:else if guild.healthy}
					<Badge tone="success"><IconPlugConnected size={13} /> {m.dashboard_bot_connected()}</Badge>
				{:else}
					<Badge tone="warning"><IconAlertTriangle size={13} /> {m.dashboard_bot_missing_permissions()}</Badge>
				{/if}
			</div>

			<div class="mt-4 border-t border-border-base pt-4">
				<p class="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
					{m.dashboard_bot_permissions()}
				</p>

				<ul class="flex flex-wrap gap-x-4 gap-y-1.5">
					{#each guild.permissions as permission (permission.name)}
						<li class="flex items-center gap-1.5 text-sm">
							{#if permission.granted}
								<IconCheck size={14} class="shrink-0 text-success" />
								<span class="text-text-muted">{permission.label}</span>
							{:else}
								<IconX size={14} class="shrink-0 text-danger" />
								<span class="text-danger">{permission.label}</span>
							{/if}
						</li>
					{/each}
				</ul>

				{#if !guild.present}
					<p class="mt-3 text-sm text-text-muted">
						{m.dashboard_bot_discord_no_longer_reports_bot_as()}
					</p>
					<div class="mt-3">
						<Button size="sm" onclick={beginInstall} loading={installing}>
							<IconBrandDiscord size={15} /> {m.dashboard_bot_add_discord_again()}
						</Button>
					</div>
				{:else if !guild.healthy}
					<p class="mt-3 text-sm text-text-muted">
						{m.dashboard_bot_bot_missing_permissions_needs_re_adding()}
					</p>
					<div class="mt-3">
						<Button size="sm" variant="secondary" onclick={beginInstall} loading={installing}>
							<IconBrandDiscord size={15} /> {m.dashboard_bot_re_add_with_full_permissions()}
						</Button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Where things go -->
		<section class="card p-4">
			<h2 class="text-sm font-semibold text-text">{m.dashboard_bot_channels_roles()}</h2>
			<p class="mt-1 text-xs text-text-muted">
				{m.dashboard_bot_where_bot_posts_who_pings_sign()}
				<a href="/dashboard/{data.group.slug}/ranks" class="text-accent hover:underline">{m.common_ranks()}</a>
				{m.dashboard_bot_page()}
			</p>

			<div class="mt-4 space-y-2">
				<DiscordSetting
					{groupId}
					kind="channel"
					label={m.dashboard_bot_shift_announcements()}
					description={m.dashboard_bot_where_upcoming_starting_shifts_are_announced()}
					value={config.announcementChannel}
					names={data.channelNames}
					disabled={busy}
					onchange={(value) => patch({ announcementChannel: value })}
				/>

				<DiscordSetting
					{groupId}
					kind="channel"
					label={m.dashboard_bot_polls()}
					description={m.dashboard_bot_where_satisfaction_poll_goes_after_shift()}
					value={config.pollChannel}
					names={data.channelNames}
					disabled={busy}
					onchange={(value) => patch({ pollChannel: value })}
				/>

				<DiscordSetting
					{groupId}
					kind="channel"
					label={m.dashboard_bot_host_channel()}
					description={m.dashboard_bot_where_hosts_are_reminded_shift_theirs()}
					value={config.hostChannel}
					names={data.channelNames}
					disabled={busy}
					onchange={(value) => patch({ hostChannel: value })}
				/>

				<DiscordSetting
					{groupId}
					kind="role"
					label={m.dashboard_bot_shift_ping_role()}
					description={m.dashboard_bot_pinged_when_shift_starts()}
					value={config.shiftPingRole}
					names={data.roleNames}
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
					names={data.roleNames}
					disabled={busy}
					onchange={(value) => patch({ hostPingRole: value })}
				/>
			</div>
		</section>

		<!-- What the bot is allowed to do at all -->
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

		<!-- Automation -->
		<section class="card p-4">
			<h2 class="text-sm font-semibold text-text">{m.dashboard_bot_automation()}</h2>
			<p class="mt-1 text-xs text-text-muted">
				{m.dashboard_bot_let_bot_run_these_itself_slash()}
			</p>

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

		<!-- What closing a shift out takes down, and whether it can -->
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
						<Badge tone="warning"><IconAlertTriangle size={13} /> {m.dashboard_bot_cannot_delete()}</Badge>
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

			<!--
				Deleting needs Manage Messages and Read Message History, and Discord
				grants both per channel — so a bot that looks healthy above can still
				be refused in the one channel that matters. This is the check that
				would have caught it before a shift rather than after one.
			-->
			<div class="mt-4 border-t border-border-base pt-4">
				<p class="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
					{m.dashboard_bot_channels_will_clear()}
				</p>

				{#if !cleanup || cleanup.targets.length === 0}
					<p class="text-sm text-text-muted">
						{m.dashboard_bot_no_channels_are_set_yet_so()}
					</p>
				{:else}
					<ul class="space-y-1.5">
						{#each cleanup.targets as target (target.channelId)}
							<li class="flex flex-wrap items-center gap-2 text-sm">
								{#if !target.enabled}
									<IconX size={14} class="shrink-0 text-text-subtle" />
									<span class="text-text-subtle">#{target.name}</span>
									<span class="text-xs text-text-subtle">kept — {target.purpose}</span>
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
							<Button size="sm" variant="secondary" onclick={beginInstall} loading={installing}>
								<IconBrandDiscord size={15} /> {m.dashboard_bot_re_add_with_full_permissions()}
							</Button>
						</div>
					{/if}
				{/if}
			</div>
		</section>

		<!-- The Roblox join link the announcements build -->
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
				<code class="rounded bg-background-muted px-1 py-0.5">/edit-shift</code> {m.dashboard_bot_discord_point_one_shift_somewhere_else()}
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
{/if}
