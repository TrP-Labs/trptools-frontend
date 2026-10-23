<script lang="ts">
	/**
	 * Who has earned a promotion or a demotion this month.
	 *
	 * A suggestion, never an action on its own: the page works the month out
	 * against each rank's rules and puts a green or red button beside each
	 * person it applies to, and a person presses it. Without the Roblox write
	 * connection — or without the grant to use it — the page is the same list
	 * with no buttons, and says what is missing, as claimable ranks does.
	 */
	import { afterNavigate, goto } from '$app/navigation';
	import {
		IconArrowDown,
		IconArrowUp,
		IconChevronLeft,
		IconChevronRight,
		IconInfoCircle,
		IconSettings,
		IconTrendingUp
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import Connection from '$lib/components/claimables/Connection.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { refreshData } from '$lib/utils/refresh';
	import { consumeUrlMarkers } from '$lib/utils/urlMarker';
	import { formatNumber } from '$lib/utils/format';
	import type { AttendanceStanding } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let standings = $derived(data.standings);
	let base = $derived(`/dashboard/${data.group.slug}`);
	let filter = $state<'ALL' | 'PROMOTE' | 'DEMOTE'>('ALL');
	let busy = $state<string | null>(null);

	afterNavigate(() =>
		consumeUrlMarkers(['roblox'], (values) => {
			if (values.roblox === 'verified') toasts.success(m.claimables_verified());
			else if (values.roblox) toasts.error(m.claimables_oauth_failed());
		})
	);

	let promote = $derived(standings.people.filter((person) => person.verdict === 'PROMOTE'));
	let demote = $derived(standings.people.filter((person) => person.verdict === 'DEMOTE'));
	let shown = $derived(
		filter === 'ALL' ? standings.people : filter === 'PROMOTE' ? promote : demote
	);
	let ready = $derived(standings.canApply && standings.connection.connected);

	/** Months as `YYYY-MM`, stepped in UTC like the API counts them. */
	function step(month: string, by: number) {
		const [year, index] = month.split('-').map(Number);
		const date = new Date(Date.UTC(year!, index! - 1 + by, 1));
		return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
	}
	let current = $derived(step(new Date().toISOString().slice(0, 7), 0));
	let monthLabel = $derived(
		new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
			new Date(`${standings.month}-01T00:00:00Z`)
		)
	);

	function bounds(person: AttendanceStanding) {
		const parts = [];
		if (person.minPoints !== null) parts.push(m.promotions_min({ points: formatNumber(person.minPoints) }));
		if (person.maxPoints !== null) parts.push(m.promotions_max({ points: formatNumber(person.maxPoints) }));
		return parts.join(' · ');
	}

	async function apply(person: AttendanceStanding) {
		if (!person.verdict || !person.targetRankName) return;
		const question =
			person.verdict === 'PROMOTE'
				? m.promotions_confirm_promote({ name: person.name, rank: person.targetRankName })
				: m.promotions_confirm_demote({ name: person.name, rank: person.targetRankName });
		if (!confirm(question)) return;
		busy = person.robloxId;
		try {
			const { data: result, error } = await api.attendance
				.groups({ groupId: data.group.id })
				.apply.post({ robloxId: person.robloxId, verdict: person.verdict, month: standings.month });
			if (!result) throw error;
			toasts.success(
				result.state === 'CONFIRMED'
					? m.promotions_done({ name: person.name, rank: person.targetRankName })
					: m.promotions_pending({ name: person.name })
			);
		} catch (error) {
			toasts.error(errorMessage(error, m.promotions_error()));
		} finally {
			busy = null;
		}
		await refreshData();
	}
</script>

<svelte:head><title>{m.promotions_title()} — {data.group.name}</title></svelte:head>
<PageHeader title={m.promotions_title()} description={m.promotions_intro()} />

