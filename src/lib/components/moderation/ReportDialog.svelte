<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { api, errorMessage, loginUrl } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { reportDialog } from '$lib/stores/report.svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		signedIn: boolean;
	}

	let { signedIn }: Props = $props();

	const REASONS = [
		'Sexual or explicit content',
		'Hate or harassment',
		'Violence or threats',
		'Spam or advertising',
		'Impersonation',
		'Other'
	];

	let reason = $state(REASONS[0]!);
	let details = $state('');
	let sending = $state(false);

	let target = $derived(reportDialog.target);

	async function submit() {
		if (!target) return;

		sending = true;
		try {
			const { data, error } = await api.reports.post({
				targetType: target.targetType,
				targetId: target.targetId,
				reason,
				details
			});
			if (!data) throw error;

			toasts.success(
				data.hidden
					? 'Reported. It has been hidden while a moderator reviews it.'
					: 'Reported. A moderator has already cleared this, so it stays up while we look again.'
			);

			details = '';
			reason = REASONS[0]!;
			reportDialog.close();
		} catch (error) {
			toasts.error(errorMessage(error, m.moderation_report_dialog_could_not_send_report()));
		} finally {
			sending = false;
		}
	}
</script>

<Modal
	open={target !== null}
	onclose={() => reportDialog.close()}
	title="Report {target?.label ?? 'content'}"
	description={m.moderation_report_dialog_reports_are_reviewed_by_trp_tools()}
>
	{#if !signedIn}
		<p class="text-sm text-text-muted">
			{m.moderation_report_dialog_need_signed_report_content_so_we()}
		</p>
	{:else}
		<div class="space-y-4">
			<Field label={m.moderation_report_dialog_reason()}>
				<div class="flex flex-wrap gap-1.5">
					{#each REASONS as option (option)}
						<button
							type="button"
							onclick={() => (reason = option)}
							aria-pressed={reason === option}
							class="rounded-lg border px-2.5 py-1.5 text-xs transition-colors
								{reason === option
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
						>
							{option}
						</button>
					{/each}
				</div>
			</Field>

			<Field label={m.moderation_report_dialog_anything_else()} hint={m.moderation_report_dialog_optional_but_helps()}>
				<Textarea bind:value={details} rows={3} maxlength={1000} />
			</Field>

			<p class="text-xs text-text-subtle">
				{m.moderation_report_dialog_reported_content_hidden_straight_away_unless()}
			</p>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="secondary" onclick={() => reportDialog.close()}>{m.common_cancel()}</Button>
		{#if signedIn}
			<Button variant="danger" onclick={submit} loading={sending}>{m.moderation_report_dialog_send_report()}</Button>
		{:else}
			<Button href={loginUrl()} data-sveltekit-reload>{m.moderation_report_dialog_sign()}</Button>
		{/if}
	{/snippet}
</Modal>
