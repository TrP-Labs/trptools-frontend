<script lang="ts">
	/**
	 * Dispatch for a group: the shared board, wrapped in a live room.
	 *
	 * Everything about the board itself — the lists, the rows, the keyboard
	 * cursor, tows — lives in `DispatchBoard`, which `/tools/dispatch` draws
	 * too. What belongs here is the room: opening and closing it, the stream
	 * it is fed by, who else is in it, and the shift it is counting down to.
	 */
	import { onDestroy } from 'svelte';
	import { refreshData } from '$lib/utils/refresh';
	import { IconPlayerStop } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DispatchBoard from '$lib/components/dispatch/DispatchBoard.svelte';
	import ImportVehiclesModal from '$lib/components/dispatch/ImportVehiclesModal.svelte';
	import RoomStatus from '$lib/components/dispatch/RoomStatus.svelte';
	import ShiftCountdown from '$lib/components/dispatch/ShiftCountdown.svelte';
	import PresenceModal from '$lib/components/dispatch/PresenceModal.svelte';
	import { DispatchRoom } from '$lib/stores/dispatch.svelte';
	import { OwnerDirectory } from '$lib/stores/owners.svelte';
	import { DriverPreferences } from '$lib/stores/driverPreferences.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { DispatchVehicle } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

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

	const owners = new OwnerDirectory();

	$effect(() => {
		owners.resolve(room.vehicles.map((vehicle) => vehicle.ownerId));
	});

	// The routes each driver asked for, so the route dropdown can show what
	// the solver would have taken into account.
	const preferences = new DriverPreferences();

	$effect(() => {
		preferences.load(
			roomId,
			room.vehicles.map((vehicle) => vehicle.ownerId)
		);
	});

	// --- actions ---------------------------------------------------------------

	async function patchVehicle(id: string, patch: Partial<DispatchVehicle>) {
		if (!roomId) return;

		const previous = room.vehicles.find((vehicle) => vehicle.id === id);
		room.patchLocal(id, patch);

		try {
			const { error } = await api.dispatch({ roomId }).vehicle({ vehicleId: id }).patch(patch);
			if (error) throw error;
		} catch (error) {
			if (previous) room.patchLocal(id, previous);
			toasts.error(errorMessage(error, m.dashboard_dispatch_could_not_update_vehicle()));
		}
	}

	/**
	 * The room reconciles the paste itself, so this hands it straight over and
	 * reports back what changed.
	 */
	async function importVehicles(vehicles: unknown[]) {
		if (!roomId) throw new Error('no room');

		const { data: result, error } = await api.dispatch({ roomId }).vehicles.post(vehicles as never);
		if (!result) throw error;

		return result;
	}

	async function deleteVehicle(id: string) {
		if (!roomId) return;

		try {
			const { error } = await api.dispatch({ roomId }).vehicle({ vehicleId: id }).delete();
			if (error) throw error;
			room.removeLocal(id);
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_dispatch_could_not_remove_vehicle()));
		}
	}

	let solving = $state(false);

	/**
	 * Placing one vehicle.
	 *
	 * `includeAssigned` is on because this button's whole purpose is the
	 * vehicle that already has a route — a driver swapped, a route filled up —
	 * which is precisely the one the board-wide solve leaves alone. The room
	 * still counts towards the spread it is placed into; only this vehicle
	 * moves.
	 */
	async function solveVehicle(vehicle: DispatchVehicle) {
		if (!roomId) return;

		try {
			const { data: result, error } = await api
				.dispatch({ roomId })
				.solve.post({ includeAssigned: true, vehicleIds: [vehicle.id] });
			if (!result) throw error;

			const [assignment] = result.assignments;
			if (!assignment?.route) {
				toasts.error(
					`Nothing to give ${vehicle.id} — no route serving ${vehicle.depot || 'its depot'} takes automatic assignment.`
				);
				return;
			}

			room.patchLocal(vehicle.id, { route: assignment.route });

			const named = data.routes.find((route) => route.id === assignment.route);
			toasts.success(m.common_vehicle_assigned({ vehicle: vehicle.id, route: named?.name ?? assignment.route }));
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_dispatch_could_not_assign_route_vehicle()));
		}
	}

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
			toasts.error(errorMessage(error, m.dashboard_dispatch_could_not_solve_routes()));
		} finally {
			solving = false;
		}
	}

	// --- room lifecycle --------------------------------------------------------

	let opening = $state(false);
	let presenceOpen = $state(false);
	let importOpen = $state(false);

	async function openRoom(eventId: string) {
		opening = true;
		try {
			const { data: created, error } = await api.rooms.post({ eventId });
			if (!created) throw error;

			toasts.success(m.dashboard_dispatch_dispatch_room_opened());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_dispatch_could_not_open_room()));
		} finally {
			opening = false;
		}
	}

	async function closeRoom() {
		if (!roomId) return;
		if (!confirm(m.dashboard_dispatch_close_room_confirm())) return;

		try {
			const { error } = await api.rooms({ roomId }).delete();
			if (error) throw error;

			room.disconnect();
			toasts.success(m.dashboard_dispatch_room_closed());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_dispatch_could_not_close_room()));
		}
	}
</script>

<PageHeader title={m.common_dispatch()} description={m.dashboard_dispatch_assign_routes_together_real_time()}>
	{#snippet meta()}
		{#if roomId}
			<RoomStatus
				status={room.status}
				endsAt={data.roomEndsAt}
				presence={room.presence.length}
				onpresence={() => (presenceOpen = true)}
			/>
		{/if}
	{/snippet}

	{#snippet actions()}
		{#if roomId && canHost}
			<Button variant="secondary" onclick={closeRoom}>
				<IconPlayerStop size={16} /> {m.dashboard_dispatch_close_room()}
			</Button>
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
	<DispatchBoard
		vehicles={room.vehicles}
		routes={data.routes}
		owners={owners.profiles}
		preferences={preferences.byOwner}
		collapseKey={group.id}
		{solving}
		onpatch={patchVehicle}
		ondelete={deleteVehicle}
		onsolve={solve}
		onsolveone={solveVehicle}
		onimport={() => (importOpen = true)}
	/>

	<PresenceModal bind:open={presenceOpen} {roomId} present={room.presence} />
{/if}

<ImportVehiclesModal bind:open={importOpen} onsubmit={importVehicles} />
