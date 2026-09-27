<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		IconUpload,
		IconRadio,
		IconClock,
		IconCalendarTime,
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import ShiftCountdown from '$lib/components/dispatch/ShiftCountdown.svelte';
	import PresenceModal from '$lib/components/dispatch/PresenceModal.svelte';
	import RoomStatus from '$lib/components/dispatch/RoomStatus.svelte';
	import ImportVehiclesModal from '$lib/components/dispatch/ImportVehiclesModal.svelte';
	import EventCard from '$lib/components/host/EventCard.svelte';
	import { DispatchRoom } from '$lib/stores/dispatch.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { refreshData } from '$lib/utils/refresh';
	import { can, PERM } from '$lib/utils/permissions';
	import { formatCountdown, formatDateTime } from '$lib/utils/format';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const room = new DispatchRoom();
	let roomId = $derived(data.roomId);
	let snapshot = $derived(room.host ?? data.hostSnapshot);
	let now = $state(Date.now());
	let opening = $state(false);
	let importing = $state(false);
	let presenceOpen = $state(false);
	let busy = $state(false);
	let note = $state('');
	let owner = $state('');
	$effect(() => {
		if (roomId) room.connect(roomId);
		else {
			room.disconnect();
			room.host = null;
		}
	});
	let savedNote = $derived(snapshot?.note ?? '');
	let savedOwner = $derived(snapshot?.ownerRobloxId ?? '');
	$effect(() => {
		note = savedNote;
	});
	$effect(() => {
		owner = savedOwner;
	});
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});
	onDestroy(() => room.disconnect());
	$effect(() => {
		if (room.status === 'closed' && roomId) void refreshData();
	});
	async function act(run: () => Promise<{ error: unknown }>) {
		if (busy) return;
		busy = true;
		try {
			const { error } = await run();
			if (error) throw error;
		} catch (error) {
			toasts.error(errorMessage(error, m.host_error()));
		} finally {
			busy = false;
		}
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
</script>

<svelte:head><title>{m.host_title()} — TrP Tools</title></svelte:head>
<PageHeader title={m.host_title()} description={m.host_description()}>
	{#snippet actions()}
		{#if roomId && can(data.group.permissions, PERM.DISPATCH)}<Button
				href="/dashboard/{data.group.slug}/dispatch"
				variant="secondary"
				><IconRadio size={16} />{m.host_dispatch_link()}</Button
			>{/if}
		{#if can(data.group.permissions, PERM.MANAGE_SHIFTS)}<Button
				href="/dashboard/{data.group.slug}/settings?section=schedule"
				variant="ghost"
				><IconCalendarTime size={16} />{m.host_schedule_link()}</Button
			>{/if}
	{/snippet}
</PageHeader>
{#if !roomId || !snapshot}
	<ShiftCountdown
		occurrences={data.upcoming}
		leadMinutes={data.group.roomOpenLeadMinutes}
		canHost={true}
		{opening}
		manageHref={can(data.group.permissions, PERM.MANAGE_SHIFTS)
			? `/dashboard/${data.group.slug}/shifts`
			: null}
		onopen={open}
	/>
{:else}
	<div class="space-y-6">
		<section class="card p-6 sm:p-8">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-xl font-semibold text-text">{snapshot.eventName}</h2>
					<p class="mt-1 text-sm text-text-muted">
						{formatDateTime(snapshot.occurrence)}
					</p>
				</div>
				<RoomStatus
					status={room.status}
					endsAt={new Date(snapshot.endsAt)}
					presence={room.presence.length}
					onpresence={() => (presenceOpen = true)}
				/>
			</div>
			<div class="py-7 text-center">
				<p
					class="text-xs font-semibold tracking-wide text-text-muted uppercase"
				>
					{now < Date.parse(snapshot.occurrence)
						? m.host_timer_starts()
						: now < snapshot.endsAt
							? m.host_timer_remaining()
							: m.host_timer_wrapup()}
				</p>
				<p
					class="mt-3 font-mono text-5xl font-semibold text-text tabular-nums sm:text-7xl"
					data-testid="shift-timer"
				>
					{formatCountdown(
						Math.max(
							0,
							(now < Date.parse(snapshot.occurrence)
								? Date.parse(snapshot.occurrence)
								: snapshot.endsAt) - now,
						),
					)}
				</p>
				<p class="mt-3 text-xs text-text-subtle">
					{m.host_wrapup_until({
						time: formatDateTime(new Date(snapshot.activeUntil)),
					})}
				</p>
			</div>
			<div class="flex flex-wrap justify-center gap-2">
				{#each [5, 10, 30, 60] as minutes}<Button
						variant="secondary"
						disabled={busy}
						onclick={() =>
							act(() =>
								api
									.host({ roomId: roomId! })
									.extend.post({ minutes: minutes as 5 | 10 | 30 | 60 }),
							)}
						><IconClock size={15} />{minutes === 60
							? m.host_extend_hour()
							: m.host_extend({ minutes })}</Button
					>{/each}
			</div>
			<p class="mt-3 text-center text-xs text-text-subtle">
				{m.host_extension_hint()}
			</p>
		</section>
		<section class="card p-5">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="font-semibold text-text">{m.host_overview()}</h2>
				<Button size="sm" variant="secondary" onclick={() => (importing = true)}
					><IconUpload size={16} />{m.host_import()}</Button
				>
			</div>
			<dl class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
				{#each [{ label: m.host_total_vehicles(), value: room.vehicles.length }, { label: m.host_routed(), value: room.vehicles.filter((v) => v.route && v.ownerId !== '0' && !['SERVICE', 'STAFF'].includes(v.category)).length }, { label: m.host_confirmed(), value: room.vehicles.filter((v) => v.assigned).length }, { label: m.host_people(), value: room.presence.length }] as stat}<div
					>
						<dt class="text-xs text-text-muted">{stat.label}</dt>
						<dd class="mt-1 text-2xl font-semibold text-text tabular-nums">
							{stat.value}
						</dd>
					</div>{/each}
			</dl>
		</section>
		<section>
			{#if !snapshot.botConnected}<p
					class="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text-muted"
				>
					{m.host_bot_unavailable()}
				</p>{/if}
			<h2 class="font-semibold text-text">{m.host_timeline()}</h2>
			<p class="mt-1 text-sm text-text-muted">{m.host_timeline_hint()}</p>
			<div class="mt-4 space-y-3">
				{#each snapshot.timeline as item (item.id)}<EventCard
						{item}
						{now}
						{busy}
						onaction={(operation) =>
							act(() =>
								api
									.host({ roomId: roomId! })
									.events({ id: item.id })
									.post({ operation }),
							)}
						ontime={(reference, offsetMinutes) =>
							act(() =>
								api
									.host({ roomId: roomId! })
									.events({ id: item.id })
									.post({ operation: 'RESCHEDULE', reference, offsetMinutes }),
							)}
					/>{/each}
			</div>
		</section>
		<section class="card p-5">
			<h2 class="font-semibold text-text">{m.host_edit_title()}</h2>
			<p class="mt-1 text-sm text-text-muted">{m.host_edit_hint()}</p>
			<form
				class="mt-5 space-y-4"
				onsubmit={(e) => {
					e.preventDefault();
					act(() =>
						api
							.host({ roomId: roomId! })
							.note.put({ note, ownerRobloxId: owner.trim() || null }),
					);
				}}
			>
				<Field label={m.host_note()} for="host-note"
					><Textarea id="host-note" bind:value={note} maxlength={1000} /></Field
				>
				<Field
					label={m.host_owner()}
					hint={m.host_owner_hint()}
					for="host-owner"
					><Input
						id="host-owner"
						bind:value={owner}
						pattern={'[0-9]{1,20}'}
						maxlength={20}
					/></Field
				>
				<div>
					<p class="text-xs font-semibold text-text-muted uppercase">
						{m.host_image()}
					</p>
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
									api
										.host({ roomId: roomId! })
										.note.put({
											note,
											ownerRobloxId: owner.trim() || null,
											imageUrl: null,
										}),
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
				<Button type="submit" loading={busy}>{m.host_save()}</Button>
			</form>
		</section>
		<div
			class="flex flex-col items-start gap-3 rounded-xl border border-border-base p-4 sm:flex-row sm:items-center"
		>
			<p class="flex-1 text-xs text-text-muted">{m.host_close_hint()}</p>
			<Button
				variant="danger"
				disabled={busy ||
					(now < snapshot.activeUntil &&
						!can(data.group.permissions, PERM.CLOSE_ROOM))}
				onclick={async () => {
					await act(() => api.rooms({ roomId: roomId! }).delete());
					await refreshData();
				}}>{m.host_close()}</Button
			>
		</div>
	</div>
	<ImportVehiclesModal
		bind:open={importing}
		onsubmit={async (vehicles) => {
			const { data: result, error } = await api
				.dispatch({ roomId: roomId! })
				.vehicles.post(vehicles as never);
			if (!result) throw error;
			return result;
		}}
	/>
{/if}

{#if roomId}<PresenceModal
		bind:open={presenceOpen}
		{roomId}
		present={room.presence}
	/>{/if}
