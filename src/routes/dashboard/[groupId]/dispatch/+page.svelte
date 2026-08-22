<script lang="ts">
	import { onDestroy } from 'svelte';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconBolt,
		IconClipboardText,
		IconKeyboard,
		IconPlayerStop,
		IconSearch,
		IconUsers
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import VehicleRow from '$lib/components/dispatch/VehicleRow.svelte';
	import ShiftCountdown from '$lib/components/dispatch/ShiftCountdown.svelte';
	import PresenceModal from '$lib/components/dispatch/PresenceModal.svelte';
	import { DispatchNav } from '$lib/components/dispatch/keyboardNav.svelte';
	import { DispatchRoom } from '$lib/stores/dispatch.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { VEHICLE_CATEGORY_LABELS, VEHICLE_CATEGORY_ORDER } from '$lib/api/types';
	import type { DispatchVehicle } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let canHost = $derived(group.permissionLevel >= 2);

	const room = new DispatchRoom();

	// Derived rather than held: opening or closing a room invalidates the load,
	// and the connection effect below follows the new value automatically.
	let roomId = $derived(data.roomId);

	$effect(() => {
		if (roomId) room.connect(roomId);
		else room.disconnect();
	});

	onDestroy(() => room.disconnect());

	// --- owner name resolution -------------------------------------------------

	let owners = $state<Record<string, { displayName: string | null; username: string | null; avatar: string | null }>>({});
	let resolvedIds = new Set<string>();

	$effect(() => {
		const missing = room.vehicles
			.map((vehicle) => vehicle.ownerId)
			.filter((id) => id && id !== '0' && !resolvedIds.has(id));

		if (missing.length === 0) return;

		const batch = [...new Set(missing)];
		batch.forEach((id) => resolvedIds.add(id));

		api.users.roblox.resolve
			.post({ robloxIds: batch })
			.then(({ data: profiles }) => {
				if (!profiles) return;
				const next = { ...owners };
				for (const profile of profiles) {
					next[profile.robloxId] = {
						displayName: profile.displayName,
						username: profile.username,
						avatar: profile.avatar
					};
				}
				owners = next;
			})
			.catch(() => {
				// Names are a nicety; ids still render.
			});
	});

	// --- filtering and grouping ------------------------------------------------

	let search = $state('');
	let busyIds = $state<Record<string, boolean>>({});
	let searchInput = $state<HTMLInputElement | null>(null);

	let filtered = $derived.by(() => {
		const term = search.trim().toLowerCase();
		if (!term) return room.vehicles;

		return room.vehicles.filter((vehicle) => {
			const owner = owners[vehicle.ownerId];
			return [
				vehicle.id,
				vehicle.name,
				vehicle.depot,
				vehicle.routeName ?? '',
				owner?.displayName ?? '',
				owner?.username ?? ''
			]
				.join(' ')
				.toLowerCase()
				.includes(term);
		});
	});

	let grouped = $derived.by(() => {
		const buckets: Record<string, DispatchVehicle[]> = {
			TROLLEYBUS: [],
			SERVICE: [],
			STAFF: [],
			OTHER: []
		};

		for (const vehicle of filtered) buckets[vehicle.category]?.push(vehicle);

		for (const key of Object.keys(buckets)) {
			buckets[key]!.sort(
				(a, b) => a.depot.localeCompare(b.depot) || a.id.localeCompare(b.id, undefined, { numeric: true })
			);
		}

		return buckets;
	});

	/** The rows in the order they are painted, which is the order the cursor walks. */
	let ordered = $derived(VEHICLE_CATEGORY_ORDER.flatMap((category) => grouped[category] ?? []));

	let assignedCount = $derived(room.vehicles.filter((vehicle) => vehicle.route).length);

	// --- actions ---------------------------------------------------------------

	function setBusy(id: string, value: boolean) {
		busyIds = value ? { ...busyIds, [id]: true } : Object.fromEntries(Object.entries(busyIds).filter(([key]) => key !== id));
	}

	async function patchVehicle(id: string, patch: Partial<DispatchVehicle>) {
		if (!roomId) return;

		const previous = room.vehicles.find((vehicle) => vehicle.id === id);
		room.patchLocal(id, patch);
		setBusy(id, true);

		try {
			const { error } = await api.dispatch({ roomId }).vehicle({ vehicleId: id }).patch(patch);
			if (error) throw error;
		} catch (error) {
			if (previous) room.patchLocal(id, previous);
			toasts.error(errorMessage(error, 'Could not update that vehicle'));
		} finally {
			setBusy(id, false);
		}
	}

	async function deleteVehicle(id: string) {
		if (!roomId) return;

		setBusy(id, true);
		try {
			const { error } = await api.dispatch({ roomId }).vehicle({ vehicleId: id }).delete();
			if (error) throw error;
			room.removeLocal(id);
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not remove that vehicle'));
		} finally {
			setBusy(id, false);
		}
	}

	let solving = $state(false);

	async function solve(includeAssigned: boolean) {
		if (!roomId) return;

		solving = true;
		try {
			const { data: result, error } = await api.dispatch({ roomId }).solve.post({ includeAssigned });
			if (!result) throw error;

			if (result.solved === 0 && result.skipped > 0) {
				// Almost always a depot the group has not told us about, which
				// is otherwise invisible from a bare "assigned 0".
				toasts.error(
					`Nothing could be assigned. ${result.skipped} ${
						result.skipped === 1 ? 'vehicle has' : 'vehicles have'
					} no route serving their depot — check the depots on your routes.`
				);
			} else {
				toasts.success(
					`Assigned ${result.solved} ${result.solved === 1 ? 'vehicle' : 'vehicles'}` +
						(result.skipped ? `, skipped ${result.skipped}` : '')
				);
			}
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not solve routes'));
		} finally {
			solving = false;
		}
	}

	// --- room lifecycle --------------------------------------------------------

	let opening = $state(false);
	let presenceOpen = $state(false);

	async function openRoom(eventId: string) {
		opening = true;
		try {
			const { data: created, error } = await api.rooms.post({ eventId });
			if (!created) throw error;

			toasts.success('Dispatch room opened');
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not open a room'));
		} finally {
			opening = false;
		}
	}

	async function closeRoom() {
		if (!roomId) return;
		if (!confirm('Close this dispatch room for everyone?')) return;

		try {
			const { error } = await api.rooms({ roomId }).delete();
			if (error) throw error;

			room.disconnect();
			toasts.success('Room closed');
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not close the room'));
		}
	}

	// --- vehicle import --------------------------------------------------------

	let importOpen = $state(false);
	let importText = $state('');
	let importing = $state(false);

	async function importVehicles() {
		if (!roomId) return;

		let parsed: unknown;
		try {
			parsed = JSON.parse(importText);
		} catch {
			toasts.error('That is not valid JSON');
			return;
		}

		if (!Array.isArray(parsed)) {
			toasts.error('The JSON must be an array of vehicles');
			return;
		}

		importing = true;
		try {
			const { data: result, error } = await api
				.dispatch({ roomId })
				.vehicles.post(parsed as never);
			if (!result) throw error;

			toasts.success(`Added ${result.added}, removed ${result.removed}, now tracking ${result.total}`);
			importOpen = false;
			importText = '';
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not import those vehicles'));
		} finally {
			importing = false;
		}
	}

	// --- keyboard --------------------------------------------------------------

	const nav = new DispatchNav();

	function onKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		const typing =
			target &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

		// Backslash sits outside every text field's alphabet and next to Enter,
		// so it can toggle the cursor without stealing a character.
		if (event.key === '\\' && !typing) {
			event.preventDefault();
			nav.toggle(ordered.length);
			return;
		}

		if (nav.handle(event, ordered.length)) {
			event.preventDefault();
			return;
		}

		if ((event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key === 'k')) && !typing) {
			event.preventDefault();
			nav.exit();
			searchInput?.focus();
			searchInput?.select();
			return;
		}

		if (event.key === 'Escape' && !typing) search = '';
	}

	// A vehicle leaving the room must not strand the cursor past the end.
	$effect(() => {
		if (nav.row > ordered.length - 1) nav.row = Math.max(ordered.length - 1, 0);
	});

	const statusTone = {
		idle: { label: 'Offline', tone: 'neutral' as const },
		connecting: { label: 'Connecting', tone: 'warning' as const },
		live: { label: 'Live', tone: 'success' as const },
		retrying: { label: 'Reconnecting', tone: 'warning' as const },
		closed: { label: 'Closed', tone: 'danger' as const }
	};
