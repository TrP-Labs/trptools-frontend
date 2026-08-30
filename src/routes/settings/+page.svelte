<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconShieldCheck } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import UserChip from '$lib/components/users/UserChip.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { detectTimezone } from '$lib/utils/format';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let user = $derived(data.user!);

	// Seeded from the session, then replaced by the fetch below.
	// svelte-ignore state_referenced_locally
	let timezone = $state(data.user?.timezone ?? 'UTC');
	let profilePublic = $state(true);
	let favoriteRoutesPublic = $state(true);
	let dislikedRoutesPublic = $state(true);
	let saving = $state(false);
	let savingVisibility = $state(false);
	let loaded = $state(false);

	// Mirrors the session rather than being seeded once, so the switch follows
	// the answer the server actually gave.
	let adminMode = $derived(user.adminMode);
	let switching = $state(false);

	// The visibility flags are not part of the session payload, so they are
	// fetched once on mount.
	$effect(() => {
		if (loaded) return;
		loaded = true;

		api.users.me.preferences
			.get()
			.then(({ data: preferences }) => {
				if (!preferences) return;
				timezone = preferences.timezone;
				profilePublic = preferences.profilePublic;
				favoriteRoutesPublic = preferences.favoriteRoutesPublic;
				dislikedRoutesPublic = preferences.dislikedRoutesPublic;
			})
			.catch(() => {});
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
			<div class="text-right text-xs text-text-subtle">
				<p>Roblox ID {user.robloxId}</p>
				<p class="capitalize">{user.siteRank}</p>
			</div>
		</div>
	</Card>

	<Card title={m.settings_preferences()}>
		{#snippet actions()}
			<Button onclick={() => save({ timezone }, (value) => (saving = value))} loading={saving}>
				{m.common_save()}
			</Button>
		{/snippet}

		<Field label={m.settings_time_zone()} hint={m.settings_shift_times_are_shown_zone()}>
			<div class="flex flex-wrap gap-2">
				<Input bind:value={timezone} spellcheck="false" class="min-w-48 flex-1" />
				<Button variant="secondary" onclick={() => (timezone = detectTimezone())}>{m.settings_detect()}</Button>
			</div>
		</Field>
	</Card>

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
					label={m.settings_favourite_routes()}
					description={m.settings_show_routes_have_marked_as_favourites()}
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

	<Card title={m.settings_sessions()} description={m.settings_signed_device_no_longer_have()}>
		<Button variant="danger" onclick={signOutEverywhere}>{m.settings_sign_out_everywhere()}</Button>
	</Card>
</div>
