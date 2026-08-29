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
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let application = $derived(data.application);
	let base = $derived(`/dashboard/${group.slug}/applications`);

	let busy = $state(false);

	let sections = $derived<ObjectSection[]>([
		{ id: 'form', label: 'Form', icon: IconClipboardText },
		{
			id: 'applicants',
			label: 'Applicants',
			icon: IconUsers,
			badge: data.pending.length
		},
		{ id: 'archive', label: 'Archive', icon: IconArchive },
		{ id: 'settings', label: 'Settings', icon: IconSettings }
	]);

	let rankOptions = $derived([
		{ value: '', label: 'No rank bound' },
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

	async function patch(body: Record<string, unknown>, success?: string) {
		busy = true;
		try {
			const { error } = await api.applications({ applicationId: application.id }).patch(body);
			if (error) throw error;

			if (success) toasts.success(success);
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not update this application'));
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (
			!confirm(
				`Delete “${application.name}”? Every application sent to it goes too — close it instead to keep them.`
			)
		)
			return;

		busy = true;
		try {
			const { error } = await api.applications({ applicationId: application.id }).delete();
			if (error) throw error;

			toasts.success('Application deleted');
			await goto(base);
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not delete this application'));
		} finally {
			busy = false;
		}
	}
</script>

<ObjectPage
	backHref={base}
	backLabel="Applications"
	title={application.name}
	description={application.description}
	accent={application.color}
	{sections}
>
	{#snippet meta()}
		{#if application.open}
			<Badge tone="success"><IconLockOpen size={13} /> Open</Badge>
		{:else}
			<Badge><IconLock size={13} /> Closed</Badge>
		{/if}

		{#if application.rank}
			<Badge tone="accent">For {application.rank.name}</Badge>
		{:else}
			<Badge tone="warning">No rank bound</Badge>
		{/if}
	{/snippet}

	{#snippet actions()}
		{#if application.open && group.visibility !== 'PRIVATE'}
			<Button size="sm" variant="secondary" href="/g/{group.slug}/apply/{application.slug}">
				View form <IconExternalLink size={14} />
			</Button>
		{/if}

		<Button
			size="sm"
			variant={application.open ? 'secondary' : 'primary'}
			disabled={busy || (!application.rank && !application.open)}
			onclick={() =>
				patch(
					{ open: !application.open },
					application.open ? 'Applications closed' : 'Applications opened'
				)}
		>
			{#if application.open}
				<IconLock size={15} /> Close applications
			{:else}
				<IconLockOpen size={15} /> Open applications
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
					Bind a rank in Settings before opening this form. Without one there is nothing an approval
					would be approving somebody for.
				</div>
			{/if}

			<QuestionEditor
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
					? 'Applications people send appear here for you to read.'
					: 'This form is closed, so nothing new is arriving.'}
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
						Show both
					</button>
				{/if}
			</div>

			<SubmissionList
				submissions={archive}
				manageRecords
				emptyTitle={archiveFilter === 'ALL'
					? 'Nothing decided yet'
					: `Nothing ${archiveFilter === 'APPROVED' ? 'approved' : 'denied'}`}
				emptyDescription="Applications you approve or deny are kept here, with what was written and who decided."
			/>
		{:else if section === 'settings'}
			<div class="space-y-6">
				<Card title="Details" description="What applicants see at the top of the form.">
					<div class="space-y-4">
						<div class="grid gap-4 sm:grid-cols-[1fr_auto]">
							<Field label="Name">
								<Input
									value={application.name}
									maxlength={100}
									disabled={busy}
									onblur={(event) => {
										const next = (event.currentTarget as HTMLInputElement).value.trim();
										if (next && next !== application.name) patch({ name: next }, 'Renamed');
									}}
								/>
							</Field>

							<Field label="Colour">
								<ColorInput
									value={application.color}
									disabled={busy}
									oncommit={(color) => patch({ color })}
								/>
							</Field>
						</div>

						<Field label="Description" hint="A line about who should apply, and what happens next.">
							<Textarea
								value={application.description}
								rows={3}
								maxlength={2000}
								disabled={busy}
								onblur={(event) => {
									const next = (event.currentTarget as HTMLTextAreaElement).value;
									if (next !== application.description) patch({ description: next });
								}}
							/>
						</Field>

						<p class="text-xs text-text-subtle">
							Public address: <code class="rounded bg-background-muted px-1 py-0.5 font-mono"
								>/g/{group.slug}/apply/{application.slug}</code
							>
						</p>
					</div>
				</Card>

				<Card title="Rank" description="What this form is an application for.">
					<Field
						label="Rank"
						hint="Approving somebody is a decision about this rank. The form cannot open without one."
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
					title="Refusals"
					description="How long turning somebody down keeps them from applying again."
				>
					<div class="space-y-4">
						<p class="text-sm text-text-muted">
							By default a refusal lasts the current round: closing this form and opening it again
							lets everybody who was turned down apply afresh. An approval always lapses that way —
							somebody who has since lost the rank should be able to ask for it back.
						</p>

						<Toggle
							checked={application.permaDeny}
							label="Refusals are permanent"
							description="A denied applicant stays denied through every reopening, until you clear their record in the archive."
							disabled={busy}
							onchange={(permaDeny) => patch({ permaDeny })}
						/>

						{#if !application.permaDeny}
							<Field
								label="Cooldown"
								hint="Days before a refusal lapses on its own. Leave empty to keep it until this form closes and reopens."
							>
								<Input
									type="number"
									min="1"
									max="365"
									value={application.denyCooldownDays ?? ''}
									placeholder="Until applications reopen"
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

				<Card title="Delete" description="This one cannot be undone.">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<p class="max-w-lg text-sm text-text-muted">
							Deleting takes every application sent to this form with it, approved and denied alike.
							Closing the form keeps them and simply stops new ones.
						</p>
						<Button variant="danger" size="sm" disabled={busy} onclick={remove}>
							<IconTrash size={15} /> Delete application
						</Button>
					</div>
				</Card>
			</div>
		{/if}
	{/snippet}
</ObjectPage>
