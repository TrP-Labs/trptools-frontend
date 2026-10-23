<script lang="ts">
	/**
	 * A rank's attendance rules, saved as one form.
	 *
	 * Three questions, in the order a manager answers them: how much is
	 * enough (the monthly bounds, and how much of a shift counts as being
	 * there), where somebody goes past either bound, and what each shift is
	 * worth. The last is the long one — every slot the rank can sign up for —
	 * so each sheet folds away under its own heading.
	 */
	import { untrack } from 'svelte';
	import { IconChevronDown } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { refreshData } from '$lib/utils/refresh';
	import type { AttendanceSettings } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	let { settings }: { settings: AttendanceSettings } = $props();

	function draftFrom(source: AttendanceSettings) {
		return {
			// A blank box is how "no bound" is typed, so null is held as ''.
			minPoints: (source.minPoints ?? '') as number | string,
			maxPoints: (source.maxPoints ?? '') as number | string,
			requiredPercent: source.requiredPercent as number | string,
			unsignedPoints: source.unsignedPoints as number | string,
			noShowPoints: source.noShowPoints as number | string,
			promotionRankId: source.promotionRankId ?? '',
			demotionRankId: source.demotionRankId ?? '',
			slots: Object.fromEntries(source.slots.map((slot) => [slot.slotId, slot.points])) as Record<string, number | string>
		};
	}

	// Initialised at component init as well as in the effect, so SSR paints
	// a filled form rather than an empty one (trap 18).
	let draft = $state(untrack(() => draftFrom(settings)));
	let saved = $state(untrack(() => JSON.stringify(draftFrom(settings))));
	$effect(() => {
		const next = draftFrom(settings);
		untrack(() => {
			draft = next;
			saved = JSON.stringify(next);
		});
	});
	let dirty = $derived(JSON.stringify(draft) !== saved);
	let busy = $state(false);

	let sheets = $derived.by(() => {
		const grouped = new Map<string, { name: string; color: string; slots: AttendanceSettings['slots'] }>();
		for (const slot of settings.slots) {
			const sheet = grouped.get(slot.sheetId) ?? { name: slot.sheetName, color: slot.sheetColor, slots: [] };
			sheet.slots.push(slot);
			grouped.set(slot.sheetId, sheet);
		}
		return [...grouped.entries()];
	});

	let rankOptions = $derived([
		{ value: '', label: m.attendance_path_none() },
		...settings.ranks.map((rank) => ({ value: rank.id, label: `${rank.name} (${rank.rank})` }))
	]);

	/** A blank box is "no bound", which is not the same as zero. */
	function bound(value: unknown): number | null {
		if (value === null || value === undefined || value === '') return null;
		const number = Number(value);
		return Number.isFinite(number) ? Math.max(0, number) : null;
	}

	async function save() {
		busy = true;
		try {
			const { error } = await api.attendance.ranks({ rankId: settings.rankId }).put({
				minPoints: bound(draft.minPoints),
				maxPoints: bound(draft.maxPoints),
				requiredPercent: Math.min(100, Math.max(0, Math.round(Number(draft.requiredPercent) || 0))),
				unsignedPoints: Math.max(0, Number(draft.unsignedPoints) || 0),
				noShowPoints: Math.max(0, Number(draft.noShowPoints) || 0),
				promotionRankId: draft.promotionRankId || null,
				demotionRankId: draft.demotionRankId || null,
				slots: Object.entries(draft.slots).map(([slotId, points]) => ({ slotId, points: Math.max(0, Number(points) || 0) }))
			});
			if (error) throw error;
			toasts.success(m.attendance_saved());
		} catch (error) {
			toasts.error(errorMessage(error, m.attendance_save_error()));
			return;
		} finally {
			busy = false;
		}
		await refreshData();
	}

	let warning = $derived(
		bound(draft.minPoints) !== null && bound(draft.maxPoints) !== null && bound(draft.minPoints)! > bound(draft.maxPoints)!
	);
</script>

<form
	class="space-y-6"
	onsubmit={(event) => {
		event.preventDefault();
		void save();
	}}
