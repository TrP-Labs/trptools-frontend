<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconCheck, IconExternalLink, IconKey } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import IconUploader from '$lib/components/media/IconUploader.svelte';
	import VehicleTypesCard from '$lib/components/dispatch/VehicleTypesCard.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatRelative } from '$lib/utils/format';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);

	// Seeded from the loaded group, then owned by the form until saved. The
	// effect re-seeds it after a save invalidates, so the form always reflects
	// what the server actually stored.
	let form = $state(seed());

	function seed() {
		return {
			slug: group.slug,
			visibility: group.visibility,
			tagline: group.tagline,
			about: group.about,
			accentColor: group.accentColor,
			showRoutes: group.showRoutes,
			showShifts: group.showShifts,
			showRoster: group.showRoster,
			roomOpenLeadMinutes: group.roomOpenLeadMinutes,
			signupLeadMinutes: group.signupLeadMinutes
		};
	}

	let saving = $state(false);

	let apiKey = $state('');
	let keySaving = $state(false);

	const visibilities = [
		{ value: 'PUBLIC' as const, label: m.dashboard_settings_public_listed_directory() },
		{ value: 'UNLISTED' as const, label: m.dashboard_settings_unlisted_reachable_by_direct_link_only() },
		{ value: 'PRIVATE' as const, label: m.dashboard_settings_private_members_only() }
	];

	async function save() {
		saving = true;
		try {
			const { error } = await api.groups({ groupId: group.id }).patch({
				...form,
				roomOpenLeadMinutes: Number(form.roomOpenLeadMinutes) || 0,
				signupLeadMinutes: Number(form.signupLeadMinutes) || 0
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

	async function saveKey() {
		keySaving = true;
		try {
			const { error } = await api
				.groups({ groupId: group.id })
				['open-cloud-key'].put({ apiKey: apiKey.trim() || null });
			if (error) throw error;

			toasts.success(apiKey.trim() ? 'Open Cloud key verified and stored' : 'Open Cloud key removed');
			apiKey = '';
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_settings_key_could_not_read_group()));
		} finally {
			keySaving = false;
		}
	}
</script>

<PageHeader title={m.common_settings()} description={m.dashboard_settings_how_group_appears_how_trp_tools()} />

<div class="space-y-6">
	<Card title={m.common_public_page()} description={m.dashboard_settings_what_people_see_at_group_s()}>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label={m.common_visibility()} class="sm:col-span-2">
				<Select bind:value={form.visibility} options={visibilities} />
			</Field>

			<Field label={m.dashboard_settings_page_address()} hint={m.dashboard_settings_letters_numbers_dashes()}>
				<div class="flex items-center gap-1.5">
					<span class="shrink-0 text-sm text-text-subtle">/g/</span>
					<Input bind:value={form.slug} maxlength={48} spellcheck="false" />
				</div>
			</Field>

			<Field label={m.dashboard_settings_accent_colour()}>
				<ColorInput bind:value={form.accentColor} />
			</Field>

			<Field label={m.dashboard_settings_tagline()} hint={m.dashboard_settings_one_line_shown_under_group_name()} class="sm:col-span-2">
				<Input bind:value={form.tagline} maxlength={160} placeholder={m.dashboard_settings_short_description()} />
			</Field>

			<Field label={m.common_about()} class="sm:col-span-2">
				<Textarea
					bind:value={form.about}
					rows={4}
					maxlength={4000}
					placeholder={m.dashboard_settings_tell_people_what_group_does()}
				/>
			</Field>

			<div class="sm:col-span-2">
				<IconUploader
					groupId={group.id}
					ownerType="GROUP"
					current={group.bannerImage}
					label={m.dashboard_settings_banner_image()}
					hint={m.dashboard_settings_sits_behind_group_name_public_page()}
					aspect="wide"
				/>
			</div>

			<div class="space-y-3 sm:col-span-2">
				<Toggle bind:checked={form.showRoutes} label={m.dashboard_settings_show_routes()} description={m.dashboard_settings_list_public_routes_page()} />
				<Toggle bind:checked={form.showShifts} label={m.dashboard_settings_show_shifts()} description={m.dashboard_settings_list_upcoming_public_shifts()} />
				<Toggle
					bind:checked={form.showRoster}
					label={m.dashboard_settings_show_staff_list()}
					description={m.dashboard_settings_list_ranks_marked_visible()}
				/>
			</div>
		</div>

		{#snippet actions()}
			<Button onclick={save} loading={saving}>{m.common_save()}</Button>
		{/snippet}
	</Card>

	<Card title={m.common_shifts()} description={m.dashboard_settings_how_dispatch_rooms_staff_sign_ups()}>
		<Field
			label={m.dashboard_settings_open_rooms_many_minutes_early()}
			hint={m.dashboard_settings_dispatch_page_counts_down_next_shift()}
		>
			<div class="flex items-center gap-3">
				<Input
					type="number"
					min="0"
					max="120"
					bind:value={form.roomOpenLeadMinutes}
					class="max-w-32"
				/>
				<span class="text-sm text-text-muted">{m.dashboard_settings_minutes()}</span>
			</div>
		</Field>

		<Field
			label={m.dashboard_settings_open_sign_ups_many_minutes_early()}
			hint={m.dashboard_settings_staff_sign_up_sheets_appear_shift()}
		>
			<div class="flex items-center gap-3">
				<Input
					type="number"
					min="0"
					max="43200"
					step="60"
					bind:value={form.signupLeadMinutes}
					class="max-w-32"
				/>
				<span class="text-sm text-text-muted">{m.dashboard_settings_minutes()}</span>
			</div>
		</Field>

		{#snippet actions()}
			<Button onclick={save} loading={saving}>{m.common_save()}</Button>
		{/snippet}
	</Card>

	<VehicleTypesCard groupId={group.id} types={data.vehicleTypes} />

	<Card title={m.dashboard_settings_roblox_open_cloud()} description={m.dashboard_settings_how_trp_tools_reads_ranks_group()}>
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
					{m.dashboard_settings_create_api_key_owned_by()} <strong class="font-medium text-text">{m.dashboard_settings_own_account()}</strong>{m.dashboard_settings_open_cloud_will_not_accept_key()}
				</li>
				<li>
					{m.dashboard_settings_under_access_permissions_add()} <span class="font-mono text-xs text-text">{m.dashboard_settings_group()}</span> {m.dashboard_settings_api_system_choose_group_give()}
					<span class="font-mono text-xs text-text">{m.dashboard_settings_group_read()}</span>.
				</li>
				<li>{m.dashboard_settings_paste_key_below_verified_against_group()}</li>
			</ol>

			<p class="rounded-lg border border-border-base bg-background-secondary px-3 py-2 text-xs text-text-subtle">
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
					<Button onclick={saveKey} loading={keySaving}>
						<IconKey size={16} />
						{apiKey.trim() ? m.dashboard_settings_verify_save() : m.dashboard_settings_remove_key()}
					</Button>
				</div>
			</Field>
		</div>
	</Card>

	<Card title={m.dashboard_settings_recent_activity()} description={m.dashboard_settings_administrative_changes_group()}>
		{#if data.audit.length === 0}
			<p class="text-sm text-text-muted">{m.dashboard_settings_nothing_recorded_yet()}</p>
		{:else}
			<ul class="divide-y divide-border-base">
				{#each data.audit.slice(0, 25) as entry (entry.id)}
					<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
						<Avatar
							src={entry.actor?.avatar}
							name={entry.actor?.displayName ?? entry.actor?.username}
							size={22}
						/>
						<span class="text-sm font-medium text-text">
							{entry.actor?.displayName ?? entry.actor?.username ?? m.dashboard_settings_removed_account()}
						</span>
						<span class="min-w-0 flex-1 text-sm text-text-muted">{entry.summary}</span>
						<span class="shrink-0 text-xs text-text-subtle">{formatRelative(entry.date)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</div>
