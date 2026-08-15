<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { AdminUser } from '$lib/api/types';

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
		{ value: 24, label: '1 day' },
		{ value: 72, label: '3 days' },
		{ value: 168, label: '7 days' },
		{ value: 336, label: '14 days' },
		{ value: 720, label: '30 days' },
		{ value: 0, label: 'Permanent' }
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
			toasts.error(errorMessage(error, 'Could not suspend that account'));
		} finally {
			saving = false;
		}
	}
</script>

<Modal
	open={target !== null}
	title={mode === 'ban' ? 'Ban an account' : 'Suspend an account'}
	description="Access stops immediately and every session the account holds is ended."
	size="sm"
	{onclose}
>
	<div class="space-y-4">
		<p class="text-sm text-text-muted">
			<span class="font-medium text-text">{name}</span>
			{#if target?.username}<span class="text-text-subtle"> @{target.username}</span>{/if}
		</p>

		<Field label="Duration" hint="A permanent ban stays until an administrator lifts it.">
			<Select bind:value={hours} options={durations} />
		</Field>

		<Field label="Reason" hint="Kept for administrators. The account is never shown it.">
			<Textarea bind:value={reason} rows={3} maxlength={500} placeholder="What happened" />
		</Field>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={onclose}>Cancel</Button>
		<Button variant="danger" loading={saving} onclick={submit}>
			{hours > 0 ? 'Suspend' : 'Ban'}
		</Button>
	{/snippet}
</Modal>
