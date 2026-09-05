<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconArchive,
		IconClipboardText,
		IconExternalLink,
		IconLock,
		IconLockOpen,
		IconSettings,
		IconTrash,
		IconUsers
	} from '@tabler/icons-svelte';
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import QuestionEditor from '$lib/components/applications/QuestionEditor.svelte';
	import SubmissionList from '$lib/components/applications/SubmissionList.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import TranslatableField from '$lib/components/i18n/TranslatableField.svelte';
	import { localized, type Translations } from '$lib/utils/translations';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let application = $derived(data.application);
	let base = $derived(`/dashboard/${group.slug}/applications`);

	let busy = $state(false);

	let sections = $derived<ObjectSection[]>([
		{ id: 'form', label: m.dashboard_applications_form(), icon: IconClipboardText },
		{
			id: 'applicants',
			label: m.dashboard_applications_applicants(),
			icon: IconUsers,
			badge: data.pending.length
		},
		{ id: 'archive', label: m.dashboard_applications_archive(), icon: IconArchive },
		{ id: 'settings', label: m.common_settings(), icon: IconSettings }
	]);

	let rankOptions = $derived([
		{ value: '', label: m.dashboard_applications_no_rank_bound() },
		...data.ranks.map((rank) => ({ value: rank.id, label: rank.cachedName }))
	]);

	/**
	 * Everything already decided, newest first, in one list.
	 *
	 * Approvals and refusals are the same kind of thing to somebody looking
	 * back through them — what happened, and when — so they are read together
	 * with the outcome on each rather than in two piles. The two counts double
	 * as filters for when somebody does want one pile.
	 */
	let archiveFilter = $state<'ALL' | 'APPROVED' | 'DENIED'>('ALL');

	let archive = $derived(
		[
			...(archiveFilter === 'DENIED' ? [] : data.approved),
			...(archiveFilter === 'APPROVED' ? [] : data.denied)
		].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
	);

	/** Pressing a filter that is already on turns it off again. */
	function filterArchive(status: 'APPROVED' | 'DENIED') {
		archiveFilter = archiveFilter === status ? 'ALL' : status;
	}

	/**
	 * The form's own text, held locally so a name and its translations save
	 * together. Reseeded from the server whenever nothing is unsaved, the same
	 * way the sign-up sheet editor does it.
	 */
	let formName = $state('');
	let formDescription = $state('');
	let formTranslations = $state<Translations>({});
	let textDirty = $state(false);

	$effect(() => {
		if (textDirty) return;

		formName = localized(application, 'name');
		formDescription = localized(application, 'description');
		formTranslations = structuredClone(application.translations);
	});

	async function saveText() {
		if (!textDirty || !formName.trim()) return;
		textDirty = false;

		await patch({
			name: formName.trim(),
			description: formDescription,
			translations: formTranslations
		});
	}

	async function patch(body: Record<string, unknown>, success?: string) {
		busy = true;
		try {
			const { error } = await api.applications({ applicationId: application.id }).patch(body);
			if (error) throw error;

			if (success) toasts.success(success);
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_applications_could_not_update_application()));
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (
			!confirm(
				m.dashboard_applications_delete_confirm({ name: localized(application, 'name') })
			)
		)
			return;

		busy = true;
		try {
			const { error } = await api.applications({ applicationId: application.id }).delete();
			if (error) throw error;

			toasts.success(m.dashboard_applications_application_deleted());
			await goto(base);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_applications_could_not_delete_application()));
		} finally {
			busy = false;
		}
	}
</script>

<ObjectPage
	backHref={base}
	backLabel="Applications"
	title={localized(application, 'name')}
	description={localized(application, 'description')}
	accent={application.color}
	{sections}
