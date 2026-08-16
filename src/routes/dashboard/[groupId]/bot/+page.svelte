<script lang="ts">
	import { invalidateAll, replaceState } from '$app/navigation';
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
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import DiscordSetting from '$lib/components/bot/DiscordSetting.svelte';
	import AutomationRow from '$lib/components/bot/AutomationRow.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { BotConfig } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let groupId = $derived(data.group.id);
	let overview = $derived(data.overview);
	let config = $derived(overview.config);
	let guild = $derived(overview.guild);

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

		if (installed) toasts.success('Discord server connected');
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
			toasts.error(errorMessage(error, 'Could not start the Discord install'));
			installing = false;
		}
	}

	async function patch(body: Partial<BotConfig>) {
		busy = true;
		try {
			const { error } = await api.bot({ groupId }).patch(body);
			if (error) throw error;
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save that setting'));
		} finally {
			busy = false;
		}
	}

	async function disconnect() {
		if (
			!confirm(
				'Disconnect this Discord server? The bot will leave it and every channel and role setting will be cleared.'
			)
		)
			return;

		busy = true;
		try {
			const { error } = await api.bot({ groupId }).delete();
			if (error) throw error;

			toasts.success('Discord server disconnected');
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not disconnect that server'));
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader
	title="Discord bot"
	description="Announce shifts, collect staff sign-ups and run post-shift polls from your Discord server. Everything the bot does is configured here."
>
	{#snippet actions()}
		{#if config}
			<Button variant="ghost" onclick={disconnect} disabled={busy}>
				<IconTrash size={16} /> Disconnect
			</Button>
		{/if}
	{/snippet}
</PageHeader>

{#if !overview.available}
	<EmptyState
		title="Discord is not configured"
		description="This TrP Tools instance has no Discord application set up, so the bot cannot be added to a server. An operator needs to set DISCORD_APP_ID, DISCORD_CLIENT_SECRET and DISCORD_BOT_TOKEN."
	>
		{#snippet icon()}<IconBrandDiscord size={28} stroke={1.5} />{/snippet}
	</EmptyState>
{:else if !config || !guild}
	<EmptyState
		title="No Discord server connected"
		description="Add the bot to your server to announce shifts, run sign-up sheets and post the live dispatch manifest. You will need Manage Server permission in Discord."
	>
		{#snippet icon()}<IconBrandDiscord size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button onclick={beginInstall} loading={installing}>
				<IconBrandDiscord size={16} /> Add to Discord
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
					<p class="truncate font-medium text-text">{guild.name ?? 'Unknown server'}</p>
					<p class="text-xs text-text-subtle">{guild.guildId}</p>
				</div>

				{#if !guild.present}
					<Badge tone="danger"><IconAlertTriangle size={13} /> Bot removed</Badge>
				{:else if guild.healthy}
					<Badge tone="success"><IconPlugConnected size={13} /> Connected</Badge>
				{:else}
					<Badge tone="warning"><IconAlertTriangle size={13} /> Missing permissions</Badge>
				{/if}
			</div>

			<div class="mt-4 border-t border-border-base pt-4">
				<p class="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
					Permissions
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
						Discord no longer reports the bot as a member of this server. Add it again to carry
						on — your settings are kept.
					</p>
					<div class="mt-3">
						<Button size="sm" onclick={beginInstall} loading={installing}>
							<IconBrandDiscord size={15} /> Add to Discord again
						</Button>
					</div>
				{:else if !guild.healthy}
					<p class="mt-3 text-sm text-text-muted">
						The bot is missing permissions it needs. Re-adding it grants the full set, or you can
						fix its role in Discord directly.
					</p>
					<div class="mt-3">
						<Button size="sm" variant="secondary" onclick={beginInstall} loading={installing}>
							<IconBrandDiscord size={15} /> Re-add with full permissions
						</Button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Where things go -->
		<section class="card p-4">
			<h2 class="text-sm font-semibold text-text">Channels and roles</h2>
			<p class="mt-1 text-xs text-text-muted">
				Where the bot posts, and who it pings. Sign-up sheets have their own channel and ping role,
				set per rank on the
				<a href="/dashboard/{data.group.slug}/ranks" class="text-accent hover:underline">Ranks</a>
				page.
			</p>

			<div class="mt-4 space-y-2">
				<DiscordSetting
					{groupId}
					kind="channel"
					label="Shift announcements"
					description="Where upcoming and starting shifts are announced."
					value={config.announcementChannel}
					names={data.channelNames}
					disabled={busy}
					onchange={(value) => patch({ announcementChannel: value })}
				/>

				<DiscordSetting
					{groupId}
					kind="channel"
					label="Polls"
					description="Where the satisfaction poll goes after a shift ends."
					value={config.pollChannel}
					names={data.channelNames}
					disabled={busy}
					onchange={(value) => patch({ pollChannel: value })}
				/>

				<DiscordSetting
					{groupId}
					kind="channel"
					label="Host channel"
					description="Where hosts are reminded that a shift is theirs to open."
					value={config.hostChannel}
					names={data.channelNames}
					disabled={busy}
					onchange={(value) => patch({ hostChannel: value })}
				/>

				<DiscordSetting
					{groupId}
					kind="role"
					label="Shift ping role"
					description="Pinged when a shift is announced or starts."
					value={config.shiftPingRole}
					names={data.roleNames}
					disabled={busy}
					onchange={(value) => patch({ shiftPingRole: value })}
				/>

				<DiscordSetting
					{groupId}
					kind="role"
					label="Host ping role"
					description="Pinged by the host reminder before a shift."
					value={config.hostPingRole}
					names={data.roleNames}
					disabled={busy}
					onchange={(value) => patch({ hostPingRole: value })}
				/>
			</div>
		</section>

		<!-- What the bot is allowed to do at all -->
		<section class="card p-4">
			<h2 class="text-sm font-semibold text-text">Features</h2>
			<p class="mt-1 text-xs text-text-muted">
				Turning one off stops it entirely, including its slash command.
			</p>

			<div class="mt-4 space-y-4">
				<Toggle
					checked={config.announcementsEnabled}
					label="Shift announcements"
					description="Announce upcoming and starting shifts."
					disabled={busy}
					onchange={(value) => patch({ announcementsEnabled: value })}
				/>
				<Toggle
					checked={config.signupsEnabled}
					label="Sign-up sheets"
					description="Post per-rank staff sign-up sheets, kept in step with the website."
					disabled={busy}
					onchange={(value) => patch({ signupsEnabled: value })}
				/>
				<Toggle
					checked={config.pollsEnabled}
					label="Post-shift polls"
					description="Ask how the shift went once it ends."
					disabled={busy}
					onchange={(value) => patch({ pollsEnabled: value })}
				/>
				<Toggle
					checked={config.remindersEnabled}
					label="Reminders"
					description="Remind hosts and signed-up staff before a shift."
					disabled={busy}
					onchange={(value) => patch({ remindersEnabled: value })}
				/>
				<Toggle
					checked={config.manifestEnabled}
					label="Live dispatch manifest"
					description="Post a live picture of the dispatch board under a shift start announcement."
					disabled={busy}
					onchange={(value) => patch({ manifestEnabled: value })}
				/>
			</div>
		</section>

		<!-- Automation -->
		<section class="card p-4">
			<h2 class="text-sm font-semibold text-text">Automation</h2>
			<p class="mt-1 text-xs text-text-muted">
				Let the bot run these itself. The slash commands stay available whether or not they are
				automated, so a host can always do it by hand.
			</p>

			<div class="mt-4 space-y-2">
				<AutomationRow
					label="Announce upcoming shifts"
					description="Post that a shift is coming up."
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
					label="Post sign-up sheets"
					description="Open staff sign-ups for the next shift."
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
					label="Remind the host"
					description="Ping the host role that a shift needs opening."
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
					label="Announce the start"
					description="Post the join link and ping signed-up staff when the shift begins."
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
					label="Close the shift out"
					description="Clear the sign-up messages and post the satisfaction poll."
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

		<!-- The Roblox join link the announcements build -->
		<section class="card p-4">
			<h2 class="text-sm font-semibold text-text">Join link</h2>
			<p class="mt-1 text-xs text-text-muted">
				What the “click here to join” link in a shift announcement points at.
			</p>

			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<Field label="Place ID" hint="The Roblox place shifts are run in.">
					<Input
						value={config.placeId}
						disabled={busy}
						inputmode="numeric"
						onblur={(event) => {
							const next = (event.currentTarget as HTMLInputElement).value.trim();
							if (next && next !== config.placeId) patch({ placeId: next });
						}}
					/>
				</Field>

				<Field
					label="Server owner Roblox ID"
					hint="Whose private server the link opens. A host can override this per shift."
				>
					<Input
						value={config.ownerRobloxId ?? ''}
						disabled={busy}
						inputmode="numeric"
						placeholder="Not set"
						onblur={(event) => {
							const next = (event.currentTarget as HTMLInputElement).value.trim();
							if (next !== (config.ownerRobloxId ?? '')) patch({ ownerRobloxId: next || null });
						}}
					/>
				</Field>
			</div>
		</section>
	</div>
{/if}
