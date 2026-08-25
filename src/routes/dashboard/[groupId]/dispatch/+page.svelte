<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { refreshData } from '$lib/utils/refresh';
	import { IconClipboardText, IconPlayerStop } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import VehicleRow from '$lib/components/dispatch/VehicleRow.svelte';
	import VehicleSection from '$lib/components/dispatch/VehicleSection.svelte';
	import DispatchToolbar from '$lib/components/dispatch/DispatchToolbar.svelte';
	import ImportVehiclesModal from '$lib/components/dispatch/ImportVehiclesModal.svelte';
	import RoomStatus from '$lib/components/dispatch/RoomStatus.svelte';
	import ShiftCountdown from '$lib/components/dispatch/ShiftCountdown.svelte';
	import PresenceModal from '$lib/components/dispatch/PresenceModal.svelte';
	import { DispatchNav, type NavCell, type NavRow } from '$lib/components/dispatch/keyboardNav.svelte';
	import { DispatchRoom } from '$lib/stores/dispatch.svelte';
	import { OwnerDirectory } from '$lib/stores/owners.svelte';
	import { ListCollapse } from '$lib/components/dispatch/listCollapse.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import {
		NOTE_ROUTE,
		VEHICLE_BUCKET_LABELS,
		VEHICLE_BUCKET_ORDER,
		vehicleBucket
	} from '$lib/api/types';
	import type { DispatchVehicle, ServiceStatus, VehicleBucket } from '$lib/api/types';
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

	const owners = new OwnerDirectory();

	$effect(() => {
		owners.resolve(room.vehicles.map((vehicle) => vehicle.ownerId));
	});

	// --- filtering and grouping ------------------------------------------------

	let search = $state('');
	let busyIds = $state<Record<string, boolean>>({});
	let searchInput = $state<HTMLInputElement | null>(null);

	let filtered = $derived.by(() => {
		const term = search.trim().toLowerCase();
		if (!term) return room.vehicles;

		return room.vehicles.filter((vehicle) => {
			const owner = owners.profiles[vehicle.ownerId];
			return [
				vehicle.id,
				vehicle.name,
				vehicle.depot,
				vehicle.routeName ?? '',
				// Only the note actually on show: a vehicle put back on a route
				// keeps its old note in case it goes back, and matching text
				// nobody can see makes a search result look like a bug.
				vehicle.route === NOTE_ROUTE ? vehicle.note : '',
				vehicle.location,
				owner?.displayName ?? '',
				owner?.username ?? ''
			]
				.join(' ')
				.toLowerCase()
				.includes(term);
		});
	});

	let grouped = $derived.by(() => {
		const buckets: Record<VehicleBucket, DispatchVehicle[]> = {
			SERVICE: [],
			STAFF: [],
			NORMAL: [],
			DECORATIVE: []
		};

		for (const vehicle of filtered) buckets[vehicleBucket(vehicle)].push(vehicle);

		// Ascending by vehicle number, which is how a dispatcher reads a list
		// and how the game itself numbers them. Grouping by depot first meant
		// scanning two blocks to find 1051.
		for (const list of Object.values(buckets)) {
			list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
		}

		return buckets;
	});

	/** The rows in the order they are painted, which is the order the cursor walks. */
	let ordered = $derived(VEHICLE_BUCKET_ORDER.flatMap((bucket) => grouped[bucket]));

	/**
	 * The lists with something in them, in the order they are drawn.
	 *
	 * The number keys count these rather than counting all four: on a shift
	 * with no staff cars, `2` reaching past an empty heading to the third list
	 * is what somebody looking at the screen would expect, and a shortcut that
	 * lands on nothing is just a key that does not work.
	 */
	let shownBuckets = $derived(VEHICLE_BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0));

	/**
	 * Who is towing whom.
	 *
	 * The tow lives on the tow truck, so a vehicle under tow only learns about
	 * it by being looked up here. Keyed by the *towed* vehicle for that reason.
	 */
	let towedBy = $derived.by(() => {
		const map = new Map<string, DispatchVehicle>();
		for (const vehicle of room.vehicles) {
			if (vehicle.towing) map.set(vehicle.towing, vehicle);
		}
		return map;
	});

	let byId = $derived(new Map(room.vehicles.map((vehicle) => [vehicle.id, vehicle])));

	/** Only vehicles that can carry a route count towards the board's figures. */
	let passenger = $derived(room.vehicles.filter((vehicle) => vehicleBucket(vehicle) === 'NORMAL'));
	let assignedCount = $derived(
		passenger.filter((vehicle) => vehicle.route && vehicle.route !== NOTE_ROUTE).length
	);

	const lists = new ListCollapse();

	$effect(() => lists.load(group.id));

	// --- towing ----------------------------------------------------------------

	/** The service vehicle currently choosing something to tow. */
	let towPick = $state<string | null>(null);
	/** The service vehicle whose tow button is being pointed at. */
	let towHover = $state<string | null>(null);

	// A tow truck that leaves the room takes its half-finished choice with it.
	$effect(() => {
		if (towPick && !room.vehicles.some((vehicle) => vehicle.id === towPick)) towPick = null;
	});

	/** True while this vehicle is a legal target for the tow being set up. */
	function isCandidate(vehicle: DispatchVehicle): boolean {
		return (
			towPick !== null &&
			vehicleBucket(vehicle) === 'NORMAL' &&
			vehicle.id !== towPick &&
			!towedBy.has(vehicle.id)
		);
	}

	function startTowPick(serviceId: string) {
		towPick = towPick === serviceId ? null : serviceId;
	}

	async function confirmTow(targetId: string) {
		const source = towPick;
		if (!source) return;

		towPick = null;
		await patchVehicle(source, { towing: targetId });
	}

	// --- keyboard cursor rows --------------------------------------------------

	/**
	 * The controls each row has, in the order the cursor walks them.
	 *
	 * Kept here rather than inside the row so the cursor and the row cannot
	 * disagree about what exists — a cursor landing on a control a row does not
	 * draw is indistinguishable, from the keyboard, from the mode being broken.
	 */
	function cellsFor(vehicle: DispatchVehicle, bucket: VehicleBucket): NavCell[] {
		if (bucket === 'SERVICE') return ['status', 'location', 'tow', 'delete'];

		if (bucket === 'NORMAL') {
			if (towedBy.has(vehicle.id)) return ['endtow', 'delete'];
			// A vehicle carrying a written note has no solve button: the solver
			// refuses to overwrite a note, so offering it would be a button
			// that reports having done nothing.
			return vehicle.route === NOTE_ROUTE
				? ['route', 'note', 'assigned', 'delete']
				: ['route', 'solve', 'assigned', 'delete'];
		}

		// Staff cars and scenery carry no dispatch state to change.
		return ['delete'];
	}

	let navRows: NavRow[] = $derived(
		ordered.map((vehicle) => {
			const bucket = vehicleBucket(vehicle);
			return { id: vehicle.id, bucket, cells: cellsFor(vehicle, bucket) };
		})
	);

	const nav = new DispatchNav();

	// A vehicle leaving the room, or a row's controls changing under the
	// cursor, must not strand it on something that is no longer there.
	$effect(() => {
		nav.clamp(navRows);
	});

	/**
	 * Walking into a folded list opens it.
	 *
	 * Only on the way in, though: reacting to the cursor merely *being* there
	 * made a list the cursor sat in impossible to fold, because the click that
	 * folded it re-ran this and opened it again.
	 */
	let cursorWasOn = -1;

	$effect(() => {
		if (!nav.enabled) {
			cursorWasOn = -1;
			return;
		}

		const row = nav.row;
		if (row === cursorWasOn) return;
		cursorWasOn = row;

		untrack(() => {
			const bucket = navRows[row]?.bucket;
			if (bucket) lists.open(bucket);
		});
	});

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

	/**
	 * Choosing from the route dropdown.
	 *
	 * "Custom note" is a value in the same list because it occupies the same
	 * place in a dispatcher's head — it is what this vehicle has been told to
	 * do — and it lands in the same field, so the solver leaves it alone
	 * without needing to be told about notes separately.
	 */
	function setRoute(vehicle: DispatchVehicle, next: string) {
		if (next === NOTE_ROUTE) {
			patchVehicle(vehicle.id, { route: NOTE_ROUTE });
			return;
		}

		patchVehicle(vehicle.id, { route: next === '' ? null : next });
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

		setBusy(vehicle.id, true);
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
			toasts.success(`${vehicle.id} → ${named?.name ?? assignment.route}`);
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not assign a route to that vehicle'));
		} finally {
			setBusy(vehicle.id, false);
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

	let importOpen = $state(false);

	// --- keyboard --------------------------------------------------------------

	function onKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		const typing =
			target &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

		// Backing out of a half-finished tow comes before everything else: it
		// is the one mode the board can be in where other keys would act on the
		// wrong thing.
		if (event.key === 'Escape' && towPick) {
			event.preventDefault();
			towPick = null;
			return;
		}

		// Backslash sits outside every text field's alphabet and next to Enter,
		// so it can toggle the cursor without stealing a character.
		if (event.key === '\\' && !typing) {
			event.preventDefault();
			nav.toggle(navRows);
			return;
		}

		// The lists are numbered as they are drawn, counting only the ones on
		// screen — the heading a shortcut lands on is the nth heading you can
		// see, not the nth that could exist.
		if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
			const digit = Number(event.key);
			if (digit >= 1 && digit <= shownBuckets.length) {
				event.preventDefault();
				jumpToList(shownBuckets[digit - 1]!);
				return;
			}

			if (event.key === '[' || event.key === ']') {
				event.preventDefault();
				stepList(event.key === ']' ? 1 : -1);
				return;
			}
		}

		if (nav.handle(event, navRows, Boolean(typing))) {
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

	function jumpToList(bucket: VehicleBucket) {
		lists.open(bucket);
		if (!nav.jumpTo(navRows, bucket)) {
			// Nothing to put a cursor on, but the heading still tells the story.
			nav.exit();
		}
	}

	/** The next or previous list that actually has something in it. */
	function stepList(direction: 1 | -1) {
		const current = nav.bucket(navRows);
		const from = current ? VEHICLE_BUCKET_ORDER.indexOf(current) : direction > 0 ? -1 : 0;

		const count = VEHICLE_BUCKET_ORDER.length;

		for (let step = 1; step <= count; step += 1) {
			const index = (((from + direction * step) % count) + count) % count;
			const bucket = VEHICLE_BUCKET_ORDER[index]!;
			if (grouped[bucket].length > 0) {
				jumpToList(bucket);
				return;
			}
		}
	}

</script>

<svelte:window onkeydown={onKeydown} />

<PageHeader title="Dispatch" description="Assign routes together, in real time.">
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
				<IconPlayerStop size={16} /> Close room
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
	<DispatchToolbar
		bind:search
		bind:searchInput
		{solving}
		tracked={room.vehicles.length}
		assigned={assignedCount}
		routable={passenger.length}
		matching={search ? filtered.length : null}
		navEnabled={nav.enabled}
		onimport={() => (importOpen = true)}
		onsolve={solve}
	/>

	{#if towPick}
		<div
			class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-tow bg-tow/10 px-3 py-2
				text-sm text-text"
		>
			<span>
				Pick the vehicle <span class="font-mono font-semibold">{towPick}</span> is towing.
			</span>
			<button
				type="button"
				onclick={() => (towPick = null)}
				class="ml-auto inline-flex items-center gap-2 rounded-md border border-border-base
					px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-danger
					hover:text-danger"
			>
				Cancel <kbd>Esc</kbd>
			</button>
		</div>
	{/if}

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
			{#each shownBuckets as bucket, index (bucket)}
				{@const vehicles = grouped[bucket]}
				<VehicleSection
					label={VEHICLE_BUCKET_LABELS[bucket]}
					count={vehicles.length}
					open={!lists.closed[bucket]}
					shortcut={index + 1}
					ontoggle={() => lists.toggle(bucket)}
				>
					{#each vehicles as vehicle (vehicle.id)}
						{@const row = ordered.indexOf(vehicle)}
						{@const tower = towedBy.get(vehicle.id) ?? null}
						<VehicleRow
							{vehicle}
							{bucket}
							routes={data.routes}
							owner={owners.profiles[vehicle.ownerId]}
							busy={Boolean(busyIds[vehicle.id])}
							navActive={nav.enabled && nav.row === row}
							navCell={nav.enabled && nav.row === row ? nav.cell : null}
							towedBy={tower}
							towing={vehicle.towing ? (byId.get(vehicle.towing) ?? null) : null}
							selecting={isCandidate(vehicle)}
							dimmed={towPick !== null && !isCandidate(vehicle) && vehicle.id !== towPick}
							highlighted={towHover !== null && tower?.id === towHover}
							onroute={(next) => setRoute(vehicle, next)}
							onnote={(note) => patchVehicle(vehicle.id, { note })}
							onassigned={(value) => patchVehicle(vehicle.id, { assigned: value })}
							onsolve={() => solveVehicle(vehicle)}
							onstatus={(status: ServiceStatus) => patchVehicle(vehicle.id, { status })}
							onlocation={(location) => patchVehicle(vehicle.id, { location })}
							ontowpick={() => startTowPick(vehicle.id)}
							ontowend={() =>
								// From the casualty's row it is the tow truck that has to be
								// told; from the truck's own row that is this vehicle.
								patchVehicle(tower ? tower.id : vehicle.id, { towing: null })}
							onselect={() => confirmTow(vehicle.id)}
							ontowhover={(hovering) => (towHover = hovering ? vehicle.id : null)}
							ondelete={() => deleteVehicle(vehicle.id)}
						/>
					{/each}
				</VehicleSection>
			{/each}
		</div>
	{/if}

	<PresenceModal bind:open={presenceOpen} {roomId} present={room.presence} />
{/if}

<ImportVehiclesModal bind:open={importOpen} {roomId} />

<style>
	kbd {
		border: 1px solid var(--color-border-base);
		border-radius: 0.25rem;
		padding: 0.05rem 0.3rem;
		font-family: inherit;
		font-size: 0.9em;
		line-height: 1.3;
	}
</style>
