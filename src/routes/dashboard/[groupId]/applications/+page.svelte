<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconChevronRight,
		IconClipboardText,
		IconLock,
		IconLockOpen,
		IconPlus,
		IconFileImport,
		IconUsers
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';
	import { can, PERM } from '$lib/utils/permissions';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let base = $derived(`/dashboard/${group.slug}/applications`);
	let canManage = $derived(can(group.permissions, PERM.MANAGE_APPLICATIONS));

	let createOpen = $state(false);
	let name = $state('');
	let rankId = $state('');
	let busyId = $state<string | null>(null);
	let creating = $state(false);
	let importOpen = $state(false);
	let importJson = $state('');
	let importFileName = $state('');
	let importRankId = $state('');
	let importing = $state(false);
	let importResult = $state<{ id: string; imported: number; skipped: string[] } | null>(null);

	function resetImport() {
		importJson = '';
		importFileName = '';
		importRankId = '';
		importResult = null;
	}

	async function pickGoogleFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		if (file.size > 262144) {
			toasts.error(m.dashboard_applications_google_too_large());
			return;
		}
		importJson = await file.text();
		importFileName = file.name;
	}

	async function importGoogle() {
		if (!importJson) return;
		importing = true;
		try {
			const { data: created, error } = await api.applications.import.google.post({
				groupId: group.id,
				formJson: importJson,
				...(importRankId ? { rankId: importRankId } : {})
			});
			if (!created) throw error;
			importResult = created;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_applications_google_import_failed()));
		} finally {
			importing = false;
		}
	}

	let rankOptions = $derived([
		{ value: '', label: m.dashboard_applications_choose_rank() },
		...data.ranks.map((rank) => ({ value: rank.id, label: rank.cachedName }))
	]);

	async function create() {
		if (!name.trim()) return;

		creating = true;
		try {
			const { data: created, error } = await api.applications.post({
				groupId: group.id,
				name: name.trim(),
				...(rankId ? { rankId } : {})
			});
			if (error) throw error;

			createOpen = false;
			name = '';
			rankId = '';

			// Straight into the form builder: a form with no questions is not
			// something anybody wants to stop at.
			await goto(`${base}/${created.id}?section=form`);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_applications_could_not_create_application()));
		} finally {
			creating = false;
		}
	}

	/**
	 * The card's own open/closed switch.
	 *
	 * Closing is the thing a group reaches for most and it is safe — everything
	 * already submitted stays — so it lives on the card rather than two clicks
	 * inside the form's settings.
	 */
	async function toggleOpen(applicationId: string, open: boolean) {
		busyId = applicationId;
		try {
			const { error } = await api.applications({ applicationId }).patch({ open });
			if (error) throw error;

			toasts.success(
				open ? m.dashboard_applications_opened() : m.dashboard_applications_closed_toast()
			);
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_applications_could_not_change_application()));
		} finally {
			busyId = null;
		}
	}
</script>

<PageHeader
	title={m.common_applications()}
	description={m.dashboard_applications_forms_people_fill_ask_rank_closing()}