>
	<Card title={m.attendance_bounds_title()} description={m.attendance_bounds_hint()}>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label={m.attendance_min()} hint={m.attendance_bound_hint()} for="attendance-min">
				<Input id="attendance-min" type="number" min="0" step="any" placeholder={m.attendance_off()} bind:value={draft.minPoints} />
			</Field>
			<Field label={m.attendance_max()} hint={m.attendance_bound_hint()} for="attendance-max">
				<Input id="attendance-max" type="number" min="0" step="any" placeholder={m.attendance_off()} bind:value={draft.maxPoints} />
			</Field>
			<Field label={m.attendance_required()} hint={m.attendance_required_hint()} for="attendance-required">
				<div class="flex items-center gap-3">
					<input
						type="range"
						min="0"
						max="100"
						step="5"
						class="min-w-0 flex-1 accent-[var(--color-accent)]"
						aria-label={m.attendance_required()}
						bind:value={draft.requiredPercent}
					/>
					<div class="w-20 shrink-0">
						<Input id="attendance-required" type="number" min="0" max="100" bind:value={draft.requiredPercent} />
					</div>
					<span class="text-sm text-text-muted">%</span>
				</div>
			</Field>
			<Field label={m.attendance_unsigned()} hint={m.attendance_unsigned_hint()} for="attendance-unsigned">
				<Input id="attendance-unsigned" type="number" min="0" step="any" bind:value={draft.unsignedPoints} />
			</Field>
			<Field label={m.attendance_no_show()} hint={m.attendance_no_show_hint()} for="attendance-no-show">
				<Input id="attendance-no-show" type="number" min="0" step="any" bind:value={draft.noShowPoints} />
			</Field>
		</div>
		{#if warning}<p class="mt-3 text-sm text-warning">{m.attendance_bounds_crossed()}</p>{/if}
	</Card>

	<Card title={m.attendance_paths_title()} description={m.attendance_paths_hint()}>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label={m.attendance_promotion_path()} hint={m.attendance_promotion_hint()}>
				<Select bind:value={draft.promotionRankId} options={rankOptions} />
			</Field>
			<Field label={m.attendance_demotion_path()} hint={m.attendance_demotion_hint()}>
				<Select bind:value={draft.demotionRankId} options={rankOptions} />
			</Field>
		</div>
	</Card>

	<Card title={m.attendance_slots_title()} description={m.attendance_slots_hint()}>
		{#if sheets.length === 0}
			<p class="text-sm text-text-muted">{m.attendance_slots_none()}</p>
		{:else}
			<div class="space-y-3">
				{#each sheets as [sheetId, sheet] (sheetId)}
					<details class="group rounded-lg border border-border-base" open={sheets.length === 1}>
						<summary class="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
							<span class="h-6 w-1 shrink-0 rounded-full" style="background: {sheet.color}"></span>
							<span class="min-w-0 flex-1 font-medium wrap-anywhere text-text">{sheet.name}</span>
							<span class="text-xs text-text-muted">{m.attendance_slot_count({ count: sheet.slots.length })}</span>
							<IconChevronDown size={16} class="shrink-0 text-text-subtle transition-transform group-open:rotate-180" />
						</summary>
						<ul class="divide-y divide-border-base border-t border-border-base">
							{#each sheet.slots as slot (slot.slotId)}
								<li class="flex items-center gap-3 px-4 py-2.5">
									<label for="slot-{slot.slotId}" class="min-w-0 flex-1 text-sm wrap-anywhere text-text">{slot.name}</label>
									<div class="w-24 shrink-0">
										<Input id="slot-{slot.slotId}" type="number" min="0" step="any" bind:value={draft.slots[slot.slotId]} />
									</div>
									<span class="w-12 text-xs text-text-muted">{m.attendance_points_unit()}</span>
								</li>
							{/each}
						</ul>
					</details>
				{/each}
			</div>
		{/if}
	</Card>

	<div class="flex items-center gap-3">
		<Button type="submit" loading={busy} disabled={!dirty}>{m.common_save_changes()}</Button>
		{#if dirty}<span class="text-sm text-text-muted">{m.attendance_unsaved()}</span>{/if}
	</div>
</form>
