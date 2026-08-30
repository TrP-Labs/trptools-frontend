<script lang="ts">
	import { IconTrash } from '@tabler/icons-svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		WEEKDAY_LABELS,
		buildRule,
		describeRule,
		fromLocalInput,
		picksDays,
		type Repeat
	} from '$lib/utils/recurrence';
	import { m } from '$lib/paraglide/messages.js';

	export interface ShiftDraft {
		name: string;
		description: string;
		color: string;
		/** Local datetime string from the input. */
		startLocal: string;
		duration: number;
		repeat: Repeat;
		days: number[];
		visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
		hostLevel: number;
	}

	interface Props {
		draft: ShiftDraft;
		busy?: boolean;
		mode: 'create' | 'edit';
		/** Where to send someone to edit the sign-up sheets themselves. */
		ranksHref: string;
		onsave: () => void;
		ondelete?: () => void;
	}

	let { draft = $bindable(), busy = false, mode, ranksHref, onsave, ondelete }: Props = $props();

	const repeats = [
		{ value: 'WEEKLY' as const, label: m.shifts_shift_editor_weekly_chosen_days() },
		{ value: 'FORTNIGHTLY' as const, label: m.shifts_shift_editor_every_two_weeks_chosen_days() },
		{ value: 'DAILY' as const, label: m.shifts_shift_editor_every_day() },
		{ value: 'WEEKDAYS' as const, label: m.shifts_shift_editor_weekdays() },
		{ value: 'WEEKENDS' as const, label: m.shifts_shift_editor_weekends() },
		{ value: 'MONTHLY' as const, label: m.shifts_shift_editor_monthly() }
	];

	const visibilities = [
		{ value: 'PUBLIC' as const, label: m.common_public() },
		{ value: 'PRIVATE' as const, label: m.common_members_only() }
	];

	const hostLevels = [
		{ value: 1, label: m.shifts_shift_editor_dispatch_above() },
		{ value: 2, label: m.shifts_shift_editor_host_above() },
		{ value: 3, label: m.shifts_shift_editor_managers_only() }
	];

	let preview = $derived(
		describeRule(
			buildRule({ repeat: draft.repeat, days: draft.days }, fromLocalInput(draft.startLocal))
		)
	);

	function toggleDay(index: number) {
		draft.days = draft.days.includes(index)
			? draft.days.filter((day) => day !== index)
			: [...draft.days, index].sort((a, b) => a - b);
	}
</script>

<div class="grid gap-4 sm:grid-cols-2">
	<Field label={m.shifts_shift_editor_shift_name()} class="sm:col-span-2">
		<Input bind:value={draft.name} maxlength={100} placeholder={m.shifts_shift_editor_e_g_evening_service()} />
	</Field>

	<Field label={m.common_description()} class="sm:col-span-2">
		<Textarea
			bind:value={draft.description}
			rows={2}
			maxlength={2000}
			placeholder={m.shifts_shift_editor_what_happens_shift()}
		/>
	</Field>

	<Field label={m.shifts_shift_editor_first_occurrence()} hint={m.shifts_shift_editor_shown_local_time()}>
		<Input type="datetime-local" bind:value={draft.startLocal} />
	</Field>

	<Field label={m.shifts_shift_editor_length_minutes()}>
		<Input type="number" min="5" max="1440" step="5" bind:value={draft.duration} />
	</Field>

	<Field label={m.shifts_shift_editor_repeats()}>
		<Select bind:value={draft.repeat} options={repeats} />
	</Field>

	<Field label={m.common_colour()}>
		<ColorInput bind:value={draft.color} />
	</Field>

	{#if picksDays(draft.repeat)}
		<Field
			label={m.shifts_shift_editor_days()}
			hint={draft.repeat === 'FORTNIGHTLY'
				? m.shifts_shift_editor_counted_from_first_occurrence_then_every()
				: undefined}
			class="sm:col-span-2"
		>
			<div class="flex flex-wrap gap-1.5">
				{#each WEEKDAY_LABELS as label, index (label)}
					{@const active = draft.days.includes(index)}
					<button
						type="button"
						onclick={() => toggleDay(index)}
						aria-pressed={active}
						class="w-12 rounded-lg border py-1.5 text-xs font-medium transition-colors
							{active
							? 'border-accent bg-accent/15 text-accent'
							: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</Field>
	{/if}

	<p class="rounded-lg bg-background-secondary px-3 py-2 text-sm text-text-muted sm:col-span-2">
		{m.shifts_shift_editor_repeats()} <span class="font-medium text-text">{preview}</span>
	</p>

	<Field label={m.common_visibility()}>
		<Select bind:value={draft.visibility} options={visibilities} />
	</Field>

	<Field label={m.shifts_shift_editor_who_can_host()} hint={m.shifts_shift_editor_opening_dispatch_room_requires_level()}>
		<Select bind:value={draft.hostLevel} options={hostLevels} />
	</Field>

	<p class="rounded-lg border border-dashed border-border-base px-3 py-3 text-sm text-text-muted sm:col-span-2">
		{m.shifts_shift_editor_sign_up_sheets_are_set_per()}
		<a href={ranksHref} class="text-accent hover:underline">{m.common_ranks()}</a> {m.shifts_shift_editor_page()}
	</p>

	<div class="flex flex-wrap gap-2 sm:col-span-2">
		<Button onclick={onsave} loading={busy} disabled={!draft.name.trim()}>
			{mode === 'create' ? m.shifts_shift_editor_create_shift() : m.common_save_changes()}
		</Button>

		{#if mode === 'edit' && ondelete}
			<Button variant="danger" onclick={ondelete} disabled={busy}>
				<IconTrash size={16} /> {m.common_delete()}
			</Button>
		{/if}
	</div>
</div>
