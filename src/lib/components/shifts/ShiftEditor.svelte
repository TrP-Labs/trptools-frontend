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
		{ value: 'WEEKLY' as const, label: 'Weekly on chosen days' },
		{ value: 'FORTNIGHTLY' as const, label: 'Every two weeks on chosen days' },
		{ value: 'DAILY' as const, label: 'Every day' },
		{ value: 'WEEKDAYS' as const, label: 'Weekdays' },
		{ value: 'WEEKENDS' as const, label: 'Weekends' },
		{ value: 'MONTHLY' as const, label: 'Monthly' }
	];

	const visibilities = [
		{ value: 'PUBLIC' as const, label: 'Public' },
		{ value: 'PRIVATE' as const, label: 'Members only' }
	];

	const hostLevels = [
		{ value: 1, label: 'Dispatch and above' },
		{ value: 2, label: 'Host and above' },
		{ value: 3, label: 'Managers only' }
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
	<Field label="Shift name" class="sm:col-span-2">
		<Input bind:value={draft.name} maxlength={100} placeholder="e.g. Evening Service" />
	</Field>

	<Field label="Description" class="sm:col-span-2">
		<Textarea
			bind:value={draft.description}
			rows={2}
			maxlength={2000}
			placeholder="What happens on this shift."
		/>
	</Field>

	<Field label="First occurrence" hint="Shown in your local time.">
		<Input type="datetime-local" bind:value={draft.startLocal} />
	</Field>

	<Field label="Length (minutes)">
		<Input type="number" min="5" max="1440" step="5" bind:value={draft.duration} />
	</Field>

	<Field label="Repeats">
		<Select bind:value={draft.repeat} options={repeats} />
	</Field>

	<Field label="Colour">
		<ColorInput bind:value={draft.color} />
	</Field>

	{#if picksDays(draft.repeat)}
		<Field
			label="Days"
			hint={draft.repeat === 'FORTNIGHTLY'
				? 'Counted from the first occurrence, then every second week.'
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
		Repeats <span class="font-medium text-text">{preview}</span>
	</p>

	<Field label="Visibility">
		<Select bind:value={draft.visibility} options={visibilities} />
	</Field>

	<Field label="Who can host" hint="Opening a dispatch room requires this level.">
		<Select bind:value={draft.hostLevel} options={hostLevels} />
	</Field>

	<p class="rounded-lg border border-dashed border-border-base px-3 py-3 text-sm text-text-muted sm:col-span-2">
		Sign-up sheets are set per rank, not per shift, so every shift shares them. Edit them on the
		<a href={ranksHref} class="text-accent hover:underline">Ranks</a> page.
	</p>

	<div class="flex flex-wrap gap-2 sm:col-span-2">
		<Button onclick={onsave} loading={busy} disabled={!draft.name.trim()}>
			{mode === 'create' ? 'Create shift' : 'Save changes'}
		</Button>

		{#if mode === 'edit' && ondelete}
			<Button variant="danger" onclick={ondelete} disabled={busy}>
				<IconTrash size={16} /> Delete
			</Button>
		{/if}
	</div>
</div>
