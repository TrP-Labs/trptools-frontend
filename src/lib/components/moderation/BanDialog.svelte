<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { AdminUser } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		/** The account being acted on, or null when the dialog is closed. */
		target: AdminUser | null;
		/** Which button opened it — a suspension starts with a duration. */
		mode: 'suspend' | 'ban';
		onclose: () => void;
		ondone: () => void;
	}

	let { target, mode, onclose, ondone }: Props = $props();

	// A ban is a suspension with no expiry, so one dialog covers both and the
	// duration is the only thing that separates them.
	const durations = [
		{ value: 24, label: m.moderation_ban_dialog_1_day() },
		{ value: 72, label: m.moderation_ban_dialog_3_days() },
		{ value: 168, label: m.moderation_ban_dialog_7_days() },
		{ value: 336, label: m.moderation_ban_dialog_14_days() },
		{ value: 720, label: m.moderation_ban_dialog_30_days() },
		{ value: 0, label: m.moderation_ban_dialog_permanent() }
	];

	let reason = $state('');
	let hours = $state(168);
	let saving = $state(false);

	// Reopening for someone else must not inherit the last decision.
	$effect(() => {
		if (target) {
			reason = '';
			hours = mode === 'ban' ? 0 : 168;
		}
	});

	let name = $derived(target?.displayName ?? target?.username ?? 'this account');

	async function submit() {
		if (!target) return;

		saving = true;
		try {
			const { error } = await api.admin
				.users({ userId: target.userId })
				.ban.post({ reason, ...(hours > 0 ? { durationHours: hours } : {}) });
			if (error) throw error;

			toasts.success(hours > 0 ? `${name} suspended` : `${name} banned`);
			ondone();
			onclose();
		} catch (error) {
			toasts.error(errorMessage(error, m.moderation_ban_dialog_could_not_suspend_account()));
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	open={target !== null}
	title={mode === 'ban' ? m.moderation_ban_dialog_ban_account() : m.moderation_ban_dialog_suspend_account()}
	description={m.moderation_ban_dialog_access_stops_immediately_every_session_account()}
	size="sm"
	{onclose}
>
	<div class="space-y-4">
		<p class="text-sm text-text-muted">
			<span class="font-medium text-text">{name}</span>
			{#if target?.username}<span class="text-text-subtle"> @{target.username}</span>{/if}
		</p>

		<Field label={m.moderation_ban_dialog_duration()} hint={m.moderation_ban_dialog_permanent_ban_stays_until_administrator_lifts()}>
			<Select bind:value={hours} options={durations} />
		</Field>

		<Field label={m.moderation_ban_dialog_reason()} hint={m.moderation_ban_dialog_kept_administrators_account_never_shown()}>
			<Textarea bind:value={reason} rows={3} maxlength={500} placeholder={m.moderation_ban_dialog_what_happened()} />
		</Field>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={onclose}>{m.common_cancel()}</Button>
		<Button variant="danger" loading={saving} onclick={submit}>
			{hours > 0 ? m.moderation_ban_dialog_suspend() : m.moderation_ban_dialog_ban()}
		</Button>
	{/snippet}
</Modal>
