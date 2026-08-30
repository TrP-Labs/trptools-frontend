<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconCalendarTime, IconChevronDown, IconPlus } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ShiftEditor, { type ShiftDraft } from '$lib/components/shifts/ShiftEditor.svelte';
	import SignupSheets from '$lib/components/shifts/SignupSheets.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatDateTime, formatDuration, formatRelative } from '$lib/utils/format';
	import { buildRule, fromLocalInput, parseRule, toLocalInput } from '$lib/utils/recurrence';
	import type { ShiftEvent } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let canManage = $derived(group.permissionLevel >= 3);

	function emptyDraft(): ShiftDraft {
		const start = new Date();
		start.setMinutes(0, 0, 0);
		start.setHours(start.getHours() + 1);

		return {
			name: '',
			description: '',
			color: '#4287f5',
			startLocal: toLocalInput(start),
			duration: 120,
			repeat: 'WEEKLY',
			days: [],
			visibility: 'PUBLIC',
			hostLevel: 2
		};
	}

	function toDraft(shift: ShiftEvent): ShiftDraft {
		const recurrence = parseRule(shift.rrule);

		return {
			name: shift.name,
			description: shift.description,
			color: shift.color,
			startLocal: toLocalInput(new Date(shift.startTime)),
			duration: shift.duration,
			repeat: recurrence.repeat,
			days: recurrence.days,
			visibility: shift.visibility,
			hostLevel: shift.hostLevel
		};
	}

	let createOpen = $state(false);
	let createDraft = $state(emptyDraft());
	let creating = $state(false);

	let editing = $state<ShiftEvent | null>(null);
	let editDraft = $state<ShiftDraft>(emptyDraft());
	let savingEdit = $state(false);

	function payload(draft: ShiftDraft) {
		const start = fromLocalInput(draft.startLocal);

		return {
			name: draft.name.trim(),
			description: draft.description,
			color: draft.color,
			startTime: start,
			rrule: buildRule({ repeat: draft.repeat, days: draft.days }, start),
			duration: draft.duration,
			visibility: draft.visibility,
			hostLevel: draft.hostLevel
		};
	}

	async function createShift() {
		creating = true;
		try {
			const { data: created, error } = await api.schedule.post({
				groupId: group.id,
				...payload(createDraft)
			});
			if (!created) throw error;

			toasts.success(m.dashboard_shifts_shift_created());
			createOpen = false;
			createDraft = emptyDraft();
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_shifts_could_not_create_shift()));
		} finally {
			creating = false;
		}
	}

	async function saveShift() {
		if (!editing) return;

		savingEdit = true;
		try {
			const { error } = await api.schedule({ eventId: editing.eventId }).patch(payload(editDraft));
			if (error) throw error;

			toasts.success(m.dashboard_shifts_shift_saved());
			editing = null;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_shifts_could_not_save_shift()));
		} finally {
			savingEdit = false;
		}
	}

	async function deleteShift() {
		if (!editing) return;
		if (!confirm(m.dashboard_shifts_delete_confirm({ shift: editing.name }))) return;

		savingEdit = true;
		try {
			const { error } = await api.schedule({ eventId: editing.eventId }).delete();
			if (error) throw error;

			toasts.success(m.dashboard_shifts_shift_deleted());
			editing = null;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_shifts_could_not_delete_shift()));
		} finally {
			savingEdit = false;
		}
	}

	function openEditor(shift: ShiftEvent) {
		editing = shift;
		editDraft = toDraft(shift);
	}
</script>

<PageHeader title={m.common_shifts()} description={m.dashboard_shifts_recurring_services_who_has_signed_up()}>
	{#snippet actions()}
		{#if canManage}
			<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> {m.dashboard_shifts_new_shift()}</Button>
		{/if}
	{/snippet}
</PageHeader>

<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
	<!-- Upcoming occurrences with signups -->
	<div>
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-text-muted uppercase">{m.dashboard_shifts_upcoming()}</h2>

		{#if data.occurrences.length === 0}
			<EmptyState
				title={m.common_nothing_scheduled()}
				description={canManage
					? m.dashboard_shifts_create_shift_its_occurrences_will_appear()
					: m.dashboard_shifts_no_shifts_are_scheduled_next_month()}
			>
				{#snippet icon()}<IconCalendarTime size={28} stroke={1.5} />{/snippet}
			</EmptyState>
		{:else}
			<ul class="space-y-3">
				{#each data.occurrences as occurrence (occurrence.eventId + occurrence.start)}
					<li class="card p-4">
						<div class="flex items-start gap-3">
							<span
								class="mt-1 h-10 w-1 shrink-0 rounded-full"
								style="background: {occurrence.color}"
							></span>

							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-baseline gap-x-2">
									<p class="font-medium text-text">{occurrence.name}</p>
									<span class="text-xs text-text-subtle">{formatRelative(occurrence.start)}</span>
								</div>
								<p class="text-sm text-text-muted">{formatDateTime(occurrence.start)}</p>

								<!-- Guarded so an occurrence with no sheet for this
									 viewer leaves no empty gap behind. -->
								{#if occurrence.sheets.length > 0}
									<div class="mt-3">
										<SignupSheets
											sheets={occurrence.sheets}
											eventId={occurrence.eventId}
											occurrence={occurrence.start}
											userId={data.user?.userId}
										/>
									</div>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- The recurring definitions -->
	<aside>
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-text-muted uppercase">{m.dashboard_shifts_schedules()}</h2>

		{#if data.shifts.length === 0}
			<p class="rounded-xl border border-dashed border-border-base px-4 py-6 text-center text-sm text-text-muted">
				{m.dashboard_shifts_no_recurring_shifts_defined()}
			</p>
		{:else}
			<ul class="space-y-2">
				{#each data.shifts as shift (shift.eventId)}
					<li class="card p-4">
						<div class="flex items-start gap-2.5">
							<span
								class="mt-1 size-2.5 shrink-0 rounded-full"
								style="background: {shift.color}"
							></span>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium text-text">{shift.name}</p>
								<p class="mt-0.5 text-xs text-text-muted">
									Repeats {shift.recurrenceText} · {formatDuration(shift.duration)}
								</p>
								{#if shift.visibility !== 'PUBLIC'}
									<div class="mt-2 flex flex-wrap gap-1.5">
										<Badge>{m.common_members_only()}</Badge>
									</div>
								{/if}
							</div>
						</div>

						{#if canManage}
							<Button
								size="sm"
								variant="secondary"
								class="mt-3 w-full"
								onclick={() => openEditor(shift)}
							>
								{m.dashboard_shifts_edit()}
							</Button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</aside>
</div>

<Modal bind:open={createOpen} title={m.dashboard_shifts_new_shift()} size="lg">
	<ShiftEditor
		bind:draft={createDraft}
		mode="create"
		busy={creating}
		ranksHref="/dashboard/{group.slug}/ranks"
		onsave={createShift}
	/>
</Modal>

<Modal
	open={editing !== null}
	onclose={() => (editing = null)}
	title={editing ? `Edit ${editing.name}` : m.dashboard_shifts_edit_shift()}
	size="lg"
>
	<ShiftEditor
		ranksHref="/dashboard/{group.slug}/ranks"
		bind:draft={editDraft}
		mode="edit"
		busy={savingEdit}
		onsave={saveShift}
		ondelete={deleteShift}
	/>
</Modal>