>
	{#snippet meta()}
		{#if application.open}
			<Badge tone="success"><IconLockOpen size={13} /> {m.common_open()}</Badge>
		{:else}
			<Badge><IconLock size={13} /> {m.common_closed()}</Badge>
		{/if}

		{#if application.rank}
			<Badge tone="accent">For {application.rank.name}</Badge>
		{:else}
			<Badge tone="warning">{m.dashboard_applications_no_rank_bound()}</Badge>
		{/if}
	{/snippet}

	{#snippet actions()}
		{#if application.open && group.visibility !== 'PRIVATE'}
			<Button size="sm" variant="secondary" href="/g/{group.slug}/apply/{application.slug}">
				{m.dashboard_applications_view_form()} <IconExternalLink size={14} />
			</Button>
		{/if}

		<Button
			size="sm"
			variant={application.open ? 'secondary' : 'primary'}
			disabled={busy || (!application.rank && !application.open)}
			onclick={() =>
				patch(
					{ open: !application.open },
					application.open ? m.dashboard_applications_applications_closed() : m.dashboard_applications_applications_opened()
				)}
		>
			{#if application.open}
				<IconLock size={15} /> {m.dashboard_applications_close_applications()}
			{:else}
				<IconLockOpen size={15} /> {m.dashboard_applications_open_applications()}
			{/if}
		</Button>
	{/snippet}

	{#snippet children(section)}
		<!--
			The builder is hidden rather than unmounted, so a glance at the
			applicants queue does not throw away a form somebody was half way
			through rewriting. Every other section is cheap to rebuild.
		-->
		<div class:hidden={section !== 'form'}>
			{#if !application.rank}
				<div class="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
					{m.dashboard_applications_bind_rank_settings_before_opening_form()}
				</div>
			{/if}

			<QuestionEditor
				sourceLocale={group.sourceLocale}
				groupId={group.id}
				applicationId={application.id}
				questions={application.questions}
			/>
		</div>

		{#if section === 'applicants'}
			<SubmissionList
				submissions={data.pending}
				reviewable
				emptyTitle="Nobody waiting"
				emptyDescription={application.open
					? m.dashboard_applications_applications_people_send_appear_here_read()
					: m.dashboard_applications_form_closed_so_nothing_new_arriving()}
			/>
		{:else if section === 'archive'}
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<button
					type="button"
					aria-pressed={archiveFilter === 'APPROVED'}
					onclick={() => filterArchive('APPROVED')}
					class="rounded-full transition-opacity {archiveFilter === 'DENIED'
						? 'opacity-40'
						: ''} {archiveFilter === 'APPROVED' ? 'ring-2 ring-success/50' : ''}"
				>
					<Badge tone="success">{data.approved.length} approved</Badge>
				</button>

				<button
					type="button"
					aria-pressed={archiveFilter === 'DENIED'}
					onclick={() => filterArchive('DENIED')}
					class="rounded-full transition-opacity {archiveFilter === 'APPROVED'
						? 'opacity-40'
						: ''} {archiveFilter === 'DENIED' ? 'ring-2 ring-danger/50' : ''}"
				>
					<Badge tone="danger">{data.denied.length} denied</Badge>
				</button>

				{#if archiveFilter !== 'ALL'}
					<button
						type="button"
						onclick={() => (archiveFilter = 'ALL')}
						class="text-xs text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
					>
						{m.dashboard_applications_show_both()}
					</button>
				{/if}
			</div>

			<SubmissionList
				submissions={archive}
				manageRecords
				emptyTitle={archiveFilter === 'ALL'
					? m.dashboard_applications_nothing_decided_yet()
					: `Nothing ${archiveFilter === 'APPROVED' ? 'approved' : 'denied'}`}
				emptyDescription="Applications you approve or deny are kept here, with what was written and who decided."
			/>
		{:else if section === 'settings'}
			<div class="space-y-6">
				<Card title={m.dashboard_applications_details()} description={m.dashboard_applications_what_applicants_see_at_top_form()}>
					<div class="space-y-4">
						<div class="grid gap-4 sm:grid-cols-[1fr_auto]">
							<Field label={m.common_name()}>
								<TranslatableField
									bind:value={formName}
									bind:translations={formTranslations}
									field="name"
									sourceLocale={group.sourceLocale}
									maxlength={100}
									disabled={busy}
									oninput={() => (textDirty = true)}
									onblur={saveText}
								/>
							</Field>

							<Field label={m.common_color()}>
								<ColorInput
									value={application.color}
									disabled={busy}
									oncommit={(color) => patch({ color })}
								/>
							</Field>
						</div>

						<Field label={m.common_description()} hint={m.dashboard_applications_line_about_who_should_apply_what()}>
							<TranslatableField
								bind:value={formDescription}
								bind:translations={formTranslations}
								field="description"
								sourceLocale={group.sourceLocale}
								multiline
								rows={3}
								maxlength={2000}
								disabled={busy}
								oninput={() => (textDirty = true)}
								onblur={saveText}
							/>
						</Field>

						<p class="text-xs text-text-subtle">
							{m.dashboard_applications_public_address()} <code class="rounded bg-background-muted px-1 py-0.5 font-mono"
								>/g/{group.slug}/apply/{application.slug}</code
							>
						</p>
					</div>
				</Card>

				<Card title={m.dashboard_applications_rank()} description={m.dashboard_applications_what_form_application()}>
					<Field
						label={m.dashboard_applications_rank()}
						hint={m.dashboard_applications_approving_somebody_decision_about_rank_form()}
					>
						<Select
							value={application.rank?.id ?? ''}
							options={rankOptions}
							disabled={busy}
							onchange={(rankId) => patch({ rankId: rankId || null }, 'Rank binding updated')}
						/>
					</Field>
				</Card>

				<Card
					title={m.dashboard_applications_refusals()}
					description={m.dashboard_applications_how_long_turning_somebody_down_keeps()}
				>
					<div class="space-y-4">
						<p class="text-sm text-text-muted">
							{m.dashboard_applications_by_default_refusal_lasts_current_round()}
						</p>

						<Toggle
							checked={application.permaDeny}
							label={m.dashboard_applications_refusals_are_permanent()}
							description={m.dashboard_applications_denied_applicant_stays_denied_through_every()}
							disabled={busy}
							onchange={(permaDeny) => patch({ permaDeny })}
						/>

						{#if !application.permaDeny}
							<Field
								label={m.dashboard_applications_cooldown()}
								hint={m.dashboard_applications_days_before_refusal_lapses_its_own()}
							>
								<Input
									type="number"
									min="1"
									max="365"
									value={application.denyCooldownDays ?? ''}
									placeholder={m.dashboard_applications_until_applications_reopen()}
									disabled={busy}
									onblur={(event) => {
										const raw = (event.currentTarget as HTMLInputElement).value.trim();
										const next = raw ? Number(raw) : null;
										if (next !== application.denyCooldownDays) {
											patch({ denyCooldownDays: next }, 'Cooldown updated');
										}
									}}
								/>
							</Field>
						{/if}
					</div>
				</Card>

				<Card title={m.common_delete()} description={m.dashboard_applications_one_cannot_undone()}>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<p class="max-w-lg text-sm text-text-muted">
							{m.dashboard_applications_deleting_takes_every_application_sent_form()}
						</p>
						<Button variant="danger" size="sm" disabled={busy} onclick={remove}>
							<IconTrash size={15} /> {m.dashboard_applications_delete_application()}
						</Button>
					</div>
				</Card>
			</div>
		{/if}
	{/snippet}
</ObjectPage>
