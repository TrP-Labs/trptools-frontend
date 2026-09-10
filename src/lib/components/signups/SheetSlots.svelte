<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconGripVertical, IconPlus, IconTrash } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import TranslatableField from '$lib/components/i18n/TranslatableField.svelte';
	import RankTags from './RankTags.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PickableRank, SignupSheetDetail } from '$lib/api/types';
	import type { Translations } from '$lib/utils/translations';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * What a sheet is made of: who may fill it, and the slots themselves.
	 *
	 * The rank list leads because it is the decision the slots hang off. A
	 * group that wants one list for the whole sheet — which is nearly all of
	 * them — reads two controls and stops; the per-slot lists only appear once
	 * somebody says the slots differ, so the common case is not made to look
	 * at the rare one.
	 */
	interface Props {
		sheet: SignupSheetDetail;
		ranks: PickableRank[];
		/** The language the group writes in, which the boxes default to. */
		sourceLocale: string;
	}

	let { sheet, ranks, sourceLocale }: Props = $props();

	let busy = $state(false);

	type DraftSlot = {
		name: string;
		description: string;
		capacity: number;
		rankIds: string[];
		translations: Translations;
	};

	/**
	 * Slots are edited locally and saved together.
	 *
	 * A per-keystroke save would rename a slot letter by letter, and the API
	 * matches slots by name to keep existing sign-ups attached — so a partial
	 * name would orphan them.
	 */
	let draft = $state<DraftSlot[]>([]);
	let dirty = $state(false);

	/**
	 * The server is the source of truth right up until somebody starts typing.
	 *
	 * Saving anything else on the sheet reloads the page data, and without
	 * this the draft would keep showing whatever it held when the component
	 * was created. Unsaved edits win, so a reload cannot discard them.
	 */
	$effect(() => {
		const incoming = sheet.slots;
		if (dirty) return;

		draft = incoming.map((slot) => ({
			name: slot.name,
			description: slot.description,
			capacity: slot.capacity,
			rankIds: [...slot.rankIds],
			translations: structuredClone(slot.translations)
		}));
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

	async function saveSlots() {
		busy = true;
		try {
			const { error } = await api.signups({ sheetId: sheet.id }).slots.put({
				slots: draft
					.filter((slot) => slot.name.trim())
					.map((slot, index) => ({
						name: slot.name.trim(),
						description: slot.description,
						translations: slot.translations,
						capacity: slot.capacity,
						order: index,
						// Sent even while the sheet is uniform, so a group that
						// turns the toggle off finds the lists it left behind
						// rather than an empty one that opens every slot.
						rankIds: slot.rankIds
					}))
			});
			if (error) throw error;

			dirty = false;
			toasts.success(m.signups_slots_saved());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.signups_could_not_save_slots()));
		} finally {
			busy = false;
		}
	}

	function addSlot() {
		// A new slot inherits the sheet's list rather than starting empty:
		// empty means everybody, and a slot added to a sheet for dispatchers
		// is a dispatcher slot until somebody says otherwise.
		draft = [
			...draft,
			{ name: '', description: '', capacity: 1, rankIds: [...sheet.rankIds], translations: {} }
		];
		dirty = true;
	}

	function move(index: number, by: number) {
		const to = index + by;
		if (to < 0 || to >= draft.length) return;

		const next = [...draft];
		[next[index], next[to]] = [next[to], next[index]];
		draft = next;
		dirty = true;
	}
</script>

