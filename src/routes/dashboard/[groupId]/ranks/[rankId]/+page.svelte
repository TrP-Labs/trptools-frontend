<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconBan,
		IconBrandDiscord,
		IconClipboardList,
		IconCrown,
		IconHeadphones,
		IconMicrophone,
		IconRefresh,
		IconSettings,
		IconShieldLock,
		IconTrash
	} from '@tabler/icons-svelte';
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import RankSignupEditor from '$lib/components/shifts/RankSignupEditor.svelte';
	import RankSignupDiscord from '$lib/components/shifts/RankSignupDiscord.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { permissionDescription, permissionLabel } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let rank = $derived(data.rank);
	let base = $derived(`/dashboard/${group.slug}/ranks`);

	/** The Roblox owner role always keeps full control (see the permission model). */
	let isOwner = $derived(rank.cachedRank === 255);

	let busy = $state(false);

	const levels = [
		{ level: 0, icon: IconBan },
		{ level: 1, icon: IconHeadphones },
		{ level: 2, icon: IconMicrophone },
		{ level: 3, icon: IconCrown }
	];

	let sections = $derived<ObjectSection[]>([
		{ id: 'permissions', label: m.dashboard_ranks_permissions(), icon: IconShieldLock },
		{ id: 'settings', label: m.dashboard_ranks_rank_settings(), icon: IconSettings },
		{ id: 'signups', label: m.dashboard_ranks_sign_ups(), icon: IconClipboardList },
		{ id: 'discord', label: m.dashboard_ranks_discord(), icon: IconBrandDiscord }
	]);

	async function patch(body: Record<string, unknown>, success?: string) {
		busy = true;
		try {
			const { error } = await api.ranks({ rankId: rank.id }).patch(body);
			if (error) throw error;

			if (success) toasts.success(success);
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_ranks_could_not_update_rank()));
		} finally {
			busy = false;
		}
	}

	async function unbind() {
		if (!confirm(m.dashboard_ranks_unbind_confirm({ rank: rank.cachedName })))
			return;

		busy = true;
		try {
			const { error } = await api.ranks({ rankId: rank.id }).delete();
			if (error) throw error;

			toasts.success(m.dashboard_ranks_rank_unbound());
			await goto(base);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_ranks_could_not_unbind_rank()));
		} finally {
			busy = false;
		}
	}
</script>

<ObjectPage
	backHref={base}
	backLabel="Ranks"
	title={rank.cachedName}
	description={permissionDescription(rank.permissionLevel)}
	accent={rank.color}
	{sections}
>
	{#snippet meta()}
		{#if isOwner}<Badge tone="accent">{m.dashboard_ranks_owner()}</Badge>{/if}
		<Badge>Rank {rank.cachedRank}</Badge>
		<Badge tone={rank.permissionLevel > 0 ? 'accent' : undefined}>
			{permissionLabel(rank.permissionLevel)}
		</Badge>
		{#if rank.visible}<Badge>{m.dashboard_ranks_staff_list()}</Badge>{/if}
	{/snippet}

	{#snippet actions()}
		<Button
			size="sm"
			variant="secondary"
			disabled={busy}
			onclick={() => patch({ refresh: true }, 'Refreshed from Roblox')}
		>
			<IconRefresh size={15} /> {m.dashboard_ranks_refresh_from_roblox()}
		</Button>

		{#if !isOwner}
			<Button size="sm" variant="ghost" disabled={busy} onclick={unbind}>
				<IconTrash size={15} /> {m.dashboard_ranks_unbind()}
			</Button>
		{/if}
	{/snippet}

	{#snippet children(section)}
		{#if section === 'permissions'}
			<Card title={m.dashboard_ranks_access()} description={m.dashboard_ranks_what_members_holding_rank_can_do()}>
				<div class="flex flex-wrap items-center gap-1">
					{#each levels as option (option.level)}
						{@const active = rank.permissionLevel === option.level}
						<button
							type="button"
							disabled={isOwner || busy}
							title={permissionDescription(option.level)}
							aria-pressed={active}
							onclick={() => patch({ permissionLevel: option.level })}
							class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors
								disabled:cursor-not-allowed disabled:opacity-50
								{active
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base text-text-subtle hover:text-text'}"
						>
							<option.icon size={17} />
							{permissionLabel(option.level)}
						</button>
					{/each}
				</div>

				<p class="mt-3 text-sm text-text-muted">
					{permissionDescription(rank.permissionLevel)}
				</p>

				{#if isOwner}
					<p class="mt-2 text-xs text-text-subtle">
						{m.dashboard_ranks_owner_rank_always_keeps_full_access()}
					</p>
				{/if}
			</Card>
		{:else if section === 'settings'}
			<Card title={m.dashboard_ranks_staff_list_2()} description={m.dashboard_ranks_how_rank_appears_group_s_public()}>
				<div class="space-y-4">
					<Toggle
						checked={rank.visible}
						label={m.dashboard_ranks_show_public_staff_list()}
						description={m.dashboard_ranks_lists_rank_people_holding_public_page()}
						disabled={busy}
						onchange={(visible) => patch({ visible })}
					/>

					<div class="grid gap-4 sm:grid-cols-[1fr_auto]">
						<Field label={m.common_description()} hint={m.dashboard_ranks_shown_under_rank_public_staff_list()}>
							<Input
								value={rank.description}
								maxlength={300}
								disabled={busy}
								placeholder={m.dashboard_ranks_e_g_drives_assigned_routes_shift()}
								onblur={(event) => {
									const next = (event.currentTarget as HTMLInputElement).value;
									if (next !== rank.description) patch({ description: next });
								}}
							/>
						</Field>

						<Field label={m.common_color()}>
							<ColorInput
								value={rank.color}
								disabled={busy}
								oncommit={(color) => patch({ color })}
							/>
						</Field>
					</div>
				</div>
			</Card>
		{:else if section === 'signups'}
			<Card
				title={m.dashboard_ranks_sign_up_sheet()}
				description={m.dashboard_ranks_slots_people_at_rank_above_can()}
			>
				<RankSignupEditor
					rankId={rank.id}
					rankName={rank.cachedName}
					rankColor={rank.color}
					signup={data.signup}
				/>
			</Card>
		{:else if section === 'discord'}
			<Card title={m.dashboard_ranks_discord()} description={m.dashboard_ranks_where_rank_s_sheet_posted_if()}>
				<RankSignupDiscord
					groupId={group.id}
					groupSlug={group.slug}
					rankId={rank.id}
					signup={data.signup}
					botConnected={data.botConnected}
					channelNames={data.channelNames}
					roleNames={data.roleNames}
				/>
			</Card>
		{/if}
	{/snippet}
</ObjectPage>
