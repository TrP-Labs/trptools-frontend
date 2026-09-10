<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		IconBrandDiscord,
		IconChevronRight,
		IconClipboardList,
		IconPlus,
		IconUsers
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let base = $derived(`/dashboard/${group.slug}/signups`);

	let createOpen = $state(false);
	let name = $state('');
	let color = $state('#4287f5');
	let creating = $state(false);

	/** Rank names for one sheet, in the order the group's ranks come back in. */
	function rankNames(rankIds: string[]): string[] {
		return data.ranks.filter((rank) => rankIds.includes(rank.id)).map((rank) => rank.name);
	}

	async function create() {
		if (!name.trim()) return;

		creating = true;
		try {
			const { data: created, error } = await api.signups.post({
				groupId: group.id,
				name: name.trim(),
				color
			});
			if (!created) throw error;

			toasts.success(m.signups_sheet_created());
			createOpen = false;
			name = '';

			// Straight to the new sheet rather than back to the list: its
			// slots and its rank list are both empty, and both are there.
			await goto(`${base}/${created.id}`);
		} catch (error) {
			toasts.error(errorMessage(error, m.signups_could_not_create_sheet()));
		} finally {
			creating = false;
		}
	}
</script>

<PageHeader title={m.common_signups()} description={m.signups_page_description()}>
	{#snippet actions()}
		<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> {m.signups_new_sheet()}</Button>
	{/snippet}
</PageHeader>

{#if data.sheets.length === 0}
	<EmptyState title={m.signups_no_sheets()} description={m.signups_no_sheets_hint()}>
		{#snippet icon()}<IconClipboardList size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button size="sm" onclick={() => (createOpen = true)}>
				<IconPlus size={15} /> {m.signups_new_sheet()}
			</Button>
		{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-3">
		{#each data.sheets as sheet (sheet.id)}
			{@const names = rankNames(sheet.rankIds)}
			<li>
				<a
					href="{base}/{sheet.id}"
					class="card flex items-center gap-3 p-4 transition-colors hover:border-accent/50"
				>
					<span class="h-10 w-1 shrink-0 rounded-full" style="background: {sheet.color}"></span>

					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-baseline gap-x-2">
							<p class="truncate font-medium text-text">{localized(sheet, 'name')}</p>
							{#if !sheet.enabled}
								<span class="text-xs text-text-subtle">{m.signups_off()}</span>
							{/if}
						</div>

						<p class="truncate text-sm text-text-muted">
							{sheet.slots.length === 0
								? m.signups_no_slots_yet()
								: m.signups_slot_count({ count: sheet.slots.length })}
							{#if sheet.uniformRanks}
								· {names.length === 0 ? m.signups_every_member() : names.join(', ')}
							{:else}
								· {m.signups_per_slot_ranks()}
							{/if}
						</p>
					</div>

					<div class="hidden shrink-0 items-center gap-2 sm:flex">
						{#if sheet.enabled}
							<Badge tone="success">{m.signups_open()}</Badge>
						{:else}
							<Badge>{m.signups_off()}</Badge>
						{/if}
						{#if sheet.discordChannel}
							<Badge><IconBrandDiscord size={13} /> {m.dashboard_ranks_discord()}</Badge>
						{/if}
						{#if sheet.uniformRanks && names.length === 0}
							<Badge><IconUsers size={13} /> {m.signups_every_member()}</Badge>
						{/if}
					</div>

					<IconChevronRight size={18} class="shrink-0 text-text-subtle" />
				</a>
			</li>
		{/each}
	</ul>
{/if}

<Modal bind:open={createOpen} title={m.signups_new_sheet()} description={m.signups_new_sheet_hint()}>
	<div class="space-y-4">
		<div class="grid gap-3 sm:grid-cols-[1fr_auto]">
			<Field label={m.common_name()} hint={m.signups_sheet_name_hint()}>
				<Input bind:value={name} maxlength={60} placeholder={m.signups_sheet_name_placeholder()} />
			</Field>

			<Field label={m.common_color()}>
				<ColorInput value={color} oncommit={(next) => (color = next)} />
			</Field>
		</div>

		<div class="flex justify-end gap-2">
			<Button variant="ghost" onclick={() => (createOpen = false)}>{m.common_cancel()}</Button>
			<Button loading={creating} disabled={!name.trim()} onclick={create}>
				{m.signups_create_sheet()}
			</Button>
		</div>
	</div>
</Modal>
