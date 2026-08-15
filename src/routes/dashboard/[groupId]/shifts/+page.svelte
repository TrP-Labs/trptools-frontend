<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { IconCalendarTime, IconChevronDown, IconPlus } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import ShiftEditor, {
		type ShiftDraft,
		type SlotDraft
	} from '$lib/components/shifts/ShiftEditor.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatDateTime, formatDuration, formatRelative } from '$lib/utils/format';
	import { buildRule, fromLocalInput, parseRule, toLocalInput } from '$lib/utils/recurrence';
	import type { ShiftEvent } from '$lib/api/types';
	import type { PageProps } from './$types';

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
			hostLevel: 2,
			slots: [{ name: 'Driver', description: '', capacity: 10 }]
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
			hostLevel: shift.hostLevel,
			slots: shift.slots.map((slot) => ({
				name: slot.name,
				description: slot.description,
				capacity: slot.capacity
			}))
		};
	}

	let createOpen = $state(false);
	let createDraft = $state(emptyDraft());
	let creating = $state(false);

	let editing = $state<ShiftEvent | null>(null);
	let editDraft = $state<ShiftDraft>(emptyDraft());
	let savingEdit = $state(false);

	let signingUp = $state<string | null>(null);

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
			hostLevel: draft.hostLevel,
			slots: draft.slots
				.filter((slot: SlotDraft) => slot.name.trim())
				.map((slot, index) => ({
					name: slot.name.trim(),
					description: slot.description,
					capacity: slot.capacity,
					order: index
				}))
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

			toasts.success('Shift created');
			createOpen = false;
			createDraft = emptyDraft();
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not create that shift'));
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

			toasts.success('Shift saved');
			editing = null;
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save that shift'));
		} finally {
			savingEdit = false;
		}
	}

	async function deleteShift() {
		if (!editing) return;
		if (!confirm(`Delete “${editing.name}”? Signups for it will be removed too.`)) return;

		savingEdit = true;
		try {
			const { error } = await api.schedule({ eventId: editing.eventId }).delete();
			if (error) throw error;

			toasts.success('Shift deleted');
			editing = null;
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not delete that shift'));
		} finally {
			savingEdit = false;
		}
	}

	/**
	 * `occurrence` must round-trip to the exact instant the schedule produced.
	 * It arrives as a Date, and stringifying a Date with `String()` would drop
	 * milliseconds — enough to make the signup miss its occurrence entirely.
	 */
	async function toggleSignup(slotId: string, start: Date | string, taken: boolean) {
		const occurrence = new Date(start);
		const key = `${slotId}:${occurrence.getTime()}`;
		signingUp = key;

		try {
			const body = { slotId, occurrence };
			const { error } = taken
				? await api.schedule.withdraw.post(body)
				: await api.schedule.signup.post(body);
			if (error) throw error;

			toasts.success(taken ? 'Signed off' : 'Signed up');
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not update your signup'));
		} finally {
			signingUp = null;
		}
	}

	function openEditor(shift: ShiftEvent) {
		editing = shift;
		editDraft = toDraft(shift);
	}
</script>

<PageHeader title="Shifts" description="Recurring services and who has signed up for each one.">
	{#snippet actions()}
		{#if canManage}
			<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> New shift</Button>
		{/if}
	{/snippet}
</PageHeader>

<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
	<!-- Upcoming occurrences with signups -->
	<div>
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-text-muted uppercase">Upcoming</h2>

		{#if data.occurrences.length === 0}
			<EmptyState
				title="Nothing scheduled"
				description={canManage
					? 'Create a shift and its occurrences will appear here.'
					: 'No shifts are scheduled for the next month.'}
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

								{#if occurrence.slots.length > 0}
									<ul class="mt-3 space-y-2">
										{#each occurrence.slots as slot (slot.id)}
											{@const mine = slot.signups.some((s) => s.userId === data.user?.userId)}
											{@const full = slot.signups.length >= slot.capacity}
											{@const key = `${slot.id}:${new Date(occurrence.start).getTime()}`}
											<li
												class="flex flex-wrap items-center gap-2 rounded-lg bg-background-secondary px-3 py-2"
											>
												<div class="min-w-0 flex-1">
													<p class="text-sm font-medium text-text">
														{slot.name}
														<span class="ml-1 text-xs font-normal text-text-subtle">
															{slot.signups.length}/{slot.capacity}
														</span>
													</p>
													{#if slot.signups.length > 0}
														<div class="mt-1.5 flex flex-wrap items-center gap-1">
															{#each slot.signups as signup (signup.userId)}
																<span
																	class="flex items-center gap-1.5 rounded-full bg-background-muted py-0.5 pr-2 pl-0.5"
																>
																	<Avatar
																		src={signup.avatar}
																		name={signup.displayName ?? signup.username}
																		size={18}
																	/>
																	<span class="text-xs text-text-muted">
																		{signup.displayName ?? signup.username ?? signup.robloxId}
																	</span>
																</span>
															{/each}
														</div>
													{/if}
												</div>

												<Button
													size="sm"
													variant={mine ? 'secondary' : 'primary'}
													loading={signingUp === key}
													disabled={!mine && full}
													onclick={() => toggleSignup(slot.id, occurrence.start, mine)}
												>
													{mine ? 'Sign off' : full ? 'Full' : 'Sign up'}
												</Button>
											</li>
										{/each}
									</ul>
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
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-text-muted uppercase">Schedules</h2>

		{#if data.shifts.length === 0}
			<p class="rounded-xl border border-dashed border-border-base px-4 py-6 text-center text-sm text-text-muted">
				No recurring shifts defined.
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
								<div class="mt-2 flex flex-wrap gap-1.5">
									<Badge>{shift.slots.length} slots</Badge>
									{#if shift.visibility !== 'PUBLIC'}<Badge>Members only</Badge>{/if}
								</div>
							</div>
						</div>

						{#if canManage}
							<Button
								size="sm"
								variant="secondary"
								class="mt-3 w-full"
								onclick={() => openEditor(shift)}
							>
								Edit
							</Button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</aside>
</div>

<Modal bind:open={createOpen} title="New shift" size="lg">
	<ShiftEditor bind:draft={createDraft} mode="create" busy={creating} onsave={createShift} />
</Modal>

<Modal
	open={editing !== null}
	onclose={() => (editing = null)}
	title={editing ? `Edit ${editing.name}` : 'Edit shift'}
	size="lg"
>
	<ShiftEditor
		bind:draft={editDraft}
		mode="edit"
		busy={savingEdit}
		onsave={saveShift}
		ondelete={deleteShift}
	/>
</Modal>
