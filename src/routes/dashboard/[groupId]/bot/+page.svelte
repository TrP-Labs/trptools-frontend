<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconAlertTriangle,
		IconBrandDiscord,
		IconClockPlay,
		IconEraser,
		IconMessage,
		IconPlugConnected,
		IconToggleRight,
		IconTrash
	} from '@tabler/icons-svelte';
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import ServerSection from '$lib/components/bot/ServerSection.svelte';
	import MessagesSection from '$lib/components/bot/MessagesSection.svelte';
	import FeaturesSection from '$lib/components/bot/FeaturesSection.svelte';
	import AutomationSection from '$lib/components/bot/AutomationSection.svelte';
	import CleanupSection from '$lib/components/bot/CleanupSection.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { consumeUrlMarkers } from '$lib/utils/urlMarker';
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
	 * The bot page, in the sections a group actually thinks in.
	 *
	 * It was seven stacked cards and the better part of six hundred lines, so
	 * changing a lead time meant scrolling past every channel, every feature
	 * switch and a permission checklist to reach it — the same accretion the
	 * rank editor and group settings both hit (§10.1). The split is by
	 * question rather than by field type: where the bot is, what it says,
	 * what it may do, what it does unprompted, and what it takes down
	 * afterwards.
	 */
	let sections = $derived<ObjectSection[]>([
		{ id: 'server', label: m.dashboard_bot_section_server(), icon: IconPlugConnected },
		{ id: 'messages', label: m.dashboard_bot_section_messages(), icon: IconMessage },
		{ id: 'features', label: m.dashboard_bot_section_features(), icon: IconToggleRight },
		{ id: 'automation', label: m.dashboard_bot_section_automation(), icon: IconClockPlay },
		{ id: 'cleanup', label: m.dashboard_bot_section_cleanup(), icon: IconEraser }
	]);

	/**
	 * The install redirect lands back here with a marker rather than a toast
	 * from the server, since it is a fresh navigation with no client state.
	 *
	 * `consumeUrlMarkers` carries why this is an `afterNavigate` rather than an
	 * effect, and why clearing the marker has to be deferred. Both traps bit
	 * here: as an effect it announced again on every reload of the page data —
	 * once per settings toggle on this page — and its `replaceState` threw
	 * "before router is initialized" on the cold load the install always is,
	 * so the marker was never actually cleared.
	 */
	afterNavigate(() =>
		consumeUrlMarkers(['installed', 'botError'], ({ installed, botError }) => {
			if (installed === '1') {
				toasts.success(m.dashboard_bot_discord_server_connected());
			} else if (botError) {
				toasts.error(
					INSTALL_ERRORS[botError]?.() ?? m.dashboard_bot_could_not_connect_discord_server()
				);
			}
		})
	);

	// The keys are what the callback puts in the URL, so they keep Discord's
	// own spelling; only the sentences beside them are the site's to write.
	const INSTALL_ERRORS: Record<string, () => string> = {
		cancelled: m.dashboard_bot_discord_authorization_canceled,
		expired: m.dashboard_bot_install_link_expired,
		'guild-taken': m.dashboard_bot_server_already_connected_another_group,
		'exchange-failed': m.dashboard_bot_discord_refused_install_redirect_uri,
		'unknown-group': m.dashboard_bot_group_no_longer_exists,
		unavailable: m.api_error_discord_is_not_configured_on_this_instance
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
		if (!confirm(m.dashboard_bot_disconnect_server_confirm())) return;

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

{#if !overview.available || !config || !guild}
	<!--
		Nothing is connected, so there is nothing to divide into sections —
		this keeps the plain header the page always had.
	-->
	<PageHeader
		title={m.dashboard_bot_discord_bot()}
		description={m.dashboard_bot_announce_shifts_collect_staff_sign_ups()}
	/>

	{#if !overview.available}
		<EmptyState
			title={m.dashboard_bot_discord_not_configured()}
			description={m.dashboard_bot_trp_tools_instance_has_no_discord()}
		>
			{#snippet icon()}<IconBrandDiscord size={28} stroke={1.5} />{/snippet}
		</EmptyState>
	{:else}
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
	{/if}
{:else}
	<ObjectPage
		title={m.dashboard_bot_discord_bot()}
		description={m.dashboard_bot_announce_shifts_collect_staff_sign_ups()}
		{sections}
	>
		<!--
			The connection's health rides in the header rather than only on the
			Server tab. Every other section arranges messages a bot missing a
			permission will never post, so somebody deep in Automation has to
			be able to see that is the reason nothing happened.
		-->
		{#snippet meta()}
			{#if !guild.present}
				<Badge tone="danger">
					<IconAlertTriangle size={13} />
					{m.dashboard_bot_bot_removed()}
				</Badge>
			{:else if guild.healthy}
				<Badge tone="success">
					<IconPlugConnected size={13} />
					{guild.name ?? m.dashboard_bot_connected()}
				</Badge>
			{:else}
				<Badge tone="warning">
					<IconAlertTriangle size={13} />
					{m.dashboard_bot_missing_permissions()}
				</Badge>
			{/if}
		{/snippet}

		{#snippet actions()}
			<Button size="sm" variant="ghost" onclick={disconnect} disabled={busy}>
				<IconTrash size={15} /> {m.dashboard_bot_disconnect()}
			</Button>
		{/snippet}

		{#snippet children(section)}
			{#if section === 'server'}
				<ServerSection {guild} onreadd={beginInstall} {installing} />
			{:else if section === 'messages'}
				<MessagesSection
					{groupId}
					groupSlug={data.group.slug}
					{config}
					channelNames={data.channelNames}
					roleNames={data.roleNames}
					{busy}
					{patch}
				/>
			{:else if section === 'features'}
				<FeaturesSection {config} {busy} {patch} />
			{:else if section === 'automation'}
				<AutomationSection {config} {busy} {patch} />
			{:else if section === 'cleanup'}
				<CleanupSection {config} {cleanup} {busy} {patch} onreadd={beginInstall} {installing} />
			{/if}
		{/snippet}
	</ObjectPage>
{/if}
