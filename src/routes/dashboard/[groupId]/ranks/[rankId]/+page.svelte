<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import { IconRefresh, IconSettings, IconShieldLock, IconTrash } from '@tabler/icons-svelte';
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import PermissionEditor from '$lib/components/ranks/PermissionEditor.svelte';
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
	import { grantCount } from '$lib/utils/permissions';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let rank = $derived(data.rank);
	let base = $derived(`/dashboard/${group.slug}/ranks`);

	/** The Roblox owner role always keeps full control (see the permission model). */
	let isOwner = $derived(rank.cachedRank === 255);

	let busy = $state(false);

	/**
	 * A rank's sections are about the rank.
	 *
	 * Sign-ups and their Discord settings used to be two of them, from when a
	 * sheet hung off a rank. They are their own objects now, under Sign-ups,
	 * and a rank appears on the lists that say which sheets it may fill —
	 * which is a fact about the sheet, edited there.
	 */
	let sections = $derived<ObjectSection[]>([
		{ id: 'permissions', label: m.dashboard_ranks_permissions(), icon: IconShieldLock },
		{ id: 'settings', label: m.dashboard_ranks_rank_settings(), icon: IconSettings }
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
		<Badge>{m.dashboard_ranks_rank_number({ number: rank.cachedRank })}</Badge>
		<Badge tone={rank.permissionLevel > 0 ? 'accent' : undefined}>
			{permissionLabel(rank.permissionLevel)}
		</Badge>
		{#if rank.permissions > 0}
			<Badge>{m.dashboard_ranks_grants_held({ count: grantCount(rank.permissions) })}</Badge>
		{/if}
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
			<Card
				title={m.dashboard_ranks_access()}
				description={m.dashboard_ranks_what_members_holding_rank_can_do()}
			>
				<PermissionEditor
					permissions={rank.permissions}
					editorPermissions={group.permissions}
					locked={isOwner}
					{busy}
					onchange={(permissions) => patch({ permissions })}
				/>
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
		{/if}
	{/snippet}
</ObjectPage>
