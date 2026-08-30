<script lang="ts">
	import {
		IconCalendarTime,
		IconRadio,
		IconRoute,
		IconUsers,
		IconArrowRight,
		IconBulb,
		IconClipboardList,
		IconPlus,
		IconUsersGroup
	} from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import GroupStatusCard from '$lib/components/dashboard/GroupStatusCard.svelte';
	import NextShiftCard from '$lib/components/dashboard/NextShiftCard.svelte';
	import ReviewQueue from '$lib/components/dashboard/ReviewQueue.svelte';
	import ShiftList from '$lib/components/dashboard/ShiftList.svelte';
	import { api, errorMessage, loginUrl } from '$lib/api/client';
	import { refreshData } from '$lib/utils/refresh';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let dashboard = $derived(data.dashboard);
	let groups = $derived(dashboard?.groups ?? []);
	let shifts = $derived(dashboard?.shifts ?? []);
	let reviews = $derived(dashboard?.reviews ?? []);

	let primary = $derived(groups.find((group) => group.id === dashboard?.primaryGroupId) ?? null);

	/** Open dispatch rooms, by group, for whichever shift the card settles on. */
	let rooms = $derived(
		Object.fromEntries(groups.map((group) => [group.id, group.roomId]))
	);

	let waiting = $derived(reviews.reduce((total, review) => total + review.pendingCount, 0));

	/**
	 * How many groups they are in, which is not always how many are drawn:
	 * the API caps the cards it fills in with live data (a site admin holds
	 * every group on the instance).
	 */
	let groupTotal = $derived(dashboard?.groupTotal ?? groups.length);
	let liveRooms = $derived(groups.filter((group) => group.roomId).length);

	let pinning = $state<string | null>(null);

	/**
	 * Pinning is a toggle, so pressing the pin on the group already pinned
	 * clears it — the alternative is a choice you can change but never undo.
	 */
	async function pin(groupId: string) {
		if (pinning) return;

		const next = dashboard?.primaryGroupId === groupId ? null : groupId;

		pinning = groupId;
		try {
			const { error } = await api.users.me.preferences.patch({ primaryGroupId: next });
			if (error) throw error;
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not change your primary group'));
			pinning = null;
			return;
		}

		// Never inside the try above: a hiccup refreshing is not a failure to
		// save, and reporting it as one is how "could not save" ends up on a
		// change that was written.
		pinning = null;
		await refreshData();
	}

	let greeting = $derived.by(() => {
		const hour = new Date().getHours();
		if (hour < 5) return 'Still up';
		if (hour < 12) return 'Good morning';
		if (hour < 18) return 'Good afternoon';
		return 'Good evening';
	});

	const features = [
		{
			icon: IconRadio,
			title: 'Multi-user dispatch',
			body: 'Run a shift with your whole team in one room. Assignments, tows and vehicle deletions stay in sync for everyone, live.'
		},
		{
			icon: IconRoute,
			title: 'Custom routes, properly',
			body: 'Give every route its own colour, shape and depots. Automatic assignment treats a route you invented exactly like a built-in one.'
		},
		{
			icon: IconCalendarTime,
			title: 'Shift scheduling',
			body: 'Recurring shifts with slots people can sign up for, and a dashboard showing who is on which shift.'
		},
		{
			icon: IconUsers,
			title: 'Rank-based access',
			body: 'Map your Roblox roles to permissions once. Access follows your group, so promotions apply immediately.'
		},
		{
			icon: IconBulb,
			title: 'Stage programmer',
			body: 'Build lighting programs against a waveform and export them straight into the game.'
		}
	];
</script>

<svelte:head>
	<title>TrP Tools — Roblox group management for TrP</title>
</svelte:head>