>
	{#snippet actions()}
		{#if canManage}
			<Button variant="secondary" onclick={() => (importOpen = true)}><IconFileImport size={16} /> {m.dashboard_applications_import_google()}</Button>
			<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> {m.dashboard_applications_new_application()}</Button>
		{/if}
	{/snippet}
</PageHeader>

{#if data.applications.length === 0}
	<EmptyState
		title={m.dashboard_applications_no_applications_yet()}
		description={m.dashboard_applications_create_form_bind_rank_people_are()}
	>
		{#snippet icon()}<IconClipboardText size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			{#if canManage}
				<div class="flex flex-wrap gap-2">
					<Button size="sm" variant="secondary" onclick={() => (importOpen = true)}>
						<IconFileImport size={15} /> {m.dashboard_applications_import_google()}
					</Button>
					<Button size="sm" onclick={() => (createOpen = true)}>
						<IconPlus size={15} /> {m.dashboard_applications_new_application()}
					</Button>
				</div>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-3">
		{#each data.applications as application (application.id)}
			{@const href = `${base}/${application.id}`}
			<li
				class="card relative flex flex-wrap items-center gap-3 p-4 transition-colors hover:border-accent/50"
			>
				<a {href} class="absolute inset-0" aria-label={m.dashboard_applications_open_named_form({ name: localized(application, 'name') })}></a>

				<span
					class="h-9 w-1.5 shrink-0 rounded-full"
					style="background: {application.color}"
				></span>

				<div class="pointer-events-none min-w-0 flex-1">
					<p class="truncate font-medium text-text">{localized(application, 'name')}</p>
					<p class="mt-0.5 truncate text-sm text-text-muted">
						{#if application.rank}
							{m.dashboard_applications_for_rank({ rank: application.rank.name })} ·
							{application.questionCount === 1
								? m.dashboard_applications_question({ count: application.questionCount })
								: m.dashboard_applications_questions({ count: application.questionCount })}
						{:else}
							{m.dashboard_applications_no_rank_bound_yet_cannot_open()}
						{/if}
					</p>
				</div>

				<!--
					`z-10` lifts the controls over the card's overlay link, so
					pressing the switch does not also open the page behind it.
				-->
				<div class="relative z-10 flex flex-wrap items-center gap-2">
					{#if application.pendingCount > 0}
						<a href="{href}?section=applicants" class="contents">
							<Badge tone="accent">
								<IconUsers size={13} />
								{m.common_to_review({ count: application.pendingCount })}
							</Badge>
						</a>
					{:else}
						<Badge>{m.dashboard_applications_nothing_review()}</Badge>
					{/if}

					<!--
						The badge says what the form *is*; the button says what
						pressing it does. One control trying to do both read as
						"Open" on a form that was open, which is exactly the
						thing somebody is about to change.
					-->
					{#if application.open}
						<Badge tone="success"><IconLockOpen size={13} /> {m.common_open()}</Badge>
					{:else}
						<Badge><IconLock size={13} /> {m.common_closed()}</Badge>
					{/if}

					{#if canManage}<Button
						size="sm"
						variant="secondary"
						disabled={busyId === application.id || (!application.rank && !application.open)}
						title={!application.rank && !application.open
							? m.dashboard_applications_bind_rank_before_opening_form()
							: undefined}
						onclick={() => toggleOpen(application.id, !application.open)}
					>
						{application.open ? m.dashboard_applications_close_form() : m.dashboard_applications_open_form()}
					</Button>{/if}

					<!-- The whole card is a link; on a phone the arrow only wraps onto a line of its own. -->
					<IconChevronRight size={16} class="hidden text-text-subtle sm:block" />
				</div>
			</li>
		{/each}
	</ul>
{/if}

<Modal
	bind:open={createOpen}
	title={m.dashboard_applications_new_application()}
	description={m.dashboard_applications_name_after_what_people_are_applying()}
>
	<div class="space-y-4">
		<Field label={m.common_name()}>
			<Input bind:value={name} maxlength={100} placeholder={m.dashboard_applications_e_g_driver_applications()} />
		</Field>

		<Field
			label={m.dashboard_applications_rank()}
			hint={m.dashboard_applications_what_successful_applicant_applying_form_cannot()}
		>
			<Select bind:value={rankId} options={rankOptions} />
		</Field>
	</div>

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (createOpen = false)}>{m.common_cancel()}</Button>
		<Button loading={creating} disabled={!name.trim()} onclick={create}>{m.dashboard_applications_create()}</Button>
	{/snippet}
</Modal>

<Modal
	bind:open={importOpen}
	onclose={resetImport}
	title={m.dashboard_applications_import_google()}
	description={m.dashboard_applications_import_description()}
>
	{#if importResult}
		<p class="text-sm text-text">{m.dashboard_applications_imported_items({ count: importResult.imported })}</p>
		{#if importResult.skipped.length > 0}
			<p class="mt-3 text-sm font-medium text-text">{m.dashboard_applications_skipped_items({ count: importResult.skipped.length })}</p>
			<ul class="mt-2 list-inside list-disc space-y-1 text-sm text-text-muted">
				{#each importResult.skipped as item}<li>{item}</li>{/each}
			</ul>
		{/if}
	{:else}
		<div class="space-y-4">
			<p class="text-sm text-text-muted">
				{m.dashboard_applications_import_instructions()} <a class="text-accent hover:underline" href="https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses" target="_blank" rel="noopener noreferrer">{m.dashboard_applications_google_docs()}</a>
			</p>
			<Field label={m.dashboard_applications_google_json()} hint={importFileName || m.dashboard_applications_google_json_hint()}>
				<input type="file" accept=".json,application/json" onchange={pickGoogleFile}
					class="w-full rounded-lg border border-border-base bg-background-secondary px-3 py-2 text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-background-muted file:px-2 file:py-1 file:text-text" />
			</Field>
			<Field label={m.dashboard_applications_rank()} hint={m.dashboard_applications_google_rank_hint()}>
				<Select bind:value={importRankId} options={rankOptions} />
			</Field>
		</div>
	{/if}
	{#snippet footer()}
		{#if importResult}
			<Button onclick={() => goto(`${base}/${importResult?.id}?section=form`)}>{m.dashboard_applications_review_draft()}</Button>
		{:else}
			<Button variant="ghost" onclick={() => (importOpen = false)}>{m.common_cancel()}</Button>
			<Button loading={importing} disabled={!importJson} onclick={importGoogle}>{m.dashboard_applications_import_draft()}</Button>
		{/if}
	{/snippet}
</Modal>
