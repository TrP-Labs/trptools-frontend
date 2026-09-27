<script lang="ts">
 import Select from '$lib/components/ui/Select.svelte';
 import Input from '$lib/components/ui/Input.svelte';
 import Field from '$lib/components/ui/Field.svelte';
 import { m } from '$lib/paraglide/messages.js';
 let { reference = $bindable<'START' | 'END'>('START'), offsetMinutes = $bindable(0) } = $props();
 let unit = $state(1);
 let direction = $derived(offsetMinutes < 0 ? -1 : 1);
 let amount = $derived(Math.abs(offsetMinutes) / unit);
</script>
<div class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
 <Field label={m.host_reference()}><Select bind:value={reference} options={[{value:'START',label:m.host_start()},{value:'END',label:m.host_end()}]} /></Field>
 <Field label={m.host_direction()}><Select value={direction} onchange={(v) => offsetMinutes = Math.abs(offsetMinutes) * v} options={[{value:-1,label:m.host_before()},{value:1,label:m.host_after()}]} /></Field>
 <Field label={m.host_amount()}><Input type="number" min="0" max={1440 / unit} step={unit === 60 ? '0.0166666667' : '1'} value={amount} oninput={(e) => offsetMinutes = Math.round(Number(e.currentTarget.value) * unit) * direction} /></Field>
 <Field label={m.host_unit()}><Select bind:value={unit} options={[{value:1,label:m.host_minutes()},{value:60,label:m.host_hours()}]} /></Field>
</div>
