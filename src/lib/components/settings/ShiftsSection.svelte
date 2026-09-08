<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { m } from '$lib/paraglide/messages.js';

	/** How early rooms open and how early people may put their name down. */
	interface Props {
		group: { id: string; roomOpenLeadMinutes: number; signupLeadMinutes: number };
	}

	let { group }: Props = $props();

	let form = $state(seed());

	function seed() {
		return {
			roomOpenLeadMinutes: group.roomOpenLeadMinutes,
			signupLeadMinutes: group.signupLeadMinutes
		};
	}

	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			const { error } = await api.groups({ groupId: group.id }).patch({
				roomOpenLeadMinutes: Number(form.roomOpenLeadMinutes) || 0,
				signupLeadMinutes: Number(form.signupLeadMinutes) || 0
			});
			if (error) throw error;

			toasts.success(m.dashboard_settings_settings_saved());
			await refreshData();
			form = seed();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_settings_could_not_save_those_settings()));
		} finally {
			saving = false;
		}
	}
</script>

<Card title={m.common_shifts()} description={m.dashboard_settings_how_dispatch_rooms_staff_sign_ups()}>
	<div class="space-y-4">
		<Field
			label={m.dashboard_settings_open_rooms_many_minutes_early()}
			hint={m.dashboard_settings_dispatch_page_counts_down_next_shift()}
		>
			<div class="flex items-center gap-3">
				<Input
					type="number"
					min="0"
					max="120"
					bind:value={form.roomOpenLeadMinutes}
					class="max-w-32"
				/>
				<span class="text-sm text-text-muted">{m.dashboard_settings_minutes()}</span>
			</div>
		</Field>

		<Field
			label={m.dashboard_settings_open_sign_ups_many_minutes_early()}
			hint={m.dashboard_settings_staff_sign_up_sheets_appear_shift()}
		>
			<div class="flex items-center gap-3">
				<Input
					type="number"
					min="0"
					max="43200"
					step="60"
					bind:value={form.signupLeadMinutes}
					class="max-w-32"
				/>
				<span class="text-sm text-text-muted">{m.dashboard_settings_minutes()}</span>
			</div>
		</Field>
	</div>

	{#snippet actions()}
		<Button onclick={save} loading={saving}>{m.common_save()}</Button>
	{/snippet}
</Card>