{#if data.user && groups.length > 0}
	<!--
		Signed in with somewhere to be, the home page is the overview rather
		than the pitch: what is happening next, what is waiting on you, and one
		card per group you work for.
	-->
	<div class="mx-auto max-w-7xl px-4 py-8">
		<header class="mb-8 flex flex-wrap items-end justify-between gap-4">
			<div class="min-w-0">
				<h1 class="text-2xl font-semibold tracking-tight text-text">
					{greeting}, {data.user.displayName ?? data.user.username ?? 'there'}
				</h1>
				<p class="mt-1 text-sm text-text-muted">
					{groupTotal}
					{groupTotal === 1 ? 'group' : 'groups'}
					{#if waiting > 0}
						· {waiting} {waiting === 1 ? 'application' : 'applications'} waiting on you
					{:else if shifts.length > 0}
						· {shifts.length} {shifts.length === 1 ? 'shift' : 'shifts'} in the next fortnight
					{/if}
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				{#if primary}
					<!--
						The pinned group's own shortcut. Pinning is done on the
						cards below, so this is only ever a link.
					-->
					<Button href="/dashboard/{primary.slug}">
						<Avatar src={primary.icon} name={primary.name} size={18} />
						<span class="max-w-40 truncate">{primary.name}</span>
						<IconArrowRight size={15} />
					</Button>
				{/if}
				<Button variant="secondary" href="/dashboard">
					<IconUsersGroup size={16} /> All groups
				</Button>
			</div>
		</header>

		<div class="grid gap-6 lg:grid-cols-3">
			<div class="min-w-0 lg:col-span-2">
				<NextShiftCard {shifts} {rooms} />
			</div>

			<div class="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-1 lg:content-start">
				{#snippet tile(label: string, value: string | number, href: string, tone: string)}
					<a
						href={href}
						class="card flex min-w-0 items-center gap-3 p-4 transition-colors hover:border-border-strong"
					>
						<span class="text-2xl font-semibold tabular-nums {tone}">{value}</span>
						<span class="min-w-0 text-xs text-text-muted">{label}</span>
					</a>
				{/snippet}

				<!-- With nothing waiting there is no queue card to jump to. -->
				{@render tile(
					waiting === 1 ? 'application waiting' : 'applications waiting',
					waiting,
					waiting > 0 ? '#review' : '/dashboard',
					waiting > 0 ? 'text-warning' : 'text-text'
				)}
				{@render tile(
					liveRooms === 1 ? 'dispatch room live' : 'dispatch rooms live',
					liveRooms,
					'#groups',
					liveRooms > 0 ? 'text-success' : 'text-text'
				)}
				{@render tile(
					shifts.length === 1 ? 'shift coming up' : 'shifts coming up',
					shifts.length,
					'/shifts',
					'text-text'
				)}
				{@render tile(groupTotal === 1 ? 'group' : 'groups', groupTotal, '/dashboard', 'text-text')}
			</div>
		</div>

		{#if reviews.length > 0}
			<div id="review" class="mt-6 scroll-mt-20">
				<Card title="Waiting on a decision" description="Applications nobody has answered yet.">
					{#snippet actions()}
						<IconClipboardList size={18} class="text-text-subtle" />
					{/snippet}
					<ReviewQueue {reviews} />
				</Card>
			</div>
		{/if}

		<div class="mt-6 grid gap-6 lg:grid-cols-3">
			<section id="groups" class="min-w-0 scroll-mt-20 lg:col-span-2">
				<div class="mb-3 flex items-end justify-between gap-3">
					<h2 class="text-lg font-semibold">Your groups</h2>
					<a href="/dashboard" class="text-sm text-text-muted transition-colors hover:text-text">
						{groupTotal > groups.length ? `All ${groupTotal}` : 'Manage'}
					</a>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					{#each groups as group (group.id)}
						<GroupStatusCard
							{group}
							primary={group.id === dashboard?.primaryGroupId}
							{pinning}
							onpin={pin}
						/>
					{/each}
				</div>
			</section>

			<section class="min-w-0">
				<div class="mb-3 flex items-end justify-between gap-3">
					<h2 class="text-lg font-semibold">Later on</h2>
					<a href="/shifts" class="text-sm text-text-muted transition-colors hover:text-text">
						All shifts
					</a>
				</div>

				{#if shifts.length > 1}
					<ShiftList {shifts} skipFirst />
				{:else}
					<EmptyState
						title="Nothing else scheduled"
						description="Shifts from every group you are in land here."
					>
						{#snippet icon()}<IconCalendarTime size={24} stroke={1.5} />{/snippet}
					</EmptyState>
				{/if}
			</section>
		</div>
	</div>
{:else}
	<!-- Hero -->
	<section class="border-b border-border-base">
		<div class="mx-auto max-w-7xl px-4 py-16 sm:py-24">
			<div class="max-w-2xl">
				<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
					Run your group without the spreadsheet.
				</h1>
				<p class="mt-4 text-lg text-pretty text-text-muted">
					Dispatch together in real time, schedule shifts people can actually sign up for, and give
					your custom routes the colours and automatic assignment they always should have had.
				</p>

				<div class="mt-8 flex flex-wrap gap-3">
					{#if data.user}
						<!--
							Signed in but in no group yet: the dashboard is
							where a group is added, so that is the first step
							rather than a second copy of it here.
						-->
						<Button href="/dashboard" size="lg">
							<IconPlus size={17} /> Add your group
						</Button>
						<Button href="/groups" size="lg" variant="secondary">Browse groups</Button>
					{:else}
						<Button href={loginUrl()} size="lg" data-sveltekit-reload>Sign in with Roblox</Button>
						<Button href="/groups" size="lg" variant="secondary">Browse groups</Button>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section class="mx-auto max-w-7xl px-4 py-16">
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as feature (feature.title)}
				<article class="card min-w-0 p-5">
					<feature.icon size={22} stroke={1.6} class="text-accent" />
					<h2 class="mt-3 font-semibold text-text">{feature.title}</h2>
					<p class="mt-1.5 text-sm leading-relaxed text-text-muted">{feature.body}</p>
				</article>
			{/each}
		</div>
	</section>
{/if}
