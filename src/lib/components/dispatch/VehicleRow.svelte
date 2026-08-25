<script lang="ts">
	import { IconAlertTriangle, IconBolt, IconTrash, IconTruck } from '@tabler/icons-svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import LiveTextInput from './LiveTextInput.svelte';
	import type { NavCell } from './keyboardNav.svelte';
	import {
		NOTE_ROUTE,
		SERVICE_STATUS_COLORS,
		SERVICE_STATUS_LABELS,
		SERVICE_STATUS_ORDER,
		type DispatchVehicle,
		type RouteRecord,
		type ServiceStatus,
		type VehicleBucket
	} from '$lib/api/types';

	interface OwnerProfile {
		displayName: string | null;
		username: string | null;
		avatar: string | null;
	}

	interface Props {
		vehicle: DispatchVehicle;
		bucket: VehicleBucket;
		routes: RouteRecord[];
		owner?: OwnerProfile;
		busy: boolean;
		navActive: boolean;
		navCell: NavCell | null;
		/** The service vehicle towing this one, if any. */
		towedBy?: DispatchVehicle | null;
		/** The vehicle this service vehicle is towing, if any. */
		towing?: DispatchVehicle | null;
		/** True while a tow is being picked and this vehicle is a candidate. */
		selecting?: boolean;
		/** True while a tow is being picked somewhere else on the board. */
		dimmed?: boolean;
		/** Lit up as the other end of a tow somebody is pointing at. */
		highlighted?: boolean;
		/** The chosen dropdown value: a route id, the note marker, or empty. */
		onroute: (value: string) => void;
		onnote: (note: string) => void;
		onassigned: (value: boolean) => void;
		/** Run the solver for this one vehicle, in place. */
		onsolve: () => void;
		onstatus: (status: ServiceStatus) => void;
		onlocation: (location: string) => void;
		/** Start (or cancel) picking something for this vehicle to tow. */
		ontowpick: () => void;
		ontowend: () => void;
		/** Choose this vehicle as the tow target. */
		onselect: () => void;
		ontowhover: (hovering: boolean) => void;
		ondelete: () => void;
	}

	let {
		vehicle,
		bucket,
		routes,
		owner,
		busy,
		navActive,
		navCell,
		towedBy = null,
		towing = null,
		selecting = false,
		dimmed = false,
		highlighted = false,
		onroute,
		onnote,
		onassigned,
		onsolve,
		onstatus,
		onlocation,
		ontowpick,
		ontowend,
		onselect,
		ontowhover,
		ondelete
	}: Props = $props();

	let matched = $derived(routes.find((route) => route.id === vehicle.route));
	let noted = $derived(vehicle.route === NOTE_ROUTE);

	/** A route id, the note marker, a legacy literal, or nothing at all. */
	let selectValue = $derived(
		vehicle.route === null ? '' : matched || noted ? vehicle.route : '__literal__'
	);

	/**
	 * A route assigned to a vehicle its depot cannot reach.
	 *
	 * The solver never produces this, but a dispatcher picking from the list by
	 * hand easily can — putting a Cat Island vehicle on a Main Island route
	 * strands the driver. A route linked to no depots serves all of them, and a
	 * vehicle whose spawn we could not resolve is not held against anything.
	 */
	let mismatch = $derived(
		Boolean(
			vehicle.depotId &&
				matched &&
				matched.depots.length > 0 &&
				!matched.depots.includes(vehicle.depotId)
		)
	);

	function servesDepot(route: RouteRecord): boolean {
		if (!vehicle.depotId || route.depots.length === 0) return true;
		return route.depots.includes(vehicle.depotId);
	}

	let routeOptions = $derived([
		{ value: '', label: 'Unassigned' },
		{ value: NOTE_ROUTE, label: 'Custom note', dot: 'note' as const },
		...(selectValue === '__literal__'
			? [{ value: '__literal__', label: vehicle.route ?? '', disabled: true }]
			: []),
		...routes.map((route) => ({
			value: route.id,
			label: route.name,
			color: route.color,
			hint: servesDepot(route) ? undefined : 'other depot'
		}))
	]);

	let statusOptions = $derived(
		SERVICE_STATUS_ORDER.map((status) => ({
			value: status,
			label: SERVICE_STATUS_LABELS[status],
			color: SERVICE_STATUS_COLORS[status]
		}))
	);

	// --- keyboard cursor -------------------------------------------------------

	let rowElement = $state<HTMLDivElement | null>(null);

	// Every cell starts as an explicit null: `bind:` refuses an undefined
	// initial value, so a sparse record throws the moment a row renders.
	let refs = $state<Record<NavCell, HTMLElement | null>>({
		route: null,
		note: null,
		assigned: null,
		solve: null,
		status: null,
		location: null,
		tow: null,
		endtow: null,
		delete: null
	});

	// Focus is moved for real, so Enter, Space and a control's own arrow keys
	// behave the way the browser already defines them.
	$effect(() => {
		if (!navActive) return;

		const target = navCell ? refs[navCell] : rowElement;
		if (!target || document.activeElement === target) return;

		target.focus({ preventScroll: true });
		target.scrollIntoView({ block: 'nearest' });
	});

	// The ring is driven by state rather than :focus-visible, because focus here
	// is moved programmatically and the browser's heuristic for "was that the
	// keyboard?" is not something to rely on for the only cursor on screen.
	let ring = $derived((cell: NavCell) =>
		navActive && navCell === cell ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : ''
	);

	let towed = $derived(Boolean(towedBy));

	/*
	 * Controls stay live while a change is in flight.
	 *
	 * Disabling them was the obvious way to show that, and it silently broke
	 * the keyboard: the browser blurs an element the moment it is disabled, so
	 * choosing a route with the keyboard dropped focus onto the document and
	 * the next key went nowhere. The row already dims, the change is applied
	 * optimistically, and the last write wins — so `busy` says what is
	 * happening without taking the control away. Removal is the exception,
	 * because a second press of it is not the same request twice.
	 */
