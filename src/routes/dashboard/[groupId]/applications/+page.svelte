<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconChevronRight,
		IconClipboardText,
		IconLock,
		IconLockOpen,
		IconPlus,
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

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let base = $derived(`/dashboard/${group.slug}/applications`);

	let createOpen = $state(false);
	let name = $state('');
	let rankId = $state('');
	let busyId = $state<string | null>(null);
	let creating = $state(false);

	let rankOptions = $derived([
		{ value: '', label: 'Choose a rank…' },
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
			toasts.error(errorMessage(error, 'Could not create that application'));
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

			toasts.success(open ? 'Applications opened' : 'Applications closed');
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not change that application'));
		} finally {
			busyId = null;
		}
	}
</script>

<PageHeader
	title="Applications"
	description="Forms people fill in to ask for a rank. Closing one stops new applicants without touching the ones you have yet to read."
>
	{#snippet actions()}
		<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> New application</Button>
	{/snippet}
</PageHeader>

{#if data.applications.length === 0}
	<EmptyState
		title="No applications yet"
		description="Create a form and bind it to the rank people are applying for."
	>
		{#snippet icon()}<IconClipboardText size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button size="sm" onclick={() => (createOpen = true)}>
				<IconPlus size={15} /> New application
			</Button>
		{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-3">
		{#each data.applications as application (application.id)}
			{@const href = `${base}/${application.id}`}
			<li
				class="card relative flex flex-wrap items-center gap-3 p-4 transition-colors hover:border-accent/50"
			>
				<a {href} class="absolute inset-0" aria-label="Open {application.name}"></a>

				<span
					class="h-9 w-1.5 shrink-0 rounded-full"
					style="background: {application.color}"
				></span>

				<div class="pointer-events-none min-w-0 flex-1">
					<p class="truncate font-medium text-text">{application.name}</p>
					<p class="mt-0.5 truncate text-sm text-text-muted">
						{#if application.rank}
							For {application.rank.name} · {application.questionCount}
							{application.questionCount === 1 ? 'question' : 'questions'}
						{:else}
							No rank bound yet — it cannot open until one is
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
								{application.pendingCount} to review
							</Badge>
						</a>
					{:else}
						<Badge>Nothing to review</Badge>
					{/if}

					<!--
						The badge says what the form *is*; the button says what
						pressing it does. One control trying to do both read as
						"Open" on a form that was open, which is exactly the
						thing somebody is about to change.
					-->
					{#if application.open}
						<Badge tone="success"><IconLockOpen size={13} /> Open</Badge>
					{:else}
						<Badge><IconLock size={13} /> Closed</Badge>
					{/if}

					<Button
						size="sm"
						variant="secondary"
						disabled={busyId === application.id || (!application.rank && !application.open)}
						title={!application.rank && !application.open
							? 'Bind a rank before opening this form'
							: undefined}
						onclick={() => toggleOpen(application.id, !application.open)}
					>
						{application.open ? 'Close form' : 'Open form'}
					</Button>

					<!-- The whole card is a link; on a phone the arrow only wraps onto a line of its own. -->
					<IconChevronRight size={16} class="hidden text-text-subtle sm:block" />
				</div>
			</li>
		{/each}
	</ul>
{/if}

<Modal
	bind:open={createOpen}
	title="New application"
	description="Name it after what people are applying for."
>
	<div class="space-y-4">
		<Field label="Name">
			<Input bind:value={name} maxlength={100} placeholder="e.g. Driver applications" />
		</Field>

		<Field
			label="Rank"
			hint="What a successful applicant is applying for. A form cannot open without one."
		>
			<Select bind:value={rankId} options={rankOptions} />
		</Field>
	</div>

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (createOpen = false)}>Cancel</Button>
		<Button loading={creating} disabled={!name.trim()} onclick={create}>Create</Button>
	{/snippet}
</Modal>
