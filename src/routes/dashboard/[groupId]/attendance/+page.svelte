<script lang="ts">
	/**
	 * Attendance: who turned up, and what it earned them.
	 *
	 * One period is worked out once and every tab reads it — the overview,
	 * the shift-by-shift sheet and the two managers — so moving between tabs
	 * is free and only changing the period goes back to the server. That is
	 * the slow part (every shift, every sign-up, a Roblox lookup per person),
	 * so while it runs the controls grey out and the page says it is working
	 * rather than looking frozen.
	 */
	import { afterNavigate, goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import {
		IconArrowDown,
		IconArrowUp,
		IconInfoCircle,
		IconLayoutDashboard,
		IconPlayerPause,
		IconSettings,
		IconTable,
		IconTrendingDown,
		IconTrendingUp
	} from '@tabler/icons-svelte';
	import ObjectPage from '$lib/components/layout/ObjectPage.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Connection from '$lib/components/claimables/Connection.svelte';
	import PeriodPicker from '$lib/components/attendance/PeriodPicker.svelte';
	import RankFilter from '$lib/components/attendance/RankFilter.svelte';
	import ActivitySheet from '$lib/components/attendance/ActivitySheet.svelte';
	import StandingList from '$lib/components/attendance/StandingList.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { refreshData } from '$lib/utils/refresh';
	import { consumeUrlMarkers } from '$lib/utils/urlMarker';
	import { convertPeriod, PERIOD_COOKIE, type PeriodKind } from '$lib/utils/attendancePeriod';
	import type { AttendanceStanding } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let standings = $derived(data.standings);
	let base = $derived(`/dashboard/${data.group.slug}`);
	let busy = $state<string | null>(null);
	let ranks = $state<string[]>([]);

	afterNavigate(() =>
		consumeUrlMarkers(['roblox'], (values) => {
			if (values.roblox === 'verified') toasts.success(m.claimables_verified());
			else if (values.roblox) toasts.error(m.claimables_oauth_failed());
		})
	);

	// --- the period ---------------------------------------------------------

	let requested = $state(false);
	// Back and forward change the period too, without passing through here.
	let loading = $derived(
		requested ||
			Boolean(
				navigating.to &&
					navigating.to.url.pathname === page.url.pathname &&
					navigating.to.url.searchParams.get('period') !== page.url.searchParams.get('period')
			)
	);

	async function showPeriod(period: string) {
		const url = new URL(page.url);
		url.searchParams.set('period', period);
		requested = true;
		try {
			await goto(url, { keepFocus: true, noScroll: true });
		} finally {
			requested = false;
		}
	}

	function chooseKind(kind: PeriodKind) {
		// A cookie, so the next visit's first load is already the right kind.
		document.cookie = `${PERIOD_COOKIE}=${kind}; path=/; max-age=31536000; samesite=lax`;
		void showPeriod(convertPeriod(standings.period, kind));
	}

	// --- pausing --------------------------------------------------------------

	/**
	 * Pauses as this page has set them since the period loaded. A pause only
	 * hides somebody from the suggestions — their points are unchanged — so
	 * the page applies it locally rather than working the period out again.
	 */
	let paused = $state<Record<string, boolean>>({});
	let pending = $state(new Set<string>());
	$effect(() => {
		void standings;
		paused = {};
	});

	async function togglePause(person: AttendanceStanding) {
		const next = !person.paused;
		paused[person.robloxId] = next;
		pending = new Set([...pending, person.robloxId]);
		try {
			const { error } = await api.attendance
				.groups({ groupId: data.group.id })
				.pauses({ robloxId: person.robloxId })
				.put({ paused: next });
			if (error) throw error;
		} catch (error) {
			paused[person.robloxId] = !next;
			toasts.error(errorMessage(error, m.attendance_pause_error()));
		} finally {
			pending = new Set([...pending].filter((id) => id !== person.robloxId));
		}
	}

	// --- who is shown -----------------------------------------------------------

	let people = $derived(
		standings.people
			.map((person) => ({ ...person, paused: paused[person.robloxId] ?? person.paused }))
			.filter((person) => ranks.length === 0 || ranks.includes(person.rankId))
	);
	// Seniority first, as a roster reads.
	let sorted = $derived(
		[...people].sort((a, b) => b.rankOrder - a.rankOrder || a.name.localeCompare(b.name))
	);
	let staff = $derived(sorted.filter((person) => person.staff));
	let members = $derived(sorted.filter((person) => !person.staff));

	const suggested = (verdict: 'PROMOTE' | 'DEMOTE') =>
		people
			.filter((person) => person.verdict === verdict && person.targetRankName && !person.paused)
			.sort((a, b) => (verdict === 'PROMOTE' ? b.points - a.points : a.points - b.points) || a.name.localeCompare(b.name));
	let promote = $derived(suggested('PROMOTE'));
	let demote = $derived(suggested('DEMOTE'));
	let pausedCount = $derived(people.filter((person) => person.paused).length);
	let ready = $derived(standings.canApply && standings.connection.connected);

	let sections = $derived([
		{ id: 'overview', label: m.attendance_overview(), icon: IconLayoutDashboard },
		{ id: 'activity', label: m.attendance_activity(), icon: IconTable },
		{ id: 'promotions', label: m.attendance_promotions(), icon: IconTrendingUp, badge: promote.length },
		{ id: 'demotions', label: m.attendance_demotions(), icon: IconTrendingDown, badge: demote.length }
	]);

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
				.apply.post({ robloxId: person.robloxId, verdict: person.verdict, period: standings.period });
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

<svelte:head><title>{m.attendance_title()} — {data.group.name}</title></svelte:head>

<ObjectPage title={m.attendance_title()} description={m.attendance_intro()} {sections}>
	{#snippet children(section)}
		<div class="flex flex-wrap items-center gap-2">
			<PeriodPicker period={standings.period} {loading} onperiod={showPeriod} onkind={chooseKind} />
			{#if section !== 'overview'}
				<RankFilter ranks={standings.ranks} bind:selected={ranks} disabled={loading} />
			{/if}
		</div>

		{#if loading}
			<p
				class="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-text"
				role="status"
				data-testid="period-loading"
			>
				<Spinner size={14} />
				{m.attendance_loading()}
			</p>
		{/if}

		{#if standings.incomplete}
			<p class="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text-muted">{m.promotions_incomplete()}</p>
		{/if}

		<div
			class="min-w-0 space-y-6 transition-opacity duration-200 {loading ? 'pointer-events-none opacity-40 select-none' : ''}"
			aria-busy={loading}
			inert={loading}
		>
			{#if section === 'overview'}
				<dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{#each [{ label: m.attendance_stat_people(), value: standings.people.length }, { label: m.attendance_stat_shifts(), value: standings.shifts.length }, { label: m.attendance_promotions(), value: promote.length, tone: 'text-success' }, { label: m.attendance_demotions(), value: demote.length, tone: 'text-danger' }] as stat (stat.label)}
						<div class="card min-w-0 p-4">
							<dt class="truncate text-xs text-text-muted">{stat.label}</dt>
							<dd class="mt-1 font-mono text-2xl font-semibold tabular-nums {stat.tone ?? 'text-text'}">{stat.value}</dd>
						</div>
					{/each}
				</dl>

				{#if standings.configuredRanks === 0}
					<p class="rounded-lg border border-border-base p-3 text-sm text-text-muted">{m.promotions_unconfigured()}</p>
				{/if}

				<section>
					<h2 class="font-semibold text-text">{m.promotions_rules_title()}</h2>
					<p class="mt-1 text-sm text-text-muted">
						{standings.months > 1 ? m.attendance_rules_hint_quarter() : m.promotions_rules_hint()}
					</p>
					<ul class="mt-3 flex flex-wrap gap-2">
						{#each standings.ranks as rank (rank.id)}
							<li class="min-w-0">
								<a
									href="{base}/ranks/{rank.id}?section=attendance"
									class="inline-flex max-w-full items-center gap-2 rounded-full border border-border-base px-3 py-1.5 text-sm text-text transition-colors hover:border-accent"
								>
									<span class="size-2 shrink-0 rounded-full" style="background: {rank.color}"></span>
									<span class="truncate">{rank.name}</span>
									{#if rank.configured}<IconSettings size={13} class="shrink-0 text-success" />{/if}
								</a>
							</li>
						{/each}
					</ul>
				</section>

				{#if standings.canApply}
					<Connection
						groupId={data.group.id}
						connection={standings.connection}
						returnTo="attendance"
						hint={m.promotions_connect_hint()}
					/>
				{:else}
					<p class="flex items-start gap-2 rounded-lg border border-border-base bg-background-secondary p-3 text-sm text-text-muted">
						<IconInfoCircle size={16} class="mt-0.5 shrink-0" />
						{m.promotions_read_only()}
					</p>
				{/if}
			{:else if section === 'activity'}
				{#if staff.length === 0 && members.length === 0}
					<EmptyState title={m.promotions_empty()} description={m.attendance_activity_empty()}>
						{#snippet icon()}<IconTable size={28} />{/snippet}
					</EmptyState>
				{:else}
					<p class="text-sm text-text-muted">
						{standings.canPause ? m.attendance_activity_hint() : m.attendance_activity_hint_read_only()}
					</p>
					<div class="space-y-4">
						{#if staff.length}
							<ActivitySheet
								title={m.attendance_sheet_staff()}
								raised
								people={staff}
								shifts={standings.shifts}
								canPause={standings.canPause}
								{pending}
								onpause={togglePause}
							/>
						{/if}
						{#if members.length}
							<ActivitySheet
								title={m.attendance_sheet_users()}
								people={members}
								shifts={standings.shifts}
								canPause={standings.canPause}
								{pending}
								onpause={togglePause}
							/>
						{/if}
					</div>
				{/if}
			{:else}
				{@const promoting = section === 'promotions'}
				{@const list = promoting ? promote : demote}
				{#if !ready}
					<p class="flex items-start gap-2 rounded-lg border border-border-base bg-background-secondary p-3 text-sm text-text-muted">
						<IconInfoCircle size={16} class="mt-0.5 shrink-0" />
						{standings.canApply ? m.attendance_connect_on_overview() : m.promotions_read_only()}
					</p>
				{/if}
				{#if pausedCount}
					<p class="flex items-center gap-2 text-sm text-text-muted">
						<IconPlayerPause size={15} class="shrink-0" />
						{m.attendance_paused_hidden({ count: pausedCount })}
					</p>
				{/if}
				{#if list.length === 0}
					<EmptyState
						title={promoting ? m.attendance_promotions_empty() : m.attendance_demotions_empty()}
						description={m.attendance_manager_empty_hint()}
					>
						{#snippet icon()}{#if promoting}<IconArrowUp size={28} />{:else}<IconArrowDown size={28} />{/if}{/snippet}
					</EmptyState>
				{:else}
					<StandingList people={list} {ready} {busy} disabled={loading} onapply={apply} />
				{/if}
			{/if}
		</div>
	{/snippet}
</ObjectPage>
