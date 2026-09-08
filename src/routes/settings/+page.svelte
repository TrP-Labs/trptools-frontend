<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconShieldCheck } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import UserChip from '$lib/components/users/UserChip.svelte';
	import DiscordAccountCard from '$lib/components/settings/DiscordAccountCard.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatRelative } from '$lib/utils/format';
	import type { DiscordAccount } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let user = $derived(data.user!);

	let profilePublic = $state(true);
	let favoriteRoutesPublic = $state(true);
	let dislikedRoutesPublic = $state(true);
	/**
	 * The connected Discord account.
	 *
	 * Seeded from the session so the card is right on the first painted frame,
	 * then kept in step by the same fetch the visibility flags use — and
	 * re-read after linking or unlinking, which is what `loadPreferences`
	 * below is for.
	 */
	// svelte-ignore state_referenced_locally
	let discord = $state<DiscordAccount | null>(data.user?.discord ?? null);
	let savingVisibility = $state(false);
	let loaded = $state(false);

	// Mirrors the session rather than being seeded once, so the switch follows
	// the answer the server actually gave.
	let adminMode = $derived(user.adminMode);
	let switching = $state(false);

	async function loadPreferences() {
		const { data: preferences } = await api.users.me.preferences.get().catch(() => ({ data: null }));
		if (!preferences) return;

		profilePublic = preferences.profilePublic;
		favoriteRoutesPublic = preferences.favoriteRoutesPublic;
		dislikedRoutesPublic = preferences.dislikedRoutesPublic;
		discord = preferences.discord;
	}

	// The visibility flags are not part of the session payload, so they are
	// fetched once on mount.
	$effect(() => {
		if (loaded) return;
		loaded = true;

		void loadPreferences();
	});

	/**
	 * Only the fields the card being saved owns are sent.
	 *
	 * The API patches whatever it is given, so a card that posted every value
	 * it happens to be holding would write back settings the person had not
	 * touched — including ones a stale fetch never filled in.
	 */
	async function save(
		patch: Parameters<typeof api.users.me.preferences.patch>[0],
		busy: (value: boolean) => void
	) {
		busy(true);
		try {
			const { error } = await api.users.me.preferences.patch(patch);
			if (error) throw error;

			toasts.success(m.settings_settings_saved());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.settings_could_not_save_settings()));
		} finally {
			busy(false);
		}
	}

	/**
	 * Site-admin powers, for this session only.
	 *
	 * The whole page is reloaded rather than refreshed: turning it on or off
	 * changes what every already-loaded page is allowed to show — the group
	 * list most of all — and a partial refresh would leave a dashboard on
	 * screen listing groups this session can no longer open.
	 */
	async function setAdminMode(enabled: boolean) {
		switching = true;
		try {
			const { error } = await api.auth['admin-mode'].post({ enabled });
			if (error) throw error;
		} catch (error) {
			toasts.error(errorMessage(error, m.settings_could_not_change_admin_mode()));
			switching = false;
			return;
		}

		window.location.reload();
	}

	async function signOutEverywhere() {
		if (!confirm(m.settings_sign_out_every_device_confirm())) return;

		try {
			await api.auth.logout.all.post();
			window.location.href = '/';
		} catch (error) {
			toasts.error(errorMessage(error, m.settings_could_not_sign_out()));
		}
	}
</script>

<PageHeader title={m.common_account()} description={m.settings_trp_tools_profile_preferences()} />

<div class="space-y-6">
	<Card title={m.settings_roblox_account()} description={m.settings_trp_tools_signs_with_roblox()}>
		<div class="flex flex-wrap items-center justify-between gap-4">
			<UserChip
				displayName={user.displayName}
				username={user.username}
				avatar={user.avatar}
				size={44}
			/>
			<!--
				Signing in with Roblox is what creates the account, so the row's
				own age *is* the date the two were connected — there is no
				separate link to stamp, the way there is for Discord.
			-->
			<div class="text-right text-xs text-text-subtle">
				<p>{m.dashboard_roblox_id({ id: user.robloxId })}</p>
				<p class="capitalize">{user.siteRank}</p>
				{#if user.createdAt}
					<p>{m.settings_discord_connected_ago({ when: formatRelative(user.createdAt) })}</p>
				{/if}
			</div>
		</div>
	</Card>

	<DiscordAccountCard account={discord} onchange={loadPreferences} />

	<!--
		What other people can see, in one place.
		
		The public-profile switch used to sit among the preferences, where it
		read as another setting about this device. The route lists join it
		because they answer the same question — and because a profile switched
		off publishes nothing at all, which the nesting here has to show.
	-->
	<Card title={m.common_visibility()} description={m.settings_what_other_people_can_see_about()}>
		{#snippet actions()}
			<Button
				onclick={() =>
					save(
						{ profilePublic, favoriteRoutesPublic, dislikedRoutesPublic },
						(value) => (savingVisibility = value)
					)}
				loading={savingVisibility}
			>
				{m.common_save()}
			</Button>
		{/snippet}

		<div class="space-y-5">
			<Toggle
				bind:checked={profilePublic}
				label={m.settings_public_profile()}
				description={m.settings_let_other_people_open_trp_tools()}
			/>

			<div
				class="space-y-5 border-l border-border-base pl-4 transition-opacity
					{profilePublic ? '' : 'opacity-50'}"
			>
				<Toggle
					bind:checked={favoriteRoutesPublic}
					label={m.settings_favorite_routes()}
					description={m.settings_show_routes_have_marked_as_favorites()}
				/>

				<Toggle
					bind:checked={dislikedRoutesPublic}
					label={m.settings_disliked_routes()}
					description={m.settings_show_routes_would_rather_not_given()}
				/>

				{#if !profilePublic}
					<p class="text-xs text-text-subtle">
						{m.settings_profile_hidden_so_neither_list_published()}
					</p>
				{/if}
			</div>
		</div>
	</Card>

	{#if user.siteRank === 'admin'}
		<!--
			Offered on the account's standing, never on the elevation: an admin
			who has turned it off has to be able to find the switch again.
		-->
		<Card
			title={m.settings_admin_mode()}
			description={m.settings_site_admin_powers_browser_session_only()}
		>
			{#snippet actions()}
				<IconShieldCheck size={18} class={adminMode ? 'text-warning' : 'text-text-subtle'} />
			{/snippet}

			<Toggle
				checked={adminMode}
				disabled={switching}
				label={m.settings_act_as_site_administrator()}
				description={m.settings_bypass_every_group_s_permissions_administration()}
				onchange={setAdminMode}
			/>

			<p class="mt-4 text-xs text-text-subtle">
				{m.settings_ends_with_session_off_every_new()}
			</p>
		</Card>
	{/if}

	<!--
		The button sits in the header beside the question it answers, rather
		than in a body of its own: one control under one line of text made a
		card twice as tall as it had anything to say. `Card` drops the header
		to a second row on its own when the two cannot share one.
	-->
	<Card
		title={m.settings_sessions()}
		description={m.settings_signed_device_no_longer_have()}
	>
		{#snippet actions()}
			<Button variant="danger" onclick={signOutEverywhere}>
				{m.settings_sign_out_everywhere()}
			</Button>
		{/snippet}
	</Card>
</div>
