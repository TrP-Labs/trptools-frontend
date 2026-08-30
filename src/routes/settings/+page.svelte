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

			toasts.success('Settings saved');
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save your settings'));
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
			toasts.error(errorMessage(error, 'Could not change admin mode'));
			switching = false;
			return;
		}

		window.location.reload();
	}

	async function signOutEverywhere() {
		if (!confirm('Sign out of every device?')) return;

		try {
			await api.auth.logout.all.post();
			window.location.href = '/';
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not sign out'));
		}
	}
</script>

<PageHeader title="Account" description="Your TrP Tools profile and preferences." />

<div class="space-y-6">
	<Card title="Roblox account" description="TrP Tools signs you in with Roblox.">
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

	<Card title="Preferences">
		{#snippet actions()}
			<Button onclick={() => save({ timezone }, (value) => (saving = value))} loading={saving}>
				Save
			</Button>
		{/snippet}

		<Field label="Time zone" hint="Shift times are shown in this zone.">
			<div class="flex flex-wrap gap-2">
				<Input bind:value={timezone} spellcheck="false" class="min-w-48 flex-1" />
				<Button variant="secondary" onclick={() => (timezone = detectTimezone())}>Detect</Button>
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
	<Card title="Visibility" description="What other people can see about you.">
		{#snippet actions()}
			<Button
				onclick={() =>
					save(
						{ profilePublic, favoriteRoutesPublic, dislikedRoutesPublic },
						(value) => (savingVisibility = value)
					)}
				loading={savingVisibility}
			>
				Save
			</Button>
		{/snippet}

		<div class="space-y-5">
			<Toggle
				bind:checked={profilePublic}
				label="Public profile"
				description="Let other people open your TrP Tools profile page."
			/>

			<div
				class="space-y-5 border-l border-border-base pl-4 transition-opacity
					{profilePublic ? '' : 'opacity-50'}"
			>
				<Toggle
					bind:checked={favoriteRoutesPublic}
					label="Favourite routes"
					description="Show the routes you have marked as favourites on your profile."
				/>

				<Toggle
					bind:checked={dislikedRoutesPublic}
					label="Disliked routes"
					description="Show the routes you would rather not be given on your profile."
				/>

				{#if !profilePublic}
					<p class="text-xs text-text-subtle">
						Your profile is hidden, so neither list is published to anyone.
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
			title="Admin mode"
			description="Site-admin powers, for this browser session only."
		>
			{#snippet actions()}
				<IconShieldCheck size={18} class={adminMode ? 'text-warning' : 'text-text-subtle'} />
			{/snippet}

			<Toggle
				checked={adminMode}
				disabled={switching}
				label="Act as a site administrator"
				description="On, you bypass every group's permissions and the administration portal opens. Off,
					TrP Tools treats you as an ordinary account — only groups you actually hold a rank in appear
					in your dashboard, on the home page and in your shifts."
				onchange={setAdminMode}
			/>

			<p class="mt-4 text-xs text-text-subtle">
				It ends with this session, and it is off on every new sign-in. API keys are never elevated.
			</p>
		</Card>
	{/if}

	<Card title="Sessions" description="Signed in on a device you no longer have?">
		<Button variant="danger" onclick={signOutEverywhere}>Sign out everywhere</Button>
	</Card>
</div>
