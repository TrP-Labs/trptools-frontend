<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import {
		ACTIONS,
		COLORS,
		LIGHTS,
		OTHER_ACTIONS,
		formatTimecode,
		type MarkerKind,
		type ProgramEntry
	} from './program';

	interface Props {
		open: boolean;
		time: number;
		onadd: (entry: ProgramEntry) => void;
		onclose: () => void;
	}

	let { open = $bindable(false), time, onadd, onclose }: Props = $props();

	let kind = $state<MarkerKind>('lights');
	let lightState = $state<'Enable' | 'Disable'>('Enable');
	let color = $state(COLORS[0]!);
	let action = $state(ACTIONS[0]!);
	let other = $state(OTHER_ACTIONS[0]!);
	let targets = $state<string[]>([]);

	const kinds: Array<{ value: MarkerKind; label: string; hint: string }> = [
		{ value: 'lights', label: 'Lights', hint: 'Turn fixtures on or off' },
		{ value: 'colors', label: 'Colour', hint: 'Recolour fixtures' },
		{ value: 'action', label: 'Action', hint: 'Flashes and throws' },
		{ value: 'other', label: 'Other', hint: 'Tracking and background' }
	];

	let needsTargets = $derived(kind === 'lights' || kind === 'colors');
	let canSubmit = $derived(!needsTargets || targets.length > 0);

	function toggleTarget(light: string) {
		targets = targets.includes(light)
			? targets.filter((value) => value !== light)
			: [...targets, light];
	}

	function reset() {
		kind = 'lights';
		lightState = 'Enable';
		color = COLORS[0]!;
		action = ACTIONS[0]!;
		other = OTHER_ACTIONS[0]!;
		targets = [];
	}

	function submit() {
		let entry: ProgramEntry;

		switch (kind) {
			case 'lights':
				entry = [time, lightState, [...targets]];
				break;
			case 'colors':
				entry = [time, `Color ${color}`, [...targets]];
				break;
			case 'action':
				entry = [time, action];
				break;
			case 'other':
				entry = [time, other];
				break;
		}

		onadd(entry);
		reset();
		open = false;
	}
</script>

<Modal
	bind:open
	onclose={() => {
		reset();
		onclose();
	}}
	title="Add marker at {formatTimecode(time)}"
	description="Markers fire in order as the track plays."
>
	<div class="space-y-4">
		<Field label="Marker type">
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{#each kinds as option (option.value)}
					<button
						type="button"
						onclick={() => {
							kind = option.value;
							targets = [];
						}}
						aria-pressed={kind === option.value}
						class="rounded-lg border px-3 py-2 text-left transition-colors
							{kind === option.value
							? 'border-accent bg-accent/15'
							: 'border-border-base bg-background-secondary hover:border-border-strong'}"
					>
						<span class="block text-sm font-medium text-text">{option.label}</span>
						<span class="block text-xs text-text-subtle">{option.hint}</span>
					</button>
				{/each}
			</div>
		</Field>

		{#if kind === 'lights'}
			<Field label="Action">
				<div class="flex gap-2">
					{#each ['Enable', 'Disable'] as const as value (value)}
						<button
							type="button"
							onclick={() => (lightState = value)}
							aria-pressed={lightState === value}
							class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors
								{lightState === value
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
						>
							{value}
						</button>
					{/each}
				</div>
			</Field>
		{:else if kind === 'colors'}
			<Field label="Colour">
				<div class="flex flex-wrap gap-1.5">
					{#each COLORS as option (option)}
						<button
							type="button"
							onclick={() => (color = option)}
							aria-pressed={color === option}
							class="rounded-lg border px-2.5 py-1.5 text-xs transition-colors
								{color === option
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
						>
							{option}
						</button>
					{/each}
				</div>
			</Field>
		{:else if kind === 'action'}
			<Field label="Action">
				<div class="flex flex-wrap gap-1.5">
					{#each ACTIONS as option (option)}
						<button
							type="button"
							onclick={() => (action = option)}
							aria-pressed={action === option}
							class="rounded-lg border px-2.5 py-1.5 text-xs transition-colors
								{action === option
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
						>
							{option}
						</button>
					{/each}
				</div>
			</Field>
		{:else}
			<Field label="Action">
				<div class="flex flex-wrap gap-1.5">
					{#each OTHER_ACTIONS as option (option)}
						<button
							type="button"
							onclick={() => (other = option)}
							aria-pressed={other === option}
							class="rounded-lg border px-2.5 py-1.5 text-xs transition-colors
								{other === option
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
						>
							{option}
						</button>
					{/each}
				</div>
			</Field>
		{/if}

		{#if needsTargets}
			<Field label="Fixtures" hint="Pick at least one.">
				<div class="flex flex-wrap gap-1.5">
					{#each LIGHTS as light (light)}
						{@const active = targets.includes(light)}
						<button
							type="button"
							onclick={() => toggleTarget(light)}
							aria-pressed={active}
							class="rounded-lg border px-2.5 py-1.5 text-xs transition-colors
								{active
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
						>
							{light}
						</button>
					{/each}
				</div>
			</Field>
		{/if}
	</div>

	{#snippet footer()}
		<Button
			variant="secondary"
			onclick={() => {
				reset();
				open = false;
				onclose();
			}}
		>
			Cancel
		</Button>
		<Button onclick={submit} disabled={!canSubmit}>Add marker</Button>
	{/snippet}
</Modal>
