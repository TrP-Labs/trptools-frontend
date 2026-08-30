<script lang="ts">
	/**
	 * Dispatch for one person, with no group behind it.
	 *
	 * The board is the same component the group dashboard draws — same lists,
	 * same rows, same keyboard cursor — wrapped in nothing instead of in a live
	 * room. The vehicles are kept in this browser, the routes and depots are
	 * the ones the game ships with, and there is nothing to set up first.
	 *
	 * What it cannot do is the point of the banner: a group gets its own routes
	 * and depots, several dispatchers in one room, shifts, and a board that
	 * survives the browser it was opened in.
	 */
	import { onMount } from 'svelte';
	import { IconInfoCircle, IconTrash, IconX } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DispatchBoard from '$lib/components/dispatch/DispatchBoard.svelte';
	import ImportVehiclesModal from '$lib/components/dispatch/ImportVehiclesModal.svelte';
	import { LocalDispatchBoard } from '$lib/stores/localDispatch.svelte';
	import { OwnerDirectory } from '$lib/stores/owners.svelte';
	import { routePreferences } from '$lib/stores/routePreferences.svelte';
	import { errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { DriverPreference } from '$lib/stores/driverPreferences.svelte';
	import type { DispatchVehicle } from '$lib/api/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	const board = new LocalDispatchBoard();

	$effect(() => board.restore(data.routes));

	/**
	 * Names and avatars for the ids the game reports.
	 *
	 * Only when somebody is signed in: resolving a Roblox id goes through the
	 * API on our credentials and is refused to anonymous callers, so asking
	 * anyway would put a failed request in the console of every visitor and
	 * still leave the ids on screen.
	 */
	const owners = new OwnerDirectory();

	$effect(() => {
		if (!data.user) return;
		owners.resolve(board.vehicles.map((vehicle) => vehicle.ownerId));
	});

	/**
	 * The signed-in person's own marks, against these routes.
	 *
	 * Only the built-in routes run here and those are marked for every group
	 * at once, so the answers given on a group's pages are the answers that
	 * apply — the store already holds them by name. Nobody else's marks are
	 * fetched: a personal board is not a reason to publish what other drivers
	 * have asked for, and the solver on the server applies the same rule.
	 */
	let preferences = $derived.by(() => {
		const robloxId = data.user?.robloxId;
		if (!robloxId) return {};

		const mine: DriverPreference = { favorite: [], disliked: [] };

		for (const route of data.routes) {
			const mark = routePreferences.get({ id: route.id, name: route.name, builtIn: true });
			if (mark === 'FAVORITE') mine.favorite.push(route.id);
			else if (mark === 'DISLIKE') mine.disliked.push(route.id);
		}

		return { [String(robloxId)]: mine } as Record<string, DriverPreference>;
	});

	$effect(() => {
		if (data.user) routePreferences.load();
	});

	// --- the banner ------------------------------------------------------------

	const BANNER_KEY = 'trptools:tools:dispatch:banner';

	// Hidden until we know, so a visitor who dismissed it last week does not
	// watch it appear and vanish on every load.
	let bannerOpen = $state(false);

	onMount(() => {
		try {
			bannerOpen = localStorage.getItem(BANNER_KEY) !== 'dismissed';
		} catch {
			// A browser refusing storage gets the banner every time, which is
			// the harmless way round.
			bannerOpen = true;
		}
	});

	function dismissBanner() {
		bannerOpen = false;
		try {
			localStorage.setItem(BANNER_KEY, 'dismissed');
		} catch {
			// Nothing to do; it comes back next visit.
		}
	}

	// --- actions ---------------------------------------------------------------

	let importOpen = $state(false);

	async function solve(includeAssigned: boolean) {
		board.solving = true;
		try {
			const result = await board.solve({ includeAssigned });

			if (result.solved === 0 && result.skipped > 0) {
				toasts.error(
					`Nothing could be assigned. ${result.skipped} ${
						result.skipped === 1 ? 'vehicle has' : 'vehicles have'
					} no route serving their depot.`
				);
			} else {
				toasts.success(
					`Assigned ${result.solved} ${result.solved === 1 ? 'vehicle' : 'vehicles'}` +
						(result.skipped ? `, skipped ${result.skipped}` : '')
				);
			}
		} catch (error) {
			toasts.error(errorMessage(error, m.tools_dispatch_could_not_solve_routes()));
		} finally {
			board.solving = false;
		}
	}

	/**
	 * Placing one vehicle, against the whole board.
	 *
	 * `includeAssigned` is on for the same reason it is in a room: this button
	 * exists for the vehicle that already has a route.
	 */
	async function solveVehicle(vehicle: DispatchVehicle) {
		try {
			const result = await board.solve({ includeAssigned: true, vehicleIds: [vehicle.id] });
			const [assignment] = result.assignments;

			if (!assignment?.route) {
				toasts.error(
					`Nothing to give ${vehicle.id} — no route serves ${vehicle.depot || 'its depot'}.`
				);
				return;
			}

			const named = data.routes.find((route) => route.id === assignment.route);
			toasts.success(m.common_vehicle_assigned({ vehicle: vehicle.id, route: named?.name ?? assignment.route }));
		} catch (error) {
			toasts.error(errorMessage(error, m.tools_dispatch_could_not_assign_route_vehicle()));
		}
	}

	function clearBoard() {
		if (!confirm(m.tools_dispatch_remove_every_vehicle_confirm())) return;
		board.clear();
	}
</script>

<svelte:head>
	<title>{m.tools_dispatch_dispatch_trp_tools()}</title>
	<meta
		name="description"
		content="Assign the game's routes to a vehicle list on your own, with no group to set up."
	/>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
	{#if bannerOpen}
		<div
			class="mb-6 flex flex-wrap items-start gap-3 rounded-lg border border-accent/40 bg-accent/10
				px-4 py-3 text-sm"
		>
			<IconInfoCircle size={18} class="mt-0.5 shrink-0 text-accent" />

			<p class="min-w-0 flex-1 text-pretty text-text-muted">
				{m.tools_dispatch_board_runs_game_s_built_routes()}
				<a href="/dashboard" class="font-medium text-accent hover:underline">{m.tools_dispatch_create_group()}</a>
				{m.tools_dispatch_full_version_own_routes_depots_several()}
			</p>

			<button
				type="button"
				onclick={dismissBanner}
				aria-label={m.tools_dispatch_dismiss_notice()}
				title={m.tools_dispatch_dismiss_notice()}
				class="shrink-0 rounded-md p-1 text-text-subtle transition-colors hover:bg-background-muted
					hover:text-text"
			>
				<IconX size={16} />
			</button>
		</div>
	{/if}

	<PageHeader
		title={m.common_dispatch()}
		description={m.tools_dispatch_paste_vehicle_list_assign_game_s()}
	>
		{#snippet actions()}
			{#if board.vehicles.length > 0}
				<Button variant="secondary" onclick={clearBoard}>
					<IconTrash size={16} /> {m.tools_dispatch_clear_board()}
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<DispatchBoard
		vehicles={board.vehicles}
		routes={data.routes}
		owners={owners.profiles}
		{preferences}
		collapseKey="tools"
		solving={board.solving}
		onpatch={(id, patch) => board.patch(id, patch)}
		ondelete={(id) => board.remove(id)}
		onsolve={solve}
		onsolveone={solveVehicle}
		onimport={() => (importOpen = true)}
	/>
</div>

<ImportVehiclesModal bind:open={importOpen} onsubmit={(vehicles) => board.import(vehicles)} />
