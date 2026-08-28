<script lang="ts">
	/**
	 * The dispatch board itself: search, the lists, the rows, tows, the
	 * keyboard cursor and the two solve buttons.
	 *
	 * Everything here is true of a board wherever it is drawn, which is why it
	 * is a component rather than a page. The group dashboard wraps it in a
	 * live room — several dispatchers, presence, a shift to count down to —
	 * and `/tools/dispatch` wraps it in nothing at all, keeping the vehicles in
	 * the browser. Neither of those differences reaches inside this file: it is
	 * handed a list of vehicles and a set of operations, and the *page* decides
	 * whether an operation means a request to a room or a change in memory.
	 *
	 * Operations are awaited so the row can dim while one is in flight, and
	 * each page reports its own failures — a room has somewhere for a rejected
	 * change to come back from, a local board does not.
	 */
	import { untrack } from 'svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { IconClipboardText } from '@tabler/icons-svelte';
	import VehicleRow from './VehicleRow.svelte';
	import VehicleSection from './VehicleSection.svelte';
	import DispatchToolbar from './DispatchToolbar.svelte';
	import { DispatchNav, type NavCell, type NavRow } from './keyboardNav.svelte';
	import { ListCollapse } from './listCollapse.svelte';
	import type { OwnerProfile } from '$lib/stores/owners.svelte';
	import type { DriverPreference } from '$lib/stores/driverPreferences.svelte';
	import {
		NOTE_ROUTE,
		VEHICLE_BUCKET_LABELS,
		VEHICLE_BUCKET_ORDER,
		vehicleBucket,
		type BoardRoute,
		type DispatchVehicle,
		type ServiceStatus,
		type VehicleBucket
	} from '$lib/api/types';

	interface Props {
		vehicles: DispatchVehicle[];
		routes: BoardRoute[];
		/** Roblox id → the person behind it, for the row's name and avatar. */
		owners?: Record<string, OwnerProfile>;
		/** Roblox id → the routes that driver asked for, and the ones they did not. */
		preferences?: Record<string, DriverPreference>;
		/** Where the folded-list state is remembered, per board. */
		collapseKey: string;
		/** True while a board-wide solve is running. */
		solving?: boolean;
		/** Applies a change to one vehicle. Resolving is what un-dims the row. */
		onpatch: (id: string, patch: Partial<DispatchVehicle>) => Promise<void> | void;
		ondelete: (id: string) => Promise<void> | void;
		onsolve: (includeAssigned: boolean) => Promise<void> | void;
		/** The bolt on one row: place this vehicle against the whole board. */
		onsolveone: (vehicle: DispatchVehicle) => Promise<void> | void;
		/** Open whatever this board imports vehicles with. */
		onimport: () => void;
	}

	let {
		vehicles,
		routes,
		owners = {},
		preferences = {},
		collapseKey,
		solving = false,
		onpatch,
		ondelete,
		onsolve,
		onsolveone,
		onimport
	}: Props = $props();

	// --- filtering and grouping ------------------------------------------------

	let search = $state('');
	let busyIds = $state<Record<string, boolean>>({});
	let searchInput = $state<HTMLInputElement | null>(null);

	let filtered = $derived.by(() => {
		const term = search.trim().toLowerCase();
		if (!term) return vehicles;

		return vehicles.filter((vehicle) => {
			const owner = owners[vehicle.ownerId];
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
		for (const vehicle of vehicles) {
			if (vehicle.towing) map.set(vehicle.towing, vehicle);
		}
		return map;
	});

	let byId = $derived(new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])));

	/** Only vehicles that can carry a route count towards the board's figures. */
	let passenger = $derived(vehicles.filter((vehicle) => vehicleBucket(vehicle) === 'NORMAL'));
	let assignedCount = $derived(
		passenger.filter((vehicle) => vehicle.route && vehicle.route !== NOTE_ROUTE).length
	);

	const lists = new ListCollapse();

	$effect(() => lists.load(collapseKey));

	// --- towing ----------------------------------------------------------------

	/** The service vehicle currently choosing something to tow. */
	let towPick = $state<string | null>(null);
	/** The service vehicle whose tow button is being pointed at. */
	let towHover = $state<string | null>(null);

	// A tow truck that leaves the board takes its half-finished choice with it.
	$effect(() => {
		if (towPick && !vehicles.some((vehicle) => vehicle.id === towPick)) towPick = null;
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

	// A vehicle leaving the board, or a row's controls changing under the
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
		busyIds = value
			? { ...busyIds, [id]: true }
			: Object.fromEntries(Object.entries(busyIds).filter(([key]) => key !== id));
	}

	/**
	 * Controls stay live while a change is in flight — see the note in
	 * `VehicleRow`. `busy` only dims the row and guards a second removal.
	 */
	async function patchVehicle(id: string, patch: Partial<DispatchVehicle>) {
		setBusy(id, true);
		try {
			await onpatch(id, patch);
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

	async function removeVehicle(id: string) {
		setBusy(id, true);
		try {
			await ondelete(id);
		} finally {
			setBusy(id, false);
		}
	}

	async function solveVehicle(vehicle: DispatchVehicle) {
		setBusy(vehicle.id, true);
		try {
			await onsolveone(vehicle);
		} finally {
			setBusy(vehicle.id, false);
		}
	}

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

<DispatchToolbar
	bind:search
	bind:searchInput
	{solving}
	tracked={vehicles.length}
	assigned={assignedCount}
	routable={passenger.length}
	matching={search ? filtered.length : null}
	navEnabled={nav.enabled}
	{onimport}
	{onsolve}
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

{#if vehicles.length === 0}
	<EmptyState
		title="No vehicles yet"
		description="Paste the vehicle list from the game to start dispatching."
	>
		{#snippet action()}
			<Button onclick={onimport}>
				<IconClipboardText size={16} /> Import vehicles
			</Button>
		{/snippet}
	</EmptyState>
{:else}
	<div class="space-y-6">
		{#each shownBuckets as bucket, index (bucket)}
			{@const list = grouped[bucket]}
			<VehicleSection
				label={VEHICLE_BUCKET_LABELS[bucket]}
				count={list.length}
				open={!lists.closed[bucket]}
				shortcut={index + 1}
				ontoggle={() => lists.toggle(bucket)}
			>
				{#each list as vehicle (vehicle.id)}
					{@const row = ordered.indexOf(vehicle)}
					{@const tower = towedBy.get(vehicle.id) ?? null}
					<VehicleRow
						{vehicle}
						{bucket}
						{routes}
						owner={owners[vehicle.ownerId]}
						preference={preferences[vehicle.ownerId]}
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
						ondelete={() => removeVehicle(vehicle.id)}
					/>
				{/each}
			</VehicleSection>
		{/each}
	</div>
{/if}

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
