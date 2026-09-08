<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconCheck, IconExternalLink, IconKey } from '@tabler/icons-svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * The group's Open Cloud key.
	 *
	 * The key must be owned by a *user account*: Open Cloud refuses a
	 * group-owned key on every `/cloud/v2/groups` route whatever permissions it
	 * carries, which the published spec does not say (§4).
	 */
	interface Props {
		group: { id: string; hasOpenCloudKey: boolean };
	}

	let { group }: Props = $props();

	let apiKey = $state('');
	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			const { error } = await api
				.groups({ groupId: group.id })
				['open-cloud-key'].put({ apiKey: apiKey.trim() || null });
			if (error) throw error;

			toasts.success(
				apiKey.trim()
					? m.dashboard_settings_open_cloud_key_verified_stored()
					: m.dashboard_settings_open_cloud_key_removed()
			);
			apiKey = '';
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_settings_key_could_not_read_group()));
		} finally {
			saving = false;
		}
	}
</script>

<Card
	title={m.dashboard_settings_roblox_open_cloud()}
	description={m.dashboard_settings_how_trp_tools_reads_ranks_group()}
>
	{#snippet actions()}
		{#if group.hasOpenCloudKey}
			<Badge tone="success"><IconCheck size={13} /> {m.dashboard_settings_connected()}</Badge>
		{:else}
			<Badge tone="warning">{m.dashboard_settings_not_connected()}</Badge>
		{/if}
	{/snippet}

	<div class="space-y-4">
		<p class="text-sm leading-relaxed text-text-muted">
			{m.dashboard_settings_roblox_open_cloud_will_not_answer()}
		</p>

		<ol class="list-decimal space-y-1.5 pl-5 text-sm text-text-muted">
			<li>
				{m.common_open()}
				<a
					href="https://create.roblox.com/dashboard/credentials"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-accent hover:underline"
				>
					{m.dashboard_settings_creator_dashboard_credentials()} <IconExternalLink size={12} />
				</a>
			</li>
			<li>
				{m.dashboard_settings_create_api_key_owned_by()}
				<strong class="font-medium text-text">{m.dashboard_settings_own_account()}</strong
				>{m.dashboard_settings_open_cloud_will_not_accept_key()}
			</li>
			<li>
				{m.dashboard_settings_under_access_permissions_add()}
				<span class="font-mono text-xs text-text">{m.dashboard_settings_group()}</span>
				{m.dashboard_settings_api_system_choose_group_give()}
				<span class="font-mono text-xs text-text">{m.dashboard_settings_group_read()}</span>.
			</li>
			<li>{m.dashboard_settings_paste_key_below_verified_against_group()}</li>
		</ol>

		<p
			class="rounded-lg border border-border-base bg-background-secondary px-3 py-2 text-xs text-text-subtle"
		>
			{m.dashboard_settings_key_stays_with_group_so_keeps()}
		</p>

		<Field
			label={group.hasOpenCloudKey ? m.dashboard_settings_replace_key() : m.dashboard_settings_api_key()}
			hint={m.dashboard_settings_leave_blank_save_remove_existing_key()}
		>
			<div class="flex flex-wrap gap-2">
				<Input
					bind:value={apiKey}
					type="password"
					autocomplete="off"
					spellcheck="false"
					placeholder={m.dashboard_settings_paste_open_cloud_api_key()}
					class="min-w-56 flex-1"
				/>
				<Button onclick={save} loading={saving}>
					<IconKey size={16} />
					{apiKey.trim() ? m.dashboard_settings_verify_save() : m.dashboard_settings_remove_key()}
				</Button>
			</div>
		</Field>
	</div>
</Card>
