<script lang="ts">
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import TimingFields from './TimingFields.svelte';
	import type { HostSchedule } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	let { groupId, schedule }: { groupId: string; schedule: HostSchedule } =
		$props();
	let draft = $state<HostSchedule>(structuredClone((() => schedule)()));
	let busy = $state(false);
	async function save() {
		busy = true;
		try {
			const { error } = await api.host.schedule({ groupId }).put(draft);
			if (error) throw error;
			toasts.success(m.host_saved());
		} catch (error) {
			toasts.error(errorMessage(error, m.host_error()));
		} finally {
			busy = false;
		}
	}
</script>

<section>
	<h2 class="text-lg font-semibold text-text">{m.host_schedule_title()}</h2>
	<p class="mt-1 text-sm text-text-muted">{m.host_schedule_description()}</p>
	<form
		class="mt-6 space-y-4"
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
	>
		<div class="card space-y-4 p-5">
			<div>
				<h3 class="font-semibold text-text">{m.host_depot_reminder()}</h3>
				<p class="mt-1 text-sm text-text-muted">{m.host_depot_hint()}</p>
			</div>
			<label class="flex items-center gap-2 text-sm text-text"
				><input
					type="checkbox"
					bind:checked={draft.depotReminderEnabled}
				/>{m.host_depot_enabled()}</label
			><Field label={m.host_depot_minutes()} for="depot-minutes"
				><Input
					id="depot-minutes"
					type="number"
					min="0"
					max="1440"
					bind:value={draft.depotReminderMinutes}
				/></Field
			>
		</div>
		{#each draft.entries as item (item.id)}
			<div class="card min-w-0 space-y-4 p-5">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<h3 class="font-semibold text-text">{item.label}</h3>
					<Button
						variant="ghost"
						size="sm"
						onclick={() =>
							(draft.entries = draft.entries.filter(
								(entry) => entry.id !== item.id,
							))}>{m.host_remove()}</Button
					>
				</div>
				<Field label={m.host_label()} for="label-{item.id}"
					><Input
						id="label-{item.id}"
						bind:value={item.label}
						required
						maxlength={160}
					/></Field
				>
				<TimingFields
					bind:reference={item.reference}
					bind:offsetMinutes={item.offsetMinutes}
				/>
				<Field label={m.host_audience()}
					><Select
						bind:value={item.audience}
						options={[
							{ value: 'HOST', label: m.host_audience_host() },
							{ value: 'DISPATCH', label: m.host_audience_dispatch() },
							{ value: 'ALL', label: m.host_audience_all() },
						]}
					/></Field
				>
				<div class="flex flex-wrap gap-5">
					<label class="flex items-center gap-2 text-sm text-text"
						><input
							type="checkbox"
							bind:checked={item.optional}
						/>{m.host_optional()}</label
					>{#if ['BEGIN', 'STAFF_START', 'COMPLETE'].includes(item.action)}<label
							class="flex items-center gap-2 text-sm text-text"
							><input
								type="checkbox"
								bind:checked={item.automation}
							/>{m.host_automation()}</label
						>{/if}
				</div>
			</div>
		{/each}
		<p class="text-xs text-text-subtle">{m.host_auto_hint()}</p>
		<div class="flex flex-wrap gap-3">
			<Button
				variant="secondary"
				disabled={draft.entries.length >= 32}
				onclick={() =>
					(draft.entries = [
						...draft.entries,
						{
							id: crypto.randomUUID(),
							label: m.host_custom_label(),
							action: 'REMINDER',
							reference: 'END',
							offsetMinutes: -15,
							audience: 'ALL',
							optional: false,
							automation: false,
						},
					])}>{m.host_add_reminder()}</Button
			><Button type="submit" loading={busy}>{m.host_save()}</Button>
		</div>
	</form>
</section>