</script>

<!--
	The cursor and a tow both want to mark a row, and for a while they marked it
	the same way — the cursor's accent and a plain blue are near neighbours, so
	during a pick you could not tell which signal you were looking at. They now
	differ in hue *and* in kind: a tow candidate is a dashed cyan border, the
	cursor is a ring outside it. Both can be on one row and still be read apart.
-->
<div
	bind:this={rowElement}
	role="row"
	tabindex="-1"
	onclick={selecting ? onselect : undefined}
	onkeydown={(event) => {
		if (!selecting || (event.key !== 'Enter' && event.key !== ' ')) return;
		// The board's cursor would otherwise read Enter as "go into this row".
		event.preventDefault();
		event.stopPropagation();
		onselect();
	}}
	class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 transition-colors
		outline-none
		{selecting
		? 'cursor-pointer border-dashed border-tow bg-tow/15 hover:bg-tow/25'
		: highlighted
			? 'border-dashed border-tow bg-tow/10'
			: navActive && navCell === null
				? 'border-transparent bg-accent/5'
				: 'border-transparent hover:bg-background-secondary/60'}
		{navActive ? (navCell === null ? 'ring-2 ring-accent' : 'ring-1 ring-accent/40') : ''}
		{dimmed ? 'opacity-40' : ''}
		{busy ? 'opacity-60' : ''}"
