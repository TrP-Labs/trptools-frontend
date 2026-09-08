<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * What a group insists its members connect before taking part.
	 *
	 * Two switches rather than one because they are different asks: a group
	 * that runs its shifts on Discord needs to reach whoever put their name
	 * down, which is the sign-up case, while vetting an applicant is the
	 * other. Plenty of groups want the second without the first.
	 */
	interface Props {
		group: {
			id: string;
			requireDiscordForSignups: boolean;
			requireDiscordForApplications: boolean;
		};
	}

	let { group }: Props = $props();

	let form = $state(seed());

	function seed() {
		return {
			requireDiscordForSignups: group.requireDiscordForSignups,
			requireDiscordForApplications: group.requireDiscordForApplications
		};
	}

	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			const { error } = await api.groups({ groupId: group.id }).patch({
				requireDiscordForSignups: form.requireDiscordForSignups,
				requireDiscordForApplications: form.requireDiscordForApplications
			});
			if (error) throw error;

			toasts.success(m.dashboard_settings_settings_saved());
			await refreshData();
			form = seed();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_settings_could_not_save_those_settings()));
		} finally {
			saving = false;
		}
	}
</script>

<Card
	title={m.dashboard_settings_discord_requirements()}
	description={m.dashboard_settings_what_members_connect_before_taking_part()}
>
	<div class="space-y-5">
		<Toggle
			bind:checked={form.requireDiscordForSignups}
			label={m.dashboard_settings_require_discord_sign_up()}
			description={m.dashboard_settings_members_without_discord_cannot_take_slot()}
		/>

		<Toggle
			bind:checked={form.requireDiscordForApplications}
			label={m.dashboard_settings_require_discord_apply()}
			description={m.dashboard_settings_applicants_connect_discord_before_sending()}
		/>

		<!--
			Said whichever way the second switch is set: an applicant's Discord
			account travels with the application whenever they have one, so
			turning the requirement on decides who may apply rather than what a
			reviewer gets to see.
		-->
		<p class="text-xs text-text-subtle">
			{m.dashboard_settings_discord_account_sent_with_every_application()}
		</p>
	</div>

	{#snippet actions()}
		<Button onclick={save} loading={saving}>{m.common_save()}</Button>
	{/snippet}
</Card>
