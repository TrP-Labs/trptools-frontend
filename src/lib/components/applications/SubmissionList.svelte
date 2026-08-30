<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconCheck,
		IconChevronDown,
		IconExternalLink,
		IconInbox,
		IconLockOpen,
		IconTrash,
		IconWorld,
		IconX
	} from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import MenuItem from '$lib/components/ui/MenuItem.svelte';
	import UserChip from '$lib/components/users/UserChip.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatDateTime, formatRelative } from '$lib/utils/format';
	import {
		applicationStatusLabel,
		type ApplicationSubmission,
		type ApplicationSubmissionDetail
	} from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * A queue of submitted applications, and the decision on each.
	 *
	 * Answers are fetched when a row is opened rather than with the list: most
	 * of a review is reading one application at a time, and a group with fifty
	 * waiting would otherwise ship fifty essays to draw a list of names.
	 */
	interface Props {
		submissions: ApplicationSubmission[];
		/** False for the archive, where the decision has already been made. */
		reviewable?: boolean;
		/** The archive also offers to undo or destroy what a decision left behind. */
		manageRecords?: boolean;
		emptyTitle: string;
		emptyDescription: string;
	}

	let {
		submissions,
		reviewable = false,
		manageRecords = false,
		emptyTitle,
		emptyDescription
	}: Props = $props();

	let openId = $state<string | null>(null);
	let detail = $state<ApplicationSubmissionDetail | null>(null);
	let loading = $state(false);
	let busy = $state(false);
	let note = $state('');

	async function toggle(submissionId: string) {
		if (openId === submissionId) {
			openId = null;
			detail = null;
			return;
		}

		openId = submissionId;
		detail = null;
		note = '';
		loading = true;

		try {
			const { data, error } = await api.applications.submissions({ submissionId }).get();
			if (error) throw error;
			// A slower request for a row somebody has already moved on from
			// must not paint itself over the one they are reading now.
			if (openId === submissionId) detail = data;
		} catch (error) {
			toasts.error(errorMessage(error, m.applications_submission_list_could_not_read_application()));
		} finally {
			loading = false;
		}
	}

	/**
	 * Lifts the lock-out a decision put on somebody, keeping the record of it.
	 *
	 * Deliberately separate from deleting: a group letting somebody apply again
	 * usually still wants to remember why they could not.
	 */
	async function clearRecord(submissionId: string) {
		busy = true;
		try {
			const { error } = await api.applications.submissions({ submissionId }).clear.post();
			if (error) throw error;

			toasts.success(m.applications_submission_list_record_cleared_they_can_apply_again());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.applications_submission_list_could_not_clear_record()));
		} finally {
			busy = false;
		}
	}

	async function deleteRecord(submissionId: string, name: string) {
		if (!confirm(m.applications_submission_list_delete_confirm({ name }))) return;

		busy = true;
		try {
			const { error } = await api.applications.submissions({ submissionId }).delete();
			if (error) throw error;

			toasts.success(m.applications_submission_list_application_deleted());
			if (openId === submissionId) {
				openId = null;
				detail = null;
			}
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.applications_submission_list_could_not_delete_application()));
		} finally {
			busy = false;
		}
	}

	async function review(submissionId: string, decision: 'APPROVE' | 'DENY') {
		busy = true;
		try {
			const { error } = await api.applications
				.submissions({ submissionId })
				.review.post({ decision, note });
			if (error) throw error;

			toasts.success(decision === 'APPROVE' ? 'Application approved' : 'Application denied');
			openId = null;
			detail = null;
			note = '';
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.applications_submission_list_could_not_record_decision()));
		} finally {
			busy = false;
		}
	}
</script>