>
	<!-- The number leads: it is what everything else on the board refers back to. -->
	<span class="w-12 shrink-0 font-mono text-sm font-semibold text-text tabular-nums">
		{vehicle.id}
	</span>

	<!--
		The driver is what a dispatcher is actually looking for, so it leads.
		The vehicle model sits underneath as supporting detail.
	-->
	<div class="min-w-40 flex-1">
		<div class="flex items-center gap-1.5">
			{#if bucket === 'DECORATIVE'}
				<span class="truncate text-sm font-medium text-text-muted">Scenery</span>
			{:else}
				<Avatar src={owner?.avatar} name={owner?.displayName ?? owner?.username} size={16} />
				<span class="truncate text-sm font-medium text-text">
					{owner?.displayName ?? owner?.username ?? `Owner ${vehicle.ownerId}`}
				</span>
			{/if}
		</div>
		<span class="block truncate text-xs text-text-subtle">
			{vehicle.name}{#if vehicle.depot}&nbsp;· {vehicle.depot}{/if}
		</span>
	</div>

	{#if bucket === 'NORMAL'}
		<div
			class="relative order-last flex min-w-0 basis-full flex-wrap items-center gap-2
				sm:order-none sm:flex-none sm:basis-[26rem]
				{towed ? 'min-h-9' : ''}"
		>
			<!--
				Under tow the controls stay on screen but stop working: a
				dispatcher needs to see what this vehicle was doing before it
				broke down, and needs to be told why they cannot change it.
			-->
			<div
				class="flex min-w-0 flex-1 flex-wrap items-center gap-2 {towed
					? 'pointer-events-none opacity-30'
					: ''} {selecting ? 'pointer-events-none' : ''}"
				aria-hidden={towed}
			>
				{#if noted}
					<span class="note-dot shrink-0" title="Custom note"></span>
				{:else if vehicle.route}
					<RouteBadge
						label={matched?.name ?? vehicle.route}
						color={matched?.color ?? '#8a8a8a'}
						textColor={matched?.textColor}
						shape={matched?.shape ?? 'AUTO'}
						icon={matched?.icon}
						size="xs"
					/>
				{/if}

				<CustomSelect
					bind:element={refs.route}
					value={selectValue}
					options={routeOptions}
					disabled={towed}
					size="sm"
					invalid={mismatch}
					ariaLabel="Route for vehicle {vehicle.id}"
					title={mismatch
						? `${matched?.name} does not run from ${vehicle.depot}`
						: `Route for vehicle ${vehicle.id}`}
					class="min-w-28 flex-1"
					onchange={onroute}
				/>

				{#if noted}
					<LiveTextInput
						bind:element={refs.note}
						value={vehicle.note}
						disabled={towed}
						placeholder="What have you told them?"
						ariaLabel="Note for vehicle {vehicle.id}"
						maxlength={200}
						class="w-full sm:w-40"
						onsave={onnote}
					/>
				{/if}

				{#if mismatch}
					<span
						class="shrink-0 text-danger"
						title="{matched?.name} does not run from {vehicle.depot}"
						aria-label="{matched?.name} does not run from {vehicle.depot}"
					>
						<IconAlertTriangle size={15} />
					</span>
				{/if}

				{#if !noted}
					<!--
						Solving one vehicle from its own row. The board-wide
						button leaves anything already routed alone, which is
						exactly the vehicle a dispatcher wants to re-place when
						a driver swaps or a route fills up.
					-->
					<button
						bind:this={refs.solve}
						type="button"
						disabled={towed}
						title="Assign a route automatically"
						aria-label="Assign a route automatically to vehicle {vehicle.id}"
						onclick={onsolve}
						class="shrink-0 rounded-md border border-border-base p-1.5 text-text-subtle
							transition-colors hover:border-accent hover:text-accent disabled:opacity-50
							{ring('solve')}"
					>
						<IconBolt size={15} />
					</button>
				{/if}

				<button
					bind:this={refs.assigned}
					type="button"
					disabled={towed}
					aria-pressed={vehicle.assigned}
					title="Assigned"
					onclick={() => onassigned(!vehicle.assigned)}
					class="shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition-colors
						disabled:opacity-50
						{vehicle.assigned
						? 'border-success/40 bg-success/15 text-success'
						: 'border-border-base text-text-subtle hover:text-text'} {ring('assigned')}"
				>
					Assigned
				</button>
			</div>

			{#if towedBy}
				<div
					class="absolute inset-0 flex items-center justify-between gap-3 rounded-md border
						border-dashed border-tow/50 bg-surface/80 px-2.5 backdrop-blur-[1px]"
				>
					<span class="flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
						<IconTruck size={14} class="shrink-0 text-tow" />
						<span class="truncate">
							<span class="font-mono font-semibold text-text">{towedBy.id}</span> is towing this
							vehicle
						</span>
					</span>

					<button
						bind:this={refs.endtow}
						type="button"
						onclick={ontowend}
						class="shrink-0 rounded-md border border-border-base px-2.5 py-1 text-xs
							font-medium whitespace-nowrap text-text-muted transition-colors
							hover:border-danger hover:text-danger disabled:opacity-50 {ring('endtow')}"
					>
						End tow
					</button>
				</div>
			{/if}
		</div>
	{:else if bucket === 'SERVICE'}
		<div
			class="order-last flex min-w-0 basis-full flex-wrap items-center gap-2
				sm:order-none sm:flex-none sm:basis-[26rem]"
		>
			<CustomSelect
				bind:element={refs.status}
				value={vehicle.status}
				options={statusOptions}
				size="sm"
				ariaLabel="Status for vehicle {vehicle.id}"
				class="min-w-32 flex-1"
				onchange={onstatus}
			/>

			<LiveTextInput
				bind:element={refs.location}
				value={vehicle.location}
				placeholder="Location"
				ariaLabel="Location of vehicle {vehicle.id}"
				class="min-w-28 flex-1"
				onsave={onlocation}
			/>

			<button
				bind:this={refs.tow}
				type="button"
				aria-pressed={Boolean(vehicle.towing) || selecting}
				title={towing
					? `Towing ${towing.id} — press to end the tow`
					: selecting
						? 'Pick a vehicle to tow, or press again to cancel'
						: 'Tow a vehicle'}
				onclick={() => (vehicle.towing ? ontowend() : ontowpick())}
				onmouseenter={() => ontowhover(true)}
				onmouseleave={() => ontowhover(false)}
				onfocus={() => ontowhover(true)}
				onblur={() => ontowhover(false)}
				class="flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 text-xs font-medium
					transition-colors disabled:opacity-50
					{vehicle.towing || selecting
					? 'border-tow bg-tow/15 text-tow'
					: 'border-border-base text-text-subtle hover:text-text'} {ring('tow')}"
			>
				<IconTruck size={15} />
				{#if vehicle.towing}
					<span class="font-mono tabular-nums">{vehicle.towing}</span>
				{/if}
			</button>
		</div>
	{/if}

	<button
		bind:this={refs.delete}
		type="button"
		disabled={busy}
		aria-label="Remove vehicle {vehicle.id}"
		onclick={ondelete}
		class="ml-auto shrink-0 rounded-md p-1.5 text-text-subtle transition-colors hover:text-danger
			disabled:opacity-50 {selecting ? 'pointer-events-none' : ''} {ring('delete')}"
	>
		<IconTrash size={15} />
	</button>
</div>

<style>
	/* The mark for a written note, matching the one in the dropdown. */
	.note-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
		background: #a371f7;
		box-shadow:
			0 0 0 2px rgb(163 113 247 / 0.25),
			0 0 8px 1px rgb(163 113 247 / 0.65);
	}
</style>
