<script lang="ts">
	import { untrack } from 'svelte';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconAlertTriangle,
		IconCheck,
		IconClock,
		IconLock,
		IconSend,
		IconWorld,
		IconX
	} from '@tabler/icons-svelte';
	import GroupCrumb from '$lib/components/layout/GroupCrumb.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { api, errorMessage, loginUrl } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { detectTimezone, formatDateTime, formatRelative } from '$lib/utils/format';
	import { withAlpha } from '$lib/utils/color';
	import type { PublicApplication } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized, localizedOption } from '$lib/utils/translations';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let application = $derived(data.application);
	/** Null when nobody is signed in; the API works this out for the caller. */
	let standing = $derived(data.standing);
	let mine = $derived(standing?.submission ?? null);

	let busy = $state(false);

	let questions = $derived(application.questions);
	let askable = $derived(
		questions.filter((question) => question.type !== 'SECTION' && question.type !== 'IMAGE')
	);

	const answerable = (list: PublicApplication['questions']) =>
		list.filter((question) => question.type !== 'SECTION' && question.type !== 'IMAGE');

	/**
	 * Every field starts as an explicit empty answer, before anything binds.
	 *
	 * `bind:` refuses an `undefined` initial value and throws
	 * `props_invalid_value`, which takes the page down with it — so these are
	 * filled in up front rather than growing as somebody types. Effects do not
	 * run during SSR, which is why the initial value is built here as well as
	 * reset below.
	 */
	const blankText = (list: PublicApplication['questions']) =>
		Object.fromEntries(answerable(list).map((question) => [question.id, '']));
	const blankChoices = (list: PublicApplication['questions']) =>
		Object.fromEntries(answerable(list).map((question) => [question.id, [] as string[]]));

	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, string>>(blankText(data.application.questions));
	// svelte-ignore state_referenced_locally
	let choices = $state<Record<string, string[]>>(blankChoices(data.application.questions));

	let formKey = $derived(askable.map((question) => question.id).join(','));

	$effect(() => {
		// Keyed on the ids alone, so a refresh that hands back the same
		// questions does not wipe half-written answers with it.
		formKey;

		untrack(() => {
			values = blankText(questions);
			choices = blankChoices(questions);
		});
	});

	/**
	 * Where the applicant is, sent with the form.
	 *
	 * Defaulted from their account and editable for this application only — a
	 * reviewer works out from this whether somebody can actually cover the
	 * evening service, so it is worth being able to correct without a trip to
	 * settings first.
	 */
	/**
	 * Where the applicant is, defaulted from the account and falling back to
	 * this device.
	 *
	 * The account's zone is null until somebody sets one, and the answer to
	 * that is what the browser resolves — not UTC. Defaulting to UTC is what
	 * sent every application out stamped UTC unless the applicant noticed the
	 * line above the send button and pressed Detect, which put a reviewer in
	 * the position of reading a zone nobody had actually claimed.
	 */
	let accountTimezone = $derived(standing?.timezone ?? detectTimezone());
	let accountLocale = $derived(standing?.locale ?? 'en');

	// svelte-ignore state_referenced_locally
	let timezone = $state(data.standing?.timezone ?? detectTimezone());
	// svelte-ignore state_referenced_locally
	let locale = $state(data.standing?.locale ?? 'en');
	let localeOpen = $state(false);

	$effect(() => {
		const preferred = { timezone: accountTimezone, locale: accountLocale };

		untrack(() => {
			timezone = preferred.timezone;
			locale = preferred.locale;
		});
	});

	let canApply = $derived(standing?.canApply ?? false);
	let blockedBy = $derived(standing?.blockedBy ?? null);

	function toggleChoice(questionId: string, option: string, single: boolean) {
		const current = choices[questionId] ?? [];

		if (single) {
			choices[questionId] = current.includes(option) ? [] : [option];
			return;
		}

		choices[questionId] = current.includes(option)
			? current.filter((value) => value !== option)
			: [...current, option];
	}

	let missing = $derived(
		askable.filter((question) => {
			if (!question.required) return false;
			return question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOXES'
				? (choices[question.id] ?? []).length === 0
				: !(values[question.id] ?? '').trim();
		})
	);

	async function submit() {
		if (missing.length > 0) {
			toasts.error(m.g_apply_answer_every_required_question_first());
			return;
		}

		busy = true;
		try {
			const { error } = await api.applications({ applicationId: application.id }).submit.post({
				answers: askable.map((question) => ({
					questionId: question.id,
					value: values[question.id] ?? '',
					choices: choices[question.id] ?? []
				})),
				timezone,
				locale
			});
			if (error) throw error;

			toasts.success(m.g_apply_application_sent());
			values = blankText(questions);
			choices = blankChoices(questions);
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.g_apply_could_not_send_application()));
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>{localized(application, 'name')} — {localized(group, 'name')} — TrP Tools</title>
	<meta
		name="description"
		content={localized(application, 'description') || `Apply to ${localized(group, 'name')} on TrP Tools.`}
	/>
	<meta property="og:title" content="{localized(application, 'name')} — {localized(group, 'name')}" />
	<meta property="og:description" content={localized(application, 'description')} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={group.icon ?? ''} />