</script>

<svelte:window onkeydown={onKeydown} />

<PageHeader title="Dispatch" description="Assign routes together, in real time.">
	{#snippet actions()}
		{#if roomId}
			<Badge tone={statusTone[room.status].tone}>
				<span class="relative flex size-2">
					{#if room.status === 'live'}
						<span class="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-70"
						></span>
					{/if}
					<span class="relative inline-flex size-2 rounded-full bg-current"></span>
				</span>
				{statusTone[room.status].label}
			</Badge>

			<button
				type="button"
				onclick={() => (presenceOpen = true)}
				title="See who is in this room"
				class="inline-flex items-center gap-1.5 rounded-full border border-border-base px-2.5 py-0.5
					text-xs text-text-muted transition-colors hover:border-accent hover:text-text"
			>
				<IconUsers size={13} />
				{room.presence.length}
			</button>

			{#if canHost}
				<Button variant="secondary" onclick={closeRoom}>
					<IconPlayerStop size={16} /> Close room
				</Button>
			{/if}
		{/if}
	{/snippet}
</PageHeader>

{#if !roomId}
	<!--
		One place to open a room, counting down to the shift it belongs to.
		Duplicate buttons scattered around the page gave no sense of whether
		opening one was even possible yet.
	-->
	<ShiftCountdown
		occurrences={data.upcoming}
		leadMinutes={group.roomOpenLeadMinutes}
		{canHost}
		{opening}
		manageHref="/dashboard/{group.slug}/shifts"
		onopen={openRoom}
	/>
{:else}
	<!-- Toolbar -->
	<div class="mb-4 flex flex-wrap items-center gap-2">
		<div class="relative min-w-48 flex-1">
			<IconSearch
				size={15}
				class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
			/>
			<input
				bind:this={searchInput}
				bind:value={search}
				type="search"
				placeholder="Search vehicles   /"
				aria-label="Search vehicles"
				class="w-full rounded-lg border border-border-base bg-background-secondary py-2 pr-3 pl-9 text-sm
					text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
			/>
		</div>

		<Button variant="secondary" onclick={() => (importOpen = true)}>
			<IconClipboardText size={16} /> Import
		</Button>

		<Button onclick={() => solve(false)} loading={solving}>
			<IconBolt size={16} /> Solve routes
		</Button>

		<Button variant="ghost" onclick={() => solve(true)} disabled={solving}>Reassign all</Button>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle">
		<p>
			{room.vehicles.length} tracked · {assignedCount} assigned
			{#if search}· {filtered.length} matching{/if}
		</p>

		<p class="flex items-center gap-1.5">
			<IconKeyboard size={14} />
			{#if nav.enabled}
				<span class="text-accent">
					Keyboard mode · <kbd>↑</kbd><kbd>↓</kbd> vehicle · <kbd>→</kbd> or <kbd>Enter</kbd> to go
					in · <kbd>←</kbd> or <kbd>Esc</kbd> to go back
				</span>
			{:else}
				<span>Press <kbd>\</kbd> for keyboard navigation</span>
			{/if}
		</p>
	</div>

	{#if room.vehicles.length === 0}
		<EmptyState
			title="No vehicles yet"
			description="Paste the vehicle list from the game to start dispatching."
		>
			{#snippet action()}
				<Button onclick={() => (importOpen = true)}>
					<IconClipboardText size={16} /> Import vehicles
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="space-y-6">
			{#each VEHICLE_CATEGORY_ORDER as category (category)}
				{@const vehicles = grouped[category] ?? []}
				{#if vehicles.length > 0}
					<section>
						<h2 class="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
							{VEHICLE_CATEGORY_LABELS[category]}
							<span class="text-xs font-normal text-text-subtle">{vehicles.length}</span>
						</h2>

						<div class="card divide-y divide-border-base p-1">
							{#each vehicles as vehicle (vehicle.id)}
								{@const index = ordered.indexOf(vehicle)}
								<VehicleRow
									{vehicle}
									routes={data.routes}
									owner={owners[vehicle.ownerId]}
									busy={Boolean(busyIds[vehicle.id])}
									navActive={nav.enabled && nav.row === index}
									navCell={nav.enabled && nav.row === index ? nav.cell : null}
									onroute={(route) => patchVehicle(vehicle.id, { route })}
									ontoggle={(field, value) => patchVehicle(vehicle.id, { [field]: value })}
									ondelete={() => deleteVehicle(vehicle.id)}
								/>
							{/each}
						</div>
					</section>
				{/if}
			{/each}
		</div>
	{/if}

	<PresenceModal bind:open={presenceOpen} {roomId} present={room.presence} />
{/if}

<Modal
	bind:open={importOpen}
	title="Import vehicles"
	description="Paste the vehicle JSON from the game. Vehicles missing from the list are removed; existing ones keep their assignments."
	size="lg"
>
	<Field label="Vehicle JSON">
		<Textarea
			bind:value={importText}
			rows={10}
			spellcheck="false"
			class="font-mono text-xs"
			placeholder={'[{"Id":101,"OwnerId":1,"Name":"ZiU-9 Trolleybus","Depot":"Main Island Depot"}]'}
		/>
	</Field>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (importOpen = false)}>Cancel</Button>
		<Button onclick={importVehicles} loading={importing} disabled={!importText.trim()}>
			Import
		</Button>
	{/snippet}
</Modal>

<style>
	kbd {
		border: 1px solid var(--color-border-base);
		border-radius: 0.25rem;
		padding: 0 0.25rem;
		font-family: inherit;
		font-size: 0.9em;
	}
</style>