{#if standings.canApply}
	<Connection
		groupId={data.group.id}
		connection={standings.connection}
		returnTo="promotions"
		hint={m.promotions_connect_hint()}
	/>
{:else}
	<p class="mb-6 flex items-start gap-2 rounded-lg border border-border-base bg-background-secondary p-3 text-sm text-text-muted">
		<IconInfoCircle size={16} class="mt-0.5 shrink-0" />
		{m.promotions_read_only()}
	</p>
{/if}

<div class="mb-4 flex flex-wrap items-center gap-3">
	<div class="flex items-center gap-1 rounded-lg border border-border-base bg-surface p-1">
		<button
			type="button"
			class="rounded-md p-1.5 text-text-muted hover:bg-background-muted hover:text-text"
			aria-label={m.promotions_previous_month()}
			onclick={() => goto(`?month=${step(standings.month, -1)}`, { keepFocus: true, noScroll: true })}
		>
			<IconChevronLeft size={16} />
		</button>
		<span class="min-w-36 text-center text-sm font-medium text-text" data-testid="month">{monthLabel}</span>
		<button
			type="button"
			class="rounded-md p-1.5 text-text-muted hover:bg-background-muted hover:text-text disabled:opacity-40"
			aria-label={m.promotions_next_month()}
			disabled={standings.month >= current}
			onclick={() => goto(`?month=${step(standings.month, 1)}`, { keepFocus: true, noScroll: true })}
		>
			<IconChevronRight size={16} />
		</button>
	</div>

	<div class="flex flex-wrap gap-1.5" role="tablist">
		{#each [{ id: 'ALL', label: m.promotions_filter_all(), count: standings.people.length }, { id: 'PROMOTE', label: m.promotions_filter_promote(), count: promote.length }, { id: 'DEMOTE', label: m.promotions_filter_demote(), count: demote.length }] as tab (tab.id)}
			<button
				type="button"
				role="tab"
				aria-selected={filter === tab.id}
				class="rounded-full border px-3 py-1 text-sm transition-colors
					{filter === tab.id
					? 'border-accent bg-accent/15 text-text'
					: 'border-border-base text-text-muted hover:text-text'}"
				onclick={() => (filter = tab.id as typeof filter)}
			>
				{tab.label} <span class="tabular-nums opacity-70">{tab.count}</span>
			</button>
		{/each}
	</div>
</div>

{#if standings.incomplete}
	<p class="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text-muted">{m.promotions_incomplete()}</p>
{/if}

{#if standings.configuredRanks === 0}
	<p class="mb-4 rounded-lg border border-border-base p-3 text-sm text-text-muted">{m.promotions_unconfigured()}</p>
{/if}

{#if shown.length === 0}
	<EmptyState title={m.promotions_empty()} description={m.promotions_empty_hint()}>
		{#snippet icon()}<IconTrendingUp size={28} />{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-2" data-testid="standings">
		{#each shown as person (person.robloxId)}
			<li
				class="card flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 p-3.5
					{person.verdict === 'PROMOTE' ? 'border-success/40' : person.verdict === 'DEMOTE' ? 'border-danger/40' : ''}"
				data-verdict={person.verdict ?? 'NONE'}
			>
				<div class="flex min-w-0 flex-1 basis-56 items-center gap-3">
					<Avatar src={person.avatar} name={person.name} size={36} />
					<div class="min-w-0">
						<a
							href="https://www.roblox.com/users/{person.robloxId}/profile"
							class="block truncate font-medium text-text hover:underline">{person.name}</a
						>
						<p class="flex items-center gap-1.5 text-xs text-text-muted">
							<span class="size-2 shrink-0 rounded-full" style="background: {person.rankColor}"></span>
							<span class="truncate">{person.rankName}</span>
						</p>
					</div>
				</div>

				<div class="w-48 shrink-0">
					<p class="font-mono text-lg font-semibold text-text tabular-nums">
						{m.promotions_points({ points: formatNumber(person.points) })}
					</p>
					<p class="text-xs text-text-muted">
						{m.promotions_shifts({ count: person.shifts })}{#if bounds(person)}{' · '}{bounds(person)}{/if}
					</p>
				</div>

				<div class="flex shrink-0 items-center gap-2 sm:ml-auto">
					{#if person.verdict && person.targetRankName}
						{#if ready}
							<Button
								size="sm"
								variant={person.verdict === 'PROMOTE' ? 'primary' : 'danger'}
								class={person.verdict === 'PROMOTE' ? 'promote' : ''}
								loading={busy === person.robloxId}
								disabled={busy !== null}
								onclick={() => apply(person)}
							>
								{#if person.verdict === 'PROMOTE'}<IconArrowUp size={15} />{m.promotions_promote_to({ rank: person.targetRankName })}{:else}<IconArrowDown size={15} />{m.promotions_demote_to({ rank: person.targetRankName })}{/if}
							</Button>
						{:else}
							<Badge tone={person.verdict === 'PROMOTE' ? 'success' : 'danger'}>
								{person.verdict === 'PROMOTE'
									? m.promotions_suggest_promote({ rank: person.targetRankName })
									: m.promotions_suggest_demote({ rank: person.targetRankName })}
							</Badge>
						{/if}
					{:else}
						<span class="text-xs text-text-subtle">{m.promotions_on_track()}</span>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<section class="mt-8">
	<h2 class="font-semibold text-text">{m.promotions_rules_title()}</h2>
	<p class="mt-1 text-sm text-text-muted">{m.promotions_rules_hint()}</p>
	<ul class="mt-3 flex flex-wrap gap-2">
		{#each standings.ranks as rank (rank.id)}
			<li>
				<a
					href="{base}/ranks/{rank.id}?section=attendance"
					class="inline-flex items-center gap-2 rounded-full border border-border-base px-3 py-1.5 text-sm text-text transition-colors hover:border-accent"
				>
					<span class="size-2 rounded-full" style="background: {rank.color}"></span>
					{rank.name}
					{#if rank.configured}<IconSettings size={13} class="text-success" />{/if}
				</a>
			</li>
		{/each}
	</ul>
</section>

<style>
	/* The green button: a promotion is the good news on this page. */
	:global(.promote) {
		background: var(--color-success) !important;
		color: var(--color-accent-contrast) !important;
	}
</style>
