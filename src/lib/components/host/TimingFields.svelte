<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import { m } from '$lib/paraglide/messages.js';
	let {
		reference = $bindable<'START' | 'END'>('START'),
		offsetMinutes = $bindable(0),
	} = $props();
	let unit = $state(1);
	let direction = $state(-1);
	$effect(() => {
		if (offsetMinutes !== 0) direction = offsetMinutes < 0 ? -1 : 1;
	});
	let amount = $derived(Math.round((Math.abs(offsetMinutes) / unit) * 100) / 100);

	// `step` is "any" because a step of a sixtieth of an hour leaves 1.5
	// hours "off step", and a browser refuses to submit a form holding one
	// without saying so — the schedule editor's Save looked dead (trap 30).
	// The API takes whole minutes within a day either side, so the value is
	// rounded and clamped here rather than refused there as a bad request.
	function toOffset(raw: string) {
		const minutes = Math.min(1440, Math.round(Math.abs(Number(raw) || 0) * unit));
		return minutes * direction;
	}
</script>

<div class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
	<Field label={m.host_reference()}
		><Select
			bind:value={reference}
			options={[
				{ value: 'START', label: m.host_start() },
				{ value: 'END', label: m.host_end() },
			]}
		/></Field
	>
	<Field label={m.host_direction()}
		><Select
			value={direction}
			onchange={(v) => {
				direction = v;
				offsetMinutes = Math.abs(offsetMinutes) * v;
			}}
			options={[
				{ value: -1, label: m.host_before() },
				{ value: 1, label: m.host_after() },
			]}
		/></Field
	>
	<Field label={m.host_amount()}
		><Input
			type="number"
			min="0"
			max={1440 / unit}
			step="any"
			value={amount}
			oninput={(e) => (offsetMinutes = toOffset(e.currentTarget.value))}
		/></Field
	>
	<Field label={m.host_unit()}
		><Select
			bind:value={unit}
			options={[
				{ value: 1, label: m.host_minutes() },
				{ value: 60, label: m.host_hours() },
			]}
		/></Field
	>
</div>
