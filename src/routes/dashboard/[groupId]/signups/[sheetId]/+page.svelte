<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconBrandDiscord,
		IconClipboardList,
		IconSettings,
		IconTrash,
		IconUsers
	} from '@tabler/icons-svelte';
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import SheetSlots from '$lib/components/signups/SheetSlots.svelte';
	import SheetDiscord from '$lib/components/signups/SheetDiscord.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import TranslatableField from '$lib/components/i18n/TranslatableField.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { Translations } from '$lib/utils/translations';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let sheet = $derived(data.sheet);
	let base = $derived(`/dashboard/${group.slug}/signups`);

	let busy = $state(false);

	let sections = $derived<ObjectSection[]>([
		{ id: 'slots', label: m.signups_slots(), icon: IconClipboardList },
		{ id: 'settings', label: m.signups_sheet_settings(), icon: IconSettings },
		{ id: 'discord', label: m.dashboard_ranks_discord(), icon: IconBrandDiscord }
	]);

	/** Who the sheet is for, in words, for the chips under the title. */
	let audience = $derived(
		sheet.uniformRanks
			? data.ranks.filter((rank) => sheet.rankIds.includes(rank.id)).map((rank) => rank.name)
			: []
	);

	/**
	 * The sheet's own text, held locally and saved on blur.
	 *
	 * The source text and its translations are one save — a blur that sent
	 * only the box that changed would drop whichever of the two the editor was
	 * not looking at.
	 */
	let name = $state('');
	let description = $state('');
	let translations = $state<Translations>({});
	let textDirty = $state(false);

	$effect(() => {
		if (textDirty) return;

		name = sheet.name;
		description = sheet.description;
		translations = structuredClone(sheet.translations);
	});

	async function patch(body: Record<string, unknown>) {
		busy = true;
		try {
			const { error } = await api.signups({ sheetId: sheet.id }).patch(body);
			if (error) throw error;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.signups_could_not_save_sheet()));
		} finally {
			busy = false;
		}
	}

	async function saveText() {
		if (!textDirty || !name.trim()) return;
		textDirty = false;

		await patch({ name: name.trim(), description, translations });
	}

	async function remove() {
		if (!confirm(m.signups_delete_confirm({ sheet: sheet.name }))) return;

		busy = true;
		try {
			const { error } = await api.signups({ sheetId: sheet.id }).delete();
			if (error) throw error;

			toasts.success(m.signups_sheet_deleted());
			await goto(base);
		} catch (error) {
			toasts.error(errorMessage(error, m.signups_could_not_delete_sheet()));
		} finally {
			busy = false;
		}
	}
</script>

<ObjectPage
	backHref={base}
	backLabel={m.common_signups()}
	title={sheet.name}
	description={sheet.description}
	accent={sheet.color}
	{sections}
>
	{#snippet meta()}
		<Badge tone={sheet.enabled ? 'success' : undefined}>
			{sheet.enabled ? m.signups_open() : m.signups_off()}
		</Badge>
		<Badge>{m.signups_slot_count({ count: sheet.slots.length })}</Badge>
		{#if !sheet.uniformRanks}
			<Badge>{m.signups_per_slot_ranks()}</Badge>
		{:else if audience.length === 0}
			<Badge><IconUsers size={13} /> {m.signups_every_member()}</Badge>
		{:else}
			{#each audience as rank (rank)}<Badge>{rank}</Badge>{/each}
		{/if}
	{/snippet}

	{#snippet actions()}
		<Button size="sm" variant="ghost" disabled={busy} onclick={remove}>
			<IconTrash size={15} /> {m.signups_delete_sheet()}
		</Button>
	{/snippet}

	{#snippet children(section)}
		{#if section === 'slots'}
			<Card title={m.signups_slots()} description={m.signups_slots_hint()}>
				<SheetSlots {sheet} ranks={data.ranks} sourceLocale={group.sourceLocale} />
			</Card>
		{:else if section === 'settings'}
			<Card title={m.signups_sheet_settings()} description={m.signups_sheet_settings_hint()}>
				<div class="space-y-4">
					<Toggle
						checked={sheet.enabled}
						label={m.signups_open_sign_ups()}
						description={m.signups_open_sign_ups_hint()}
						disabled={busy}
						onchange={(enabled) => patch({ enabled })}
					/>

					<div class="grid gap-3 sm:grid-cols-[1fr_auto]">
						<Field label={m.signups_sheet_name()} hint={m.signups_sheet_name_hint()}>
							<TranslatableField
								bind:value={name}
								bind:translations
								field="name"
								sourceLocale={group.sourceLocale}
								maxlength={60}
								disabled={busy}
								oninput={() => (textDirty = true)}
								onblur={saveText}
							/>
						</Field>

						<Field label={m.common_color()}>
							<ColorInput
								value={sheet.color}
								disabled={busy}
								oncommit={(color) => patch({ color })}
							/>
						</Field>
					</div>

					<Field label={m.common_description()} hint={m.signups_description_hint()}>
						<TranslatableField
							bind:value={description}
							bind:translations
							field="description"
							sourceLocale={group.sourceLocale}
							maxlength={300}
							disabled={busy}
							placeholder={m.signups_description_placeholder()}
							oninput={() => (textDirty = true)}
							onblur={saveText}
						/>
					</Field>
				</div>
			</Card>
		{:else if section === 'discord'}
			<Card title={m.dashboard_ranks_discord()} description={m.signups_discord_section_hint()}>
				<SheetDiscord
					groupId={group.id}
					groupSlug={group.slug}
					{sheet}
					botConnected={data.botConnected}
					channelNames={data.channelNames}
					roleNames={data.roleNames}
				/>
			</Card>
		{/if}
	{/snippet}
</ObjectPage>
