<script lang="ts">
	/**
	 * What the game says about one vehicle, beside the route a dispatcher chose.
	 *
	 * On a board a hosted server is feeding, the manual "assigned" tick is
	 * replaced by the truth: whether the game's dispatch tablet holds a route,
	 * whether the tablet is in the vehicle at all, and the route the driver has
	 * actually set. None of them are buttons — the game owns all three.
	 */
	import { IconDeviceTablet, IconRoute } from '@tabler/icons-svelte';
	import type { BoardRoute, DispatchVehicle } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	interface Props {
		vehicle: DispatchVehicle;
		routes: BoardRoute[];
		/** Only the driver's route, drawn beside the dropdown it is compared with. */
		part: 'route' | 'status';
	}

	let { vehicle, routes, part }: Props = $props();

	function byGameName(text: string) {
		return routes.find((route) => route.name === text)
			?? routes.find((route) => route.name.toLowerCase() === text.toLowerCase());
	}

	let driving = $derived((vehicle.gameRoute ?? '').trim());
	let drivingRoute = $derived(driving ? byGameName(driving) : undefined);
	let assignedHere = $derived(routes.find((route) => route.id === vehicle.route));

	/**
	 * The driver's own route, coloured against the board.
	 *
	 * Not in service first, because nothing else about it matters until the
	 * driver picks one. A route the group never set up is purple — there is
	 * no right or wrong to say about it. Otherwise it is green when it agrees
	 * with the board and red when it does not; with nothing assigned here yet
	 * it stays neutral, or every freshly opened board would start out red.
	 */
	let routeTone = $derived.by(() => {
		if (!driving || driving.toUpperCase() === 'NIS') return 'idle';
		if (!drivingRoute) return 'unknown';
		if (!assignedHere) return 'neutral';
		return drivingRoute.id === assignedHere.id ? 'match' : 'mismatch';
	});

	let routeTitle = $derived.by(() => {
		const route = drivingRoute ? localized(drivingRoute, 'name') : driving;
		switch (routeTone) {
			case 'idle': return m.dispatch_live_route_none();
			case 'unknown': return m.dispatch_live_route_unknown({ route });
			case 'neutral': return m.dispatch_live_route_unassigned({ route });
			case 'match': return m.dispatch_live_route_matches({ route });
			default: return m.dispatch_live_route_differs({ route });
		}
	});

	let assignedTone = $derived(vehicle.command ? 'pending' : vehicle.gameAssigned ? 'held' : 'none');
	let assignedTitle = $derived(
		vehicle.command === 'QUEUED'
			? m.dispatch_live_assigned_queued()
			: vehicle.command === 'SENT'
				? m.dispatch_live_assigned_sent()
				: vehicle.gameAssigned
					? m.dispatch_live_assigned_confirmed({ route: vehicle.gameAssigned })
					: m.dispatch_live_assigned_none()
	);
</script>

{#if part === 'route'}
	<span
		class="chip route-{routeTone} shrink-0 font-mono"
		title={routeTitle}
		aria-label={routeTitle}
		data-testid="game-route"
	>
		<IconRoute size={13} class="shrink-0 opacity-70" />
		<span class="max-w-16 truncate">{driving || '—'}</span>
	</span>
{:else}
	<span
		class="chip assigned-{assignedTone} shrink-0"
		class:pulse={vehicle.command === 'SENT'}
		title={assignedTitle}
		aria-label={assignedTitle}
		data-testid="game-assigned"
	>
		{m.dispatch_vehicle_row_assigned()}
	</span>
	<span
		class="chip {vehicle.tablet ? 'tablet-on' : 'tablet-off'} shrink-0"
		title={vehicle.tablet ? m.dispatch_live_tablet_on() : m.dispatch_live_tablet_off()}
		aria-label={vehicle.tablet ? m.dispatch_live_tablet_on() : m.dispatch_live_tablet_off()}
		data-testid="game-tablet"
	>
		<IconDeviceTablet size={13} class="shrink-0" />
		{m.dispatch_live_tablet()}
	</span>
{/if}

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-base);
		padding: 0 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-subtle);
		cursor: default;
		user-select: none;
	}
	.route-idle,
	.assigned-pending {
		border-color: color-mix(in srgb, var(--color-warning) 45%, transparent);
		background: color-mix(in srgb, var(--color-warning) 16%, transparent);
		color: var(--color-warning);
	}
	.route-unknown {
		border-color: color-mix(in srgb, var(--color-note) 45%, transparent);
		background: color-mix(in srgb, var(--color-note) 16%, transparent);
		color: var(--color-note);
	}
	.route-match,
	.assigned-held,
	.tablet-on {
		border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
		background: color-mix(in srgb, var(--color-success) 15%, transparent);
		color: var(--color-success);
	}
	.route-mismatch,
	.tablet-off {
		border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
	}
	.route-neutral {
		color: var(--color-text);
	}
	.pulse {
		animation: pulse 1.4s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.55;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pulse {
			animation: none;
		}
	}
</style>
