<script lang="ts">
	import { IconAlertTriangle, IconTrash, IconTruck } from '@tabler/icons-svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import type { NavCell } from './keyboardNav.svelte';
	import type { DispatchVehicle, RouteRecord } from '$lib/api/types';

	interface OwnerProfile {
		displayName: string | null;
		username: string | null;
		avatar: string | null;
	}

	interface Props {
		vehicle: DispatchVehicle;
		routes: RouteRecord[];
		owner?: OwnerProfile;
		busy: boolean;
		/** True when the keyboard cursor is on this vehicle. */
		navActive: boolean;
		/** Which control the cursor is on, or null while it sits on the row. */
		navCell: NavCell | null;
		onroute: (route: string | null) => void;
		ontoggle: (field: 'assigned' | 'towing', value: boolean) => void;
		ondelete: () => void;
	}

	let { vehicle, routes, owner, busy, navActive, navCell, onroute, ontoggle, ondelete }: Props =
		$props();

	let matched = $derived(routes.find((route) => route.id === vehicle.route));

	// The value is a route id, a free literal like "SV", or nothing at all.
	let selectValue = $derived(vehicle.route === null ? '' : matched ? vehicle.route : '__literal__');

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

	// --- keyboard cursor -------------------------------------------------------

	let rowElement = $state<HTMLDivElement | null>(null);
	let cells = $state<Record<NavCell, HTMLElement | null>>({
		route: null,
		assigned: null,
		towing: null,
		delete: null
	});

	// Focus is moved for real, so Enter, Space and the select's own arrow keys
	// behave the way the browser already defines them.
	$effect(() => {
		if (!navActive) return;

		const target = navCell ? cells[navCell] : rowElement;
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
</script>

<div
	bind:this={rowElement}
	role="row"
	tabindex="-1"
	class="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors
		outline-none sm:grid-cols-[5rem_minmax(0,1fr)_9rem_auto_auto]
		{navActive && navCell === null
		? 'border-accent bg-accent/5'
		: navActive
			? 'border-accent/40'
			: 'border-transparent hover:bg-background-secondary/60'}
		{busy ? 'opacity-60' : ''}"
>
	<!-- Vehicle number -->
	<span class="font-mono text-sm font-semibold text-text tabular-nums">{vehicle.id}</span>

	<!--
		The driver is what a dispatcher is actually looking for, so it leads.
		The vehicle model sits underneath as supporting detail.
	-->
	<div class="min-w-0">
		<div class="flex items-center gap-1.5">
			<Avatar src={owner?.avatar} name={owner?.displayName ?? owner?.username} size={16} />
			<span class="truncate text-sm font-medium text-text">
				{owner?.displayName ?? owner?.username ?? `Owner ${vehicle.ownerId}`}
			</span>
		</div>
		<span class="block truncate text-xs text-text-subtle">
			{vehicle.name}{#if vehicle.depot}&nbsp;· {vehicle.depot}{/if}
		</span>
	</div>

	<!-- Route -->
	<div class="col-span-3 flex items-center gap-2 sm:col-span-1">
		{#if vehicle.route}
			<RouteBadge
				label={matched?.name ?? vehicle.route}
				color={matched?.color ?? '#8a8a8a'}
				textColor={matched?.textColor}
				shape={matched?.shape ?? 'AUTO'}
				icon={matched?.icon}
				size="xs"
			/>
		{/if}

		<select
			bind:this={cells.route}
			value={selectValue}
			disabled={busy}
			aria-label="Route for vehicle {vehicle.id}"
			aria-invalid={mismatch}
			title={mismatch
				? `${matched?.name} does not run from ${vehicle.depot}`
				: `Route for vehicle ${vehicle.id}`}
			onchange={(event) => {
				const next = event.currentTarget.value;
				onroute(next === '' ? null : next);
			}}
			class="min-w-0 flex-1 rounded-md border bg-background-secondary px-2 py-1 text-xs text-text
				focus:outline-none disabled:opacity-60
				{mismatch
				? 'border-danger bg-danger/10 text-danger focus:border-danger'
				: 'border-border-base focus:border-accent'} {ring('route')}"
		>
			<option value="">Unassigned</option>
			{#if selectValue === '__literal__'}
				<option value="__literal__" disabled>{vehicle.route}</option>
			{/if}
			{#each routes as route (route.id)}
				<option value={route.id}>
					{route.name}{servesDepot(route) ? '' : ' — other depot'}
				</option>
			{/each}
		</select>

		{#if mismatch}
			<span
				class="shrink-0 text-danger"
				title="{matched?.name} does not run from {vehicle.depot}"
				aria-label="{matched?.name} does not run from {vehicle.depot}"
			>
				<IconAlertTriangle size={15} />
			</span>
		{/if}
	</div>

	<!-- Flags -->
	<div class="col-span-2 flex items-center gap-1.5 sm:col-span-1">
		<button
			bind:this={cells.assigned}
			type="button"
			disabled={busy}
			aria-pressed={vehicle.assigned}
			title="Assigned"
			onclick={() => ontoggle('assigned', !vehicle.assigned)}
			class="rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50
				{vehicle.assigned
				? 'border-success/40 bg-success/15 text-success'
				: 'border-border-base text-text-subtle hover:text-text'} {ring('assigned')}"
		>
			Assigned
		</button>

		<button
			bind:this={cells.towing}
			type="button"
			disabled={busy}
			aria-pressed={vehicle.towing}
			title="Towing"
			onclick={() => ontoggle('towing', !vehicle.towing)}
			class="rounded-md border p-1.5 transition-colors disabled:opacity-50
				{vehicle.towing
				? 'border-warning/40 bg-warning/15 text-warning'
				: 'border-border-base text-text-subtle hover:text-text'} {ring('towing')}"
		>
			<IconTruck size={15} />
		</button>
	</div>

	<button
		bind:this={cells.delete}
		type="button"
		disabled={busy}
		aria-label="Remove vehicle {vehicle.id}"
		onclick={ondelete}
		class="justify-self-end rounded-md p-1.5 text-text-subtle transition-colors hover:text-danger
			disabled:opacity-50 {ring('delete')}"
	>
		<IconTrash size={15} />
	</button>
</div>
