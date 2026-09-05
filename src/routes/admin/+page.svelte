<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconAlertTriangle,
		IconCheck,
		IconEyeOff,
		IconShieldCheck,
		IconUsersGroup,
		IconUser
	} from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatRelative } from '$lib/utils/format';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let busyId = $state<string | null>(null);
	let lightbox = $state<string | null>(null);

	let stats = $derived([
		{ label: m.admin_open_reports(), value: data.overview.openReports, icon: IconAlertTriangle },
		{ label: m.admin_hidden_items(), value: data.overview.hiddenContent, icon: IconEyeOff },
		{ label: m.common_groups(), value: data.overview.groups, icon: IconUsersGroup },
		{ label: m.admin_users(), value: data.overview.users, icon: IconUser }
	]);

	const filters = [
		{ value: 'OPEN', label: m.common_open() },
		{ value: 'UPHELD', label: m.admin_upheld() },
		{ value: 'DISMISSED', label: m.admin_cleared() }
	] as const;

	async function resolve(reportId: string, action: 'approve' | 'uphold') {
		busyId = reportId;
		try {
			const endpoint = api.admin.reports({ id: reportId });
			const { error } =
				action === 'approve' ? await endpoint.approve.post({}) : await endpoint.uphold.post({});
			if (error) throw error;

			toasts.success(action === 'approve' ? 'Content restored' : 'Content stays hidden');
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.admin_could_not_resolve_report()));
		} finally {
			busyId = null;
		}
	}
</script>

<div class="mb-8 grid gap-4 sm:grid-cols-4">
	{#each stats as stat (stat.label)}
		<div class="card flex items-center gap-3 p-4">
			<span class="grid size-10 place-items-center rounded-lg bg-background-muted text-accent">
				<stat.icon size={19} stroke={1.7} />
			</span>
			<div>
				<p class="text-xl font-semibold text-text tabular-nums">{stat.value}</p>
				<p class="text-xs text-text-muted">{stat.label}</p>
			</div>
		</div>
	{/each}
</div>

<div class="mb-4 flex gap-1.5">
	{#each filters as filter (filter.value)}
		<button
			type="button"
			onclick={() => goto(`/admin?status=${filter.value}`)}
			aria-pressed={data.status === filter.value}
			class="rounded-lg border px-3 py-1.5 text-sm transition-colors
				{data.status === filter.value
				? 'border-accent bg-accent/15 text-accent'
				: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
		>
			{filter.label}
		</button>
	{/each}
</div>

{#if data.reports.length === 0}
	<EmptyState
		title={m.admin_nothing_review()}
		description={data.status === 'OPEN'
			? m.admin_no_open_reports_content_stays_visible()
			: m.admin_no_reports_with_status()}
	>
		{#snippet icon()}<IconShieldCheck size={28} stroke={1.5} />{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-4">
		{#each data.reports as report (report.id)}
			<li class="card overflow-hidden">
				<div class="flex flex-wrap items-start gap-4 p-4">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<Badge tone="danger">{report.reason}</Badge>
							<Badge>{report.targetType}</Badge>
							{#if report.target}
								<Badge
									tone={report.target.moderation === 'HIDDEN'
										? 'warning'
										: report.target.moderation === 'APPROVED'
											? 'success'
											: 'neutral'}
								>
									{report.target.moderation === 'HIDDEN'
										? m.common_hidden()
										: report.target.moderation === 'APPROVED'
											? m.admin_cleared()
											: m.admin_visible()}
								</Badge>
							{/if}
							<span class="text-xs text-text-subtle">{formatRelative(report.createdAt)}</span>
						</div>

						{#if report.target}
							<p class="mt-2 font-medium text-text">{report.target.label}</p>
							{#if report.target.description}
								<p class="mt-0.5 line-clamp-3 text-sm text-text-muted">
									{report.target.description}
								</p>
							{/if}
							{#if report.target.groupSlug}
								<a
									href="/g/{report.target.groupSlug}"
									class="mt-1 inline-block text-xs text-accent hover:underline"
								>
									{report.target.groupName ?? report.target.groupSlug}
								</a>
							{/if}
						{:else}
							<p class="mt-2 text-sm text-text-muted">
								{m.admin_reported_item_no_longer_exists()}
							</p>
						{/if}

						{#if report.details}
							<p class="mt-2 rounded-lg bg-background-secondary px-3 py-2 text-sm text-text-muted">
								{report.details}
							</p>
						{/if}

						<p class="mt-2 text-xs text-text-subtle">
							{m.admin_reported_by({
								name:
									report.reporter?.displayName ??
									report.reporter?.username ??
									m.admin_a_deleted_account()
							})}
						</p>
					</div>

					{#if report.status === 'OPEN'}
						<div class="flex shrink-0 flex-col gap-2">
							<Button
								size="sm"
								loading={busyId === report.id}
								onclick={() => resolve(report.id, 'approve')}
							>
								<IconCheck size={15} /> {m.admin_clear()}
							</Button>
							<Button
								size="sm"
								variant="danger"
								disabled={busyId === report.id}
								onclick={() => resolve(report.id, 'uphold')}
							>
								<IconEyeOff size={15} /> {m.admin_keep_hidden()}
							</Button>
						</div>
					{/if}
				</div>

				{#if report.target && report.target.images.length > 0}
					<ul class="flex gap-2 overflow-x-auto border-t border-border-base p-3">
						{#each report.target.images as image (image)}
							<li class="shrink-0">
								<button
									type="button"
									onclick={() => (lightbox = image)}
									class="block overflow-hidden rounded-lg border border-border-base"
								>
									<img
										src={image}
										alt={m.admin_reported_content()}
										loading="lazy"
										class="h-24 w-36 bg-background-muted object-cover"
									/>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

{#if lightbox}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
		onclick={() => (lightbox = null)}
	>
		<img src={lightbox} alt={m.admin_reported_content()} class="max-h-[85vh] w-auto rounded-lg" />
	</div>
{/if}