{#if submissions.length === 0}
	<EmptyState title={emptyTitle} description={emptyDescription}>
		{#snippet icon()}<IconInbox size={28} stroke={1.5} />{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-3">
		{#each submissions as submission (submission.id)}
			{@const open = openId === submission.id}
			<li class="card relative">
				<button
					type="button"
					onclick={() => toggle(submission.id)}
					aria-expanded={open}
					class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-background-secondary/60
						{manageRecords ? 'pr-16' : ''}"
				>
					<UserChip
						displayName={submission.applicant.displayName}
						username={submission.applicant.username}
						avatar={submission.applicant.avatar}
						subtitle={formatRelative(submission.submittedAt)}
						size={36}
						class="min-w-0 flex-1"
					/>

					{#if submission.status !== 'PENDING'}
						<Badge tone={submission.status === 'APPROVED' ? 'success' : 'danger'}>
							{applicationStatusLabel(submission.status)}
						</Badge>
					{/if}

					{#if submission.clearedAt}
						<Badge>{m.applications_submission_list_cleared()}</Badge>
					{/if}

					<IconChevronDown
						size={18}
						class="shrink-0 text-text-muted transition-transform {open ? 'rotate-180' : ''}"
					/>
				</button>

				{#if manageRecords}
					<!--
						Outside the row's own button: a menu nested inside one
						would make every press of it toggle the row as well.
					-->
					<div class="absolute top-4 right-4">
						<OverflowMenu label={m.applications_submission_list_record_actions()}>
							{#snippet children(close)}
								<MenuItem
									disabled={busy || Boolean(submission.clearedAt)}
									title={submission.clearedAt
										? m.applications_submission_list_record_has_already_been_cleared()
										: undefined}
									onclick={() => {
										close();
										clearRecord(submission.id);
									}}
								>
									<IconLockOpen size={15} />
									{submission.clearedAt ? m.applications_submission_list_record_cleared() : m.applications_submission_list_clear_record()}
								</MenuItem>

								<MenuItem
									tone="danger"
									disabled={busy}
									onclick={() => {
										close();
										deleteRecord(
											submission.id,
											submission.applicant.displayName ??
												submission.applicant.username ??
												'this applicant'
										);
									}}
								>
									<IconTrash size={15} /> {m.applications_submission_list_delete_record()}
								</MenuItem>
							{/snippet}
						</OverflowMenu>
					</div>
				{/if}

				{#if open}
					<div class="space-y-5 border-t border-border-base p-4">
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-subtle">
							<span>Sent {formatDateTime(submission.submittedAt)}</span>
							<!-- Sent with the form: when they are actually around, and in what language. -->
							<span class="inline-flex items-center gap-1">
								<IconWorld size={12} />
								{submission.timezone} · {submission.locale}
							</span>
							<a
								href="/users/{submission.applicant.userId}"
								class="inline-flex items-center gap-1 transition-colors hover:text-text"
							>
								{m.applications_submission_list_view_profile()} <IconExternalLink size={12} />
							</a>
						</div>

						{#if loading}
							<div class="flex justify-center py-6"><Spinner /></div>
						{:else if detail}
							<dl class="space-y-4">
								{#each detail.answers as answer (answer.order)}
									<div>
										<dt class="text-xs font-semibold tracking-wide text-text-muted uppercase">
											{answer.prompt}
										</dt>
										<dd class="mt-1 text-sm whitespace-pre-line text-text">
											{#if answer.choices.length > 0}
												<span class="flex flex-wrap gap-1.5">
													{#each answer.choices as choice (choice)}
														<Badge tone="accent">{choice}</Badge>
													{/each}
												</span>
											{:else if answer.value}
												{answer.value}
											{:else}
												<span class="text-text-subtle">{m.applications_submission_list_no_answer()}</span>
											{/if}
										</dd>
									</div>
								{:else}
									<p class="text-sm text-text-muted">{m.applications_submission_list_form_asked_nothing_at_time()}</p>
								{/each}
							</dl>

							{#if reviewable && submission.status === 'PENDING'}
								<div class="space-y-3 border-t border-border-base pt-4">
									<Textarea
										bind:value={note}
										rows={2}
										maxlength={1000}
										placeholder={m.applications_submission_list_note_records_applicant_read_optional()}
									/>

									<div class="flex flex-wrap justify-end gap-2">
										<Button
											size="sm"
											variant="danger"
											loading={busy}
											onclick={() => review(submission.id, 'DENY')}
										>
											<IconX size={15} /> {m.applications_submission_list_deny()}
										</Button>
										<Button size="sm" loading={busy} onclick={() => review(submission.id, 'APPROVE')}>
											<IconCheck size={15} /> {m.applications_submission_list_approve()}
										</Button>
									</div>

									<p class="text-xs text-text-subtle">
										{m.applications_submission_list_approving_records_decision_here_promotions_still()}
									</p>
								</div>
							{:else if submission.reviewedAt}
								<div class="space-y-1 border-t border-border-base pt-4 text-sm">
									<p class="text-text-muted">
										{applicationStatusLabel(submission.status)} by
										{submission.reviewer?.displayName ??
											submission.reviewer?.username ??
											'a manager'}
										on {formatDateTime(submission.reviewedAt)}.
									</p>
									{#if submission.reviewNote}
										<p class="whitespace-pre-line text-text">“{submission.reviewNote}”</p>
									{/if}
									{#if submission.clearedAt}
										<p class="text-text-subtle">
											Record cleared {formatDateTime(submission.clearedAt)} — this no longer stops
											them applying.
										</p>
									{/if}
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
