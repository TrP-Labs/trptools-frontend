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

	/**
	 * The reason travels to the API — and from there to a moderator's queue —
	 * as the English `value`, never as the translated `label`. A German
	 * reporter and an English one must file the same thing, or a queue read by
	 * one person becomes a queue in six languages.
	 */
	const REASONS = [
		{ value: 'Sexual or explicit content', label: m.moderation_report_dialog_reason_sexual_content },
		{ value: 'Hate or harassment', label: m.moderation_report_dialog_reason_hate_or_harassment },
		{ value: 'Violence or threats', label: m.moderation_report_dialog_reason_violence_or_threats },
		{ value: 'Spam or advertising', label: m.moderation_report_dialog_reason_spam_or_advertising },
		{ value: 'Impersonation', label: m.moderation_report_dialog_reason_impersonation },
		{ value: 'Other', label: m.moderation_report_dialog_reason_other }
	];

	let reason = $state(REASONS[0]!.value);
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
					? m.moderation_report_dialog_reported_hidden()
					: m.moderation_report_dialog_reported_already_cleared()
			);

			details = '';
			reason = REASONS[0]!.value;
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
	title={m.moderation_report_target({ target: target?.label ?? m.moderation_content() })}
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
					{#each REASONS as option (option.value)}
						<button
							type="button"
							onclick={() => (reason = option.value)}
							aria-pressed={reason === option.value}
							class="rounded-lg border px-2.5 py-1.5 text-xs transition-colors
								{reason === option.value
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
						>
							{option.label()}
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