</svelte:head>

<section
	class="border-b border-border-base"
	style="background: linear-gradient(180deg, {withAlpha(application.color, 0.18)}, transparent);"
>
	<div class="mx-auto max-w-3xl px-4 py-8">
		<GroupCrumb {group} current={localized(application, 'name')} />

		<div class="mt-5 flex flex-wrap items-start gap-5">
			<span class="h-16 w-1.5 shrink-0 rounded-full" style="background: {application.color}"></span>

			<div class="min-w-0 flex-1">
				<h1 class="text-3xl font-semibold tracking-tight text-balance">{localized(application, 'name')}</h1>

				{#if localized(application, 'description')}
					<p class="mt-2 text-pretty text-text-muted">{localized(application, 'description')}</p>
				{/if}

				<div class="mt-3 flex flex-wrap items-center gap-2">
					{#if application.rankName}
						<Badge tone="accent">
							<span
								class="inline-block size-2 rounded-full"
								style="background: {application.rankColor}"
							></span>
							{m.g_applying_for({ rank: application.rankName })}
						</Badge>
					{/if}
					{#if !application.open}
						<Badge tone="warning"><IconLock size={13} /> {m.common_closed()}</Badge>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<div class="mx-auto max-w-3xl space-y-6 px-4 py-10">
	<!--
		One notice, for whichever reason applies. The API decides which, so the
		page can never offer a form the server would refuse.
	-->
	{#if blockedBy === 'RANK_TOO_HIGH'}
		<div class="card flex flex-wrap items-start gap-3 border-warning/40 p-4">
			<IconAlertTriangle size={20} class="text-warning" />
			<div class="min-w-0 flex-1">
				<p class="font-medium text-text">{m.g_apply_already_rank_above()}</p>
				<p class="text-sm text-text-muted">
					{application.rankName
						? `This form is for ${application.rankName}, and the rank you hold in ${localized(group, 'name')} is higher than that.`
						: `The rank you hold in ${localized(group, 'name')} is higher than the one this form is for.`}
					There is nothing here for you to apply for — speak to the group directly if that looks
					wrong.
				</p>
			</div>
		</div>
	{:else if blockedBy === 'PENDING' && mine}
		<div class="card flex flex-wrap items-center gap-3 p-4">
			<IconClock size={20} class="text-accent" />
			<div class="min-w-0 flex-1">
				<p class="font-medium text-text">{m.g_apply_application_with_group()}</p>
				<p class="text-sm text-text-muted">
					{m.g_apply_sent_on_waiting({ date: formatDateTime(mine.submittedAt) })}
				</p>
			</div>
		</div>
	{:else if mine && mine.status !== 'PENDING'}
		{@const approved = mine.status === 'APPROVED'}
		{@const stillCounts = blockedBy === 'APPROVED' || blockedBy === 'DENIED'}
		<div
			class="card flex flex-wrap items-start gap-3 p-4 {approved
				? 'border-success/40'
				: 'border-danger/40'}"
		>
			{#if approved}
				<IconCheck size={20} class="text-success" />
			{:else}
				<IconX size={20} class="text-danger" />
			{/if}

			<div class="min-w-0 flex-1">
				<p class="font-medium text-text">
					{approved ? m.g_apply_application_was_approved() : m.g_apply_application_was_not_taken_forward()}
				</p>
				{#if mine.reviewedAt}
					<p class="text-sm text-text-muted">
						{m.g_apply_decided_on({ date: formatDateTime(mine.reviewedAt) })}
					</p>
				{/if}
				{#if mine.reviewNote}
					<p class="mt-2 whitespace-pre-line text-sm text-text">“{mine.reviewNote}”</p>
				{/if}

				<!--
					Nothing is said when the decision has stopped counting. Why
					it lapsed — the round ended, the cooldown ran out, somebody
					cleared the record — is the group's business, and announcing
					it invites a conversation about a decision they have already
					moved past. The live form below is the only signal an
					applicant needs.
				-->
				{#if stillCounts && standing?.retryAt}
					<p class="mt-2 text-sm text-text-subtle">
						{m.g_apply_can_apply_again_on({
							relative: formatRelative(standing.retryAt),
							date: formatDateTime(standing.retryAt)
						})}
					</p>
				{:else if stillCounts && !approved}
					<p class="mt-2 text-sm text-text-subtle">
						{localized(group, 'name')} is not taking another application from you for this at the moment.
					</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if !application.open}
		<div class="card p-6 text-center">
			<p class="font-medium text-text">{m.g_apply_applications_are_closed()}</p>
			<p class="mt-1 text-sm text-text-muted">
				{localized(group, 'name')} is not taking new applications for this at the moment.
			</p>
		</div>
	{:else if !data.user}
		<div class="card p-6 text-center">
			<p class="font-medium text-text">{m.g_apply_sign_apply()}</p>
			<p class="mt-1 text-sm text-text-muted">
				{m.g_apply_applications_are_tied_roblox_account_so()}
			</p>
			<div class="mt-4 flex justify-center">
				<Button href={loginUrl()}>{m.common_sign_with_roblox()}</Button>
			</div>
		</div>
	{/if}

	{#if questions.length === 0}
		<div class="card p-6 text-center text-sm text-text-muted">
			{m.g_apply_form_has_no_questions_yet()}
		</div>
	{:else}
		<div class="space-y-5" class:opacity-60={!canApply} class:pointer-events-none={!canApply}>
			{#each questions as question (question.id)}
				<div class="card p-5">
					{#if question.type === 'SECTION'}
						{#if localized(question, 'prompt')}
							<h2 class="text-base font-semibold text-text">{localized(question, 'prompt')}</h2>
						{/if}
						{#if localized(question, 'description')}
							<p class="mt-1 text-sm leading-relaxed whitespace-pre-line text-text-muted">
								{localized(question, 'description')}
							</p>
						{/if}
					{:else if question.type === 'IMAGE'}
						{#if question.image}
							<img
								src={question.image}
								alt={localized(question, 'prompt')}
								class="mx-auto max-h-96 w-auto rounded-lg"
								loading="lazy"
							/>
						{/if}
						{#if localized(question, 'prompt')}
							<p class="mt-2 text-center text-sm text-text-muted">{localized(question, 'prompt')}</p>
						{/if}
					{:else}
						<Field label={localized(question, 'prompt')} hint={localized(question, 'description') || undefined}>
							{#if question.type === 'SHORT_TEXT'}
								<Input
									bind:value={values[question.id]}
									maxlength={question.maxLength ?? 300}
									disabled={!canApply}
									placeholder={m.g_apply_answer()}
								/>
							{:else if question.type === 'LONG_TEXT'}
								<Textarea
									bind:value={values[question.id]}
									rows={5}
									maxlength={question.maxLength ?? 2000}
									disabled={!canApply}
									placeholder={m.g_apply_answer()}
								/>
							{:else}
								{@const single = question.type === 'MULTIPLE_CHOICE'}
								<!-- The buttons carry radio/checkbox roles, so the list has to be their group. -->
								<ul
									role={single ? 'radiogroup' : 'group'}
									aria-label={localized(question, 'prompt')}
									class="space-y-2"
								>
									<!--
										The label is translated; the value sent
										is not. An answer is stored against the
										choice the group wrote, so a reviewer
										reads the same words whichever language
										the applicant filled the form in.
									-->
									{#each question.options as option, optionIndex (option)}
										{@const picked = (choices[question.id] ?? []).includes(option)}
										<li>
											<button
												type="button"
												role={single ? 'radio' : 'checkbox'}
												aria-checked={picked}
												disabled={!canApply}
												onclick={() => toggleChoice(question.id, option, single)}
												class="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors
													{picked
													? 'border-accent bg-accent/10 text-text'
													: 'border-border-base text-text-muted hover:border-accent/40 hover:text-text'}"
											>
												<span
													class="grid size-4 shrink-0 place-items-center border {single
														? 'rounded-full'
														: 'rounded'} {picked ? 'border-accent bg-accent' : 'border-border-strong'}"
												>
													{#if picked}
														<IconCheck size={11} class="text-accent-contrast" />
													{/if}
												</span>
												{localizedOption(question, optionIndex)}
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</Field>

						{#if question.required}
							<p class="mt-1.5 text-xs text-text-subtle">{m.g_apply_required()}</p>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

		{#if canApply && data.user}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="min-w-0">
					<!--
						Sent whether or not anybody thinks about it, so it says
						so here rather than hiding in a settings page — and it
						is one press to correct before sending.
					-->
					<button
						type="button"
						onclick={() => (localeOpen = true)}
						class="inline-flex items-center gap-1.5 rounded-lg border border-border-base px-2.5 py-1.5
							text-xs text-text-muted transition-colors hover:text-text"
					>
						<IconWorld size={14} />
						{m.g_apply_sending_as({ timezone, locale })}
					</button>

					{#if missing.length > 0}
						<p class="mt-1.5 text-sm text-text-muted">
							{missing.length}
							{missing.length === 1 ? 'question' : 'questions'} still to answer.
						</p>
					{/if}
				</div>

				<Button loading={busy} disabled={missing.length > 0} onclick={submit}>
					<IconSend size={16} /> {m.g_apply_send_application()}
				</Button>
			</div>
		{/if}
	{/if}
</div>

<Modal
	bind:open={localeOpen}
	title={m.g_apply_what_goes_with_application()}
	description={m.g_apply_time_zone_language_are_sent_with()}
	size="sm"
>
	<div class="space-y-4">
		<Field label={m.g_apply_time_zone()} hint={m.g_apply_where_actually_are_not_where_group()}>
			<div class="flex flex-wrap gap-2">
				<Input bind:value={timezone} spellcheck="false" maxlength={64} class="min-w-40 flex-1" />
				<Button variant="secondary" onclick={() => (timezone = detectTimezone())}>{m.g_apply_detect()}</Button>
			</div>
		</Field>

		<Field label={m.g_apply_language()} hint={m.g_apply_code_such_as_en_en_gb()}>
			<div class="flex flex-wrap gap-2">
				<Input bind:value={locale} spellcheck="false" maxlength={8} class="min-w-40 flex-1" />
				<Button variant="secondary" onclick={() => (locale = navigator.language || accountLocale)}>
					{m.g_apply_detect()}
				</Button>
			</div>
		</Field>

		<p class="text-xs text-text-subtle">
			<!--
				Honest about which of the two this is. An account with no zone
				of its own is following this device, and saying "your account
				says America/Phoenix" when nothing on the account says any such
				thing is how somebody ends up not setting one.
			-->
			{standing?.timezone
				? m.g_apply_account_says({ timezone: accountTimezone, locale: accountLocale })
				: m.g_apply_account_has_no_zone({ timezone: accountTimezone, locale: accountLocale })}
			<a href="/settings" class="underline underline-offset-2">{m.g_apply_account_settings()}</a>.
		</p>
	</div>

	{#snippet footer()}
		<Button
			variant="ghost"
			onclick={() => {
				timezone = accountTimezone;
				locale = accountLocale;
			}}
		>
			{m.g_apply_reset()}
		</Button>
		<Button onclick={() => (localeOpen = false)}>{m.g_apply_done()}</Button>
	{/snippet}
</Modal>
