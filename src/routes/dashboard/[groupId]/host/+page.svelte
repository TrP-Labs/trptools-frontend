<script lang="ts">
	/**
	 * Running a shift: the clock, the steps, the game feed and the shift's
	 * own announcement details.
	 *
	 * Laid out the way it is used. The clock and the step that wants doing
	 * next lead, because they change minute to minute; the rest of the
	 * timeline sits under them; the feed and the room's numbers sit beside
	 * them, where a glance answers "is the server still talking to us"; and
	 * the announcement details, which are set once, fold away underneath.
	 */
	import { onDestroy, untrack } from 'svelte';
	import {
		IconUpload,
		IconRadio,
		IconClock,
		IconCalendarTime,
		IconChevronDown,
		IconPlayerStop
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ShiftCountdown from '$lib/components/dispatch/ShiftCountdown.svelte';
	import PresenceModal from '$lib/components/dispatch/PresenceModal.svelte';
	import RoomStatus from '$lib/components/dispatch/RoomStatus.svelte';
	import ImportVehiclesModal from '$lib/components/dispatch/ImportVehiclesModal.svelte';
	import EventCard from '$lib/components/host/EventCard.svelte';
	import SkyHeader from '$lib/components/host/SkyHeader.svelte';
	import GameFeedCard from '$lib/components/host/GameFeedCard.svelte';
	import { DispatchRoom } from '$lib/stores/dispatch.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { refreshData } from '$lib/utils/refresh';
	import { can, PERM } from '$lib/utils/permissions';
	import { formatCountdown, formatDateTime } from '$lib/utils/format';
	import { GameClock } from '$lib/utils/sky';
	import { m } from '$lib/paraglide/messages.js';
	import type { GameStatus, HostEvent, HostSnapshot } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const room = new DispatchRoom();
	let roomId = $derived(data.roomId);
	let snapshot = $derived(room.host ?? data.hostSnapshot);
	let now = $state(Date.now());
	let opening = $state(false);
	let importing = $state(false);
	let presenceOpen = $state(false);
	let detailsOpen = $state(false);
	let busy = $state(false);
	let note = $state('');
	let owner = $state('');
	let joinCode = $state('');
	let announceJoinCode = $state(true);
	let baseNote = '';
	let baseOwner = '';
	let baseCode = '';
	let baseVisibility = true;

	$effect(() => {
		if (roomId) room.connect(roomId);
		else {
			room.disconnect();
			room.host = null;
		}
	});

	// --- the game feed ---------------------------------------------------------

	// Before a room exists there is no stream, so the feed's status is asked
	// for directly; once one is open the room's GAME frames take over.
	let polled = $state<{ status: GameStatus | null; at: number }>({
		status: untrack(() => data.gameStatus) ?? null,
		at: Date.now()
	});
	let game = $derived(roomId && room.game ? room.game : polled.status);
	let gameAt = $derived(roomId && room.game ? room.gameReceivedAt : polled.at);
	let live = $derived(roomId && room.game ? room.live : Boolean(polled.status?.live) && now - polled.at < 75_000);

	$effect(() => {
		if (roomId && room.game) return;
		const groupId = data.group.id;
		const poll = async () => {
			const { data: status } = await api.realtime.groups({ groupId }).status.get().catch(() => ({ data: null }));
			if (status) polled = { status, at: Date.now() };
		};
		const timer = setInterval(poll, 15_000);
		return () => clearInterval(timer);
	});

	const clock = new GameClock();
	$effect(() => {
		clock.observe(live ? (game?.gameTime ?? null) : null, gameAt);
	});
	let gameMinute = $derived.by(() => {
		void now;
		return live ? clock.at(now) : null;
	});

	// --- shift information form ------------------------------------------------

	let savedNote = $derived(snapshot?.note ?? '');
	let savedOwner = $derived(snapshot?.ownerRobloxId ?? '');
	let savedCode = $derived(snapshot?.joinCode ?? '');
	let savedVisibility = $derived(snapshot?.announceJoinCode ?? snapshot?.defaultAnnounceJoinCode ?? true);
	$effect(() => {
		const next = savedNote;
		untrack(() => { if (note === baseNote) note = next; baseNote = next; });
	});
	$effect(() => {
		const next = savedOwner;
		untrack(() => { if (owner === baseOwner) owner = next; baseOwner = next; });
	});
	$effect(() => {
		const next = savedCode;
		untrack(() => { if (joinCode === baseCode) joinCode = next; baseCode = next; });
	});
	$effect(() => {
		const next = savedVisibility;
		untrack(() => { if (announceJoinCode === baseVisibility) announceJoinCode = next; baseVisibility = next; });
	});
	let dirty = $derived(
		note !== savedNote || owner !== savedOwner || joinCode !== savedCode || announceJoinCode !== savedVisibility
	);

	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});
	onDestroy(() => room.disconnect());
	$effect(() => {
		if (room.status === 'closed' && roomId) void refreshData();
	});

	// --- timeline --------------------------------------------------------------

	function isOpen(item: HostEvent) {
		return item.status === 'WAITING' || item.status === 'READY' || item.status === 'IGNORED' || Boolean(item.awaitingAck);
	}

	/**
	 * The step that wants attention next: one due and waiting on staff, then
	 * whatever comes next on the clock. A step already ignored is a leftover
	 * — still doable from the list — and only leads when nothing else is left.
	 */
	let upNext = $derived.by(() => {
		const timeline = snapshot?.timeline ?? [];
		return timeline.find((item) => item.awaitingAck || (item.status === 'READY' && item.dueAt <= now))
			?? timeline.find((item) => item.status === 'WAITING')
			?? timeline.find((item) => isOpen(item));
	});

	function blockedFor(item: HostEvent): string | null {
		const bot = item.action === 'STAFF_START' || item.action === 'BEGIN' || item.action === 'COMPLETE';
		return bot && snapshot && !snapshot.botConnected ? m.host_bot_unavailable() : null;
	}

	async function act(run: () => Promise<{ error: unknown; data: HostSnapshot | 'Success' | null }>) {
		if (busy) return;
		busy = true;
		try {
			const { error, data: updated } = await run();
			if (error) throw error;
			if (updated && typeof updated === 'object') room.applyHost(updated);
		} catch (error) {
			toasts.error(errorMessage(error, m.host_error()));
			// A second host may have handled the card while this request was
			// in flight. Reconcile the board so a stale action is not offered again.
			if (roomId) {
				const current = await api.host({ roomId }).get().catch(() => null);
				if (current?.data) room.applyHost(current.data);
			}
		} finally {
			busy = false;
		}
	}

	function eventAction(item: HostEvent, operation: 'ACTIVATE' | 'ACKNOWLEDGE' | 'SKIP') {
		return act(() => api.host({ roomId: roomId! }).events({ id: item.id }).post({ operation }));
	}

	function eventTime(item: HostEvent, reference: 'START' | 'END', offsetMinutes: number) {
		return act(() =>
			api.host({ roomId: roomId! }).events({ id: item.id }).post({ operation: 'RESCHEDULE', reference, offsetMinutes })
		);
	}

	async function open(eventId: string) {
		opening = true;
		try {
			const { error } = await api.rooms.post({ eventId });
			if (error) throw error;
		} catch (error) {
			toasts.error(errorMessage(error, m.host_error()));
		} finally {
			opening = false;
		}
		await refreshData();
	}

	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !roomId) return;
		await act(() => api.host({ roomId }).image.put({ file }));
		input.value = '';
	}

	let stats = $derived([
		{ label: m.host_total_vehicles(), value: room.vehicles.length },
		{
			label: m.host_routed(),
			value: room.vehicles.filter((v) => v.route && v.ownerId !== '0' && !['SERVICE', 'STAFF'].includes(v.category)).length
		},
		// Live, "confirmed" is the game's word for it rather than a tick.
		{
			label: m.host_confirmed(),
			value: live ? room.vehicles.filter((v) => v.gameAssigned).length : room.vehicles.filter((v) => v.assigned).length
		},
		{ label: m.host_people(), value: room.presence.length }
	]);

	let starts = $derived(snapshot ? Date.parse(snapshot.occurrence) : 0);
	let timerLabel = $derived(
		!snapshot ? '' : now < starts ? m.host_timer_starts() : now < snapshot.endsAt ? m.host_timer_remaining() : m.host_timer_wrapup()
	);
	let timerValue = $derived(
		!snapshot ? '' : formatCountdown(Math.max(0, (now < starts ? starts : now < snapshot.endsAt ? snapshot.endsAt : snapshot.activeUntil) - now))
	);
