<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
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
	let saving = $state(false);
	let loaded = $state(false);

	// The public-profile flag is not part of the session payload, so it is
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
			})
			.catch(() => {});
	});

	async function save() {
		saving = true;
		try {
			const { error } = await api.users.me.preferences.patch({ timezone, profilePublic });
			if (error) throw error;

			toasts.success('Settings saved');
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save your settings'));
		} finally {
			saving = false;
		}
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
			<Button onclick={save} loading={saving}>Save</Button>
		{/snippet}

		<div class="space-y-5">
			<Field label="Time zone" hint="Shift times are shown in this zone.">
				<div class="flex flex-wrap gap-2">
					<Input bind:value={timezone} spellcheck="false" class="min-w-48 flex-1" />
					<Button variant="secondary" onclick={() => (timezone = detectTimezone())}>
						Detect
					</Button>
				</div>
			</Field>

			<Toggle
				bind:checked={profilePublic}
				label="Public profile"
				description="Let other people open your TrP Tools profile page."
			/>
		</div>
	</Card>

	<Card title="Sessions" description="Signed in on a device you no longer have?">
		<Button variant="danger" onclick={signOutEverywhere}>Sign out everywhere</Button>
	</Card>
</div>