<div class="space-y-6">
	<section>
		<h3 class="text-sm font-semibold text-text">{m.signups_who_can_sign_up()}</h3>
		<p class="mt-1 mb-3 text-xs text-text-muted">
			{sheet.uniformRanks ? m.signups_who_can_sign_up_hint() : m.signups_who_can_sign_up_per_slot_hint()}
		</p>

		<Toggle
			checked={sheet.uniformRanks}
			label={m.signups_same_ranks_every_slot()}
			description={m.signups_same_ranks_every_slot_hint()}
			disabled={busy}
			onchange={(uniformRanks) => patch({ uniformRanks })}
		/>

		<!--
			Indented under the toggle it belongs to, the way the bot page
			indents a ping's sub-setting: at the same margin it read as a
			second, unrelated control that happened to follow.
		-->
		{#if sheet.uniformRanks}
			<div class="mt-3 ml-7">
				<RankTags
					value={sheet.rankIds}
					{ranks}
					disabled={busy}
					onchange={(rankIds) => patch({ rankIds })}
				/>
			</div>
		{/if}
	</section>

	<section>
		<div class="mb-2 flex items-center justify-between">
			<span class="text-xs font-semibold tracking-wide text-text-muted uppercase">
				{m.signups_slots()}
			</span>
			<Button size="sm" variant="ghost" onclick={addSlot} disabled={busy}>
				<IconPlus size={15} /> {m.signups_add_slot()}
			</Button>
		</div>

		{#if draft.length === 0}
			<p
				class="rounded-lg border border-dashed border-border-base px-3 py-4 text-center text-sm text-text-muted"
			>
				{m.signups_no_slots_yet()}
			</p>
		{:else}
			<ul class="space-y-2">
				{#each draft as slot, index (index)}
					<li class="rounded-lg border border-border-base bg-background-secondary p-3">
						<!--
							`ml-auto` on the delete button so a row that wraps on a
							phone leaves it at the right-hand edge rather than
							orphaned under the name box.
						-->
						<div class="flex flex-wrap items-end gap-2">
							<!--
								Reordering by button rather than by dragging: the
								list is short, it has to work on a phone, and a
								drag target this size is a coin toss there.
							-->
							<div class="mb-1.5 flex flex-col text-text-subtle">
								<button
									type="button"
									disabled={busy || index === 0}
									onclick={() => move(index, -1)}
									aria-label={m.signups_move_slot_up()}
									title={m.signups_move_slot_up()}
									class="rounded px-1 text-[10px] leading-3 transition-colors hover:text-text disabled:opacity-30"
								>
									▲
								</button>
								<span class="grid place-items-center py-0.5"><IconGripVertical size={13} /></span>
								<button
									type="button"
									disabled={busy || index === draft.length - 1}
									onclick={() => move(index, 1)}
									aria-label={m.signups_move_slot_down()}
									title={m.signups_move_slot_down()}
									class="rounded px-1 text-[10px] leading-3 transition-colors hover:text-text disabled:opacity-30"
								>
									▼
								</button>
							</div>

							<div class="min-w-32 flex-1">
								<Field label={m.common_name()}>
									<TranslatableField
										bind:value={slot.name}
										bind:translations={slot.translations}
										field="name"
										{sourceLocale}
										maxlength={60}
										placeholder={m.signups_slot_name_placeholder()}
										oninput={() => (dirty = true)}
									/>
								</Field>
							</div>

							<div class="min-w-40 flex-[2]">
								<Field label={m.common_description()}>
									<TranslatableField
										bind:value={slot.description}
										bind:translations={slot.translations}
										field="description"
										{sourceLocale}
										maxlength={300}
										placeholder={m.signups_optional()}
										oninput={() => (dirty = true)}
									/>
								</Field>
							</div>

							<div class="w-24">
								<Field label={m.signups_spaces()}>
									<Input
										type="number"
										min="1"
										max="100"
										bind:value={slot.capacity}
										oninput={() => (dirty = true)}
									/>
								</Field>
							</div>

							<button
								type="button"
								onclick={() => {
									draft = draft.filter((_, position) => position !== index);
									dirty = true;
								}}
								aria-label={m.signups_remove_slot()}
								title={m.signups_remove_slot()}
								class="mb-1.5 ml-auto rounded-lg p-2 text-text-subtle transition-colors hover:text-danger"
							>
								<IconTrash size={16} />
							</button>
						</div>

						{#if !sheet.uniformRanks}
							<div class="mt-3 border-t border-border-base pt-3">
								<p class="mb-2 text-xs text-text-muted">{m.signups_slot_ranks()}</p>
								<RankTags
									value={slot.rankIds}
									{ranks}
									disabled={busy}
									onchange={(rankIds) => {
										slot.rankIds = rankIds;
										dirty = true;
									}}
								/>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if dirty}
			<div class="mt-3 flex items-center gap-3">
				<Button size="sm" onclick={saveSlots} loading={busy}>{m.signups_save_slots()}</Button>
				<span class="text-xs text-text-subtle">{m.signups_unsaved_changes()}</span>
			</div>
		{/if}
	</section>
</div>