</script>

<svelte:head><title>{m.host_title()} — TrP Tools</title></svelte:head>
<PageHeader title={m.host_title()} description={m.host_description()}>
	{#snippet meta()}
		{#if roomId && snapshot}
			<RoomStatus
				status={room.status}
				endsAt={new Date(snapshot.endsAt)}
				presence={room.presence.length}
				onpresence={() => (presenceOpen = true)}
			/>
		{/if}
	{/snippet}
	{#snippet actions()}
		{#if roomId && can(data.group.permissions, PERM.DISPATCH)}<Button href="/dashboard/{data.group.slug}/dispatch" variant="secondary"
				><IconRadio size={16} />{m.host_dispatch_link()}</Button
			>{/if}
		{#if can(data.group.permissions, PERM.MANAGE_SHIFTS)}<Button href="/dashboard/{data.group.slug}/settings?section=schedule" variant="ghost"
				><IconCalendarTime size={16} />{m.host_schedule_link()}</Button
			>{/if}
	{/snippet}
</PageHeader>

{#if !roomId || !snapshot}
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
		<div class="min-w-0">
			<ShiftCountdown
				occurrences={data.upcoming}
				leadMinutes={data.group.roomOpenLeadMinutes}
				canHost={true}
				{opening}
				manageHref={can(data.group.permissions, PERM.MANAGE_SHIFTS) ? `/dashboard/${data.group.slug}/shifts` : null}
				onopen={open}
			/>
		</div>
		<GameFeedCard {game} receivedAt={gameAt} {now} {live} />
	</div>
{:else}
	<div class="space-y-6">
		<SkyHeader
			{gameMinute}
			title={snapshot.eventName}
			when={formatDateTime(snapshot.occurrence)}
			label={timerLabel}
			countdown={timerValue}
			subtitle={m.host_wrapup_until({ time: formatDateTime(new Date(snapshot.activeUntil)) })}
		>
			{#each [5, 10, 30, 60] as minutes (minutes)}
				<button
					type="button"
					class="glass-button"
					disabled={busy}
					title={m.host_extension_hint()}
					onclick={() => act(() => api.host({ roomId: roomId! }).extend.post({ minutes: minutes as 5 | 10 | 30 | 60 }))}
				>
					<IconClock size={15} />{minutes === 60 ? m.host_extend_hour() : m.host_extend({ minutes })}
				</button>
			{/each}
		</SkyHeader>

		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<div class="min-w-0 space-y-6">
				{#if !snapshot.botConnected}
					<p class="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text-muted">{m.host_bot_unavailable()}</p>
				{/if}

				{#if upNext}
					<section>
						<h2 class="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">{m.host_up_next()}</h2>
						<EventCard
							item={upNext}
							{now}
							{busy}
							featured
							blocked={blockedFor(upNext)}
							onaction={(operation) => eventAction(upNext!, operation)}
							ontime={(reference, offset) => eventTime(upNext!, reference, offset)}
						/>
					</section>
				{/if}

				<section>
					<h2 class="font-semibold text-text">{m.host_timeline()}</h2>
					<p class="mt-1 text-sm text-text-muted">{m.host_timeline_hint()}</p>
					<div class="mt-4 space-y-2">
						{#each snapshot.timeline as item (item.id)}
							{#if item.id !== upNext?.id}
								<EventCard
									{item}
									{now}
									{busy}
									blocked={blockedFor(item)}
									onaction={(operation) => eventAction(item, operation)}
									ontime={(reference, offset) => eventTime(item, reference, offset)}
								/>
							{/if}
						{/each}
					</div>
				</section>
			</div>

			<aside class="min-w-0 space-y-6">
				<GameFeedCard {game} receivedAt={gameAt} {now} {live} />

				<section class="card p-5">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="font-semibold text-text">{m.host_overview()}</h2>
						{#if !live}
							<Button size="sm" variant="secondary" onclick={() => (importing = true)}
								><IconUpload size={15} />{m.host_import()}</Button
							>
						{/if}
					</div>
					<dl class="mt-4 grid grid-cols-2 gap-4">
						{#each stats as stat (stat.label)}
							<div>
								<dt class="text-xs text-text-muted">{stat.label}</dt>
								<dd class="mt-1 text-2xl font-semibold text-text tabular-nums">{stat.value}</dd>
							</div>
						{/each}
					</dl>
				</section>
			</aside>
		</div>

		<section class="card">
			<button
				type="button"
				class="flex w-full items-center justify-between gap-3 p-5 text-left"
				aria-expanded={detailsOpen}
				onclick={() => (detailsOpen = !detailsOpen)}
			>
				<span class="min-w-0">
					<span class="block font-semibold text-text">{m.host_edit_title()}</span>
					<span class="mt-1 block text-sm text-text-muted">{m.host_edit_hint()}</span>
				</span>
				<IconChevronDown size={18} class="shrink-0 text-text-subtle transition-transform {detailsOpen ? 'rotate-180' : ''}" />
			</button>
			{#if detailsOpen}
				<form
					class="space-y-4 border-t border-border-base p-5"
					onsubmit={(e) => {
						e.preventDefault();
						act(() =>
							api.host({ roomId: roomId! }).note.put({
								note,
								ownerRobloxId: owner.trim() || null,
								joinCode: joinCode.trim() || null,
								announceJoinCode
							})
						);
					}}
				>
					<Field label={m.host_note()} for="host-note"><Textarea id="host-note" bind:value={note} maxlength={1000} /></Field>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field label={m.host_owner()} hint={m.host_owner_hint()} for="host-owner"
							><Input id="host-owner" bind:value={owner} pattern={'[0-9]{1,20}'} maxlength={20} /></Field
						>
						<Field label={m.host_join_code()} for="host-code">
							<Input id="host-code" bind:value={joinCode} pattern={'[a-zA-Z0-9]{4,12}'} maxlength={12} />
						</Field>
					</div>
					<Toggle
						checked={announceJoinCode}
						label={m.dashboard_bot_show_join_code_publicly()}
						description={m.dashboard_bot_join_button_carries_either_way_staff()}
						onchange={(value) => (announceJoinCode = value)}
					/>
					<div>
						<p class="text-xs font-semibold text-text-muted uppercase">{m.host_image()}</p>
						{#if snapshot.imageUrl}<img
								src={snapshot.imageUrl}
								alt={m.host_image()}
								class="mt-2 max-h-52 max-w-full rounded-lg object-contain"
							/><Button
								variant="ghost"
								size="sm"
								disabled={busy}
								onclick={() =>
									act(() =>
										api.host({ roomId: roomId! }).note.put({ note, ownerRobloxId: owner.trim() || null, imageUrl: null })
									)}>{m.host_remove_image()}</Button
							>{/if}<label class="mt-3 block text-sm text-text-muted"
							>{m.host_upload()}<input
								class="mt-2 block w-full text-sm"
								type="file"
								accept="image/png,image/jpeg,image/webp,image/gif"
								onchange={upload}
								disabled={busy}
							/></label
						>
						<p class="mt-1 text-xs text-text-subtle">{m.host_image_hint()}</p>
					</div>
					<Button type="submit" loading={busy} disabled={!dirty}>{m.host_save()}</Button>
				</form>
			{/if}
		</section>

		<div class="flex flex-col items-start gap-3 rounded-xl border border-border-base p-4 sm:flex-row sm:items-center">
			<p class="flex-1 text-xs text-text-muted">{m.host_close_hint()}</p>
			<Button
				variant="danger"
				disabled={busy || (now < snapshot.activeUntil && !can(data.group.permissions, PERM.CLOSE_ROOM))}
				onclick={async () => {
					await act(() => api.rooms({ roomId: roomId! }).delete());
					await refreshData();
				}}><IconPlayerStop size={15} />{m.host_close()}</Button
			>
		</div>
	</div>
	<ImportVehiclesModal
		bind:open={importing}
		onsubmit={async (vehicles) => {
			const { data: result, error } = await api.dispatch({ roomId: roomId! }).vehicles.post(vehicles as never);
			if (!result) throw error;
			return result;
		}}
	/>
{/if}

{#if roomId}<PresenceModal bind:open={presenceOpen} {roomId} present={room.presence} />{/if}

<style>
	.glass-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		border-radius: 0.5rem;
		border: 1px solid rgb(255 255 255 / 0.22);
		background: rgb(255 255 255 / 0.12);
		padding: 0.45rem 0.8rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		backdrop-filter: blur(4px);
		transition: background 150ms;
	}
	@media (max-width: 639px) {
		.glass-button {
			gap: 0.25rem;
			padding: 0.5rem 0.4rem;
			font-size: 0.8rem;
			white-space: nowrap;
		}
	}
	.glass-button:hover:not(:disabled) {
		background: rgb(255 255 255 / 0.24);
	}
	.glass-button:disabled {
		opacity: 0.5;
	}
	.glass-button:focus-visible {
		outline: 2px solid white;
		outline-offset: 2px;
	}
</style>
