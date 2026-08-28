import { browser } from '$app/environment';
import { api, errorMessage } from '$lib/api/client';
import { toasts } from '$lib/stores/toast.svelte';
import { NOTE_ROUTE, type BoardRoute, type DispatchVehicle } from '$lib/api/types';

const STORAGE_KEY = 'trptools:tools:dispatch';

/**
 * A dispatch board for one person, held in the browser.
 *
 * The group board keeps its vehicles in a Redis room so several dispatchers
 * see the same thing; there is nobody else here, so a room would be a server
 * holding state for an audience of one. The vehicles live in `localStorage`
 * instead — which also means a refresh, or coming back after the shift, does
 * not throw the board away.
 *
 * The server is still asked the two questions only it can answer: which list a
 * pasted vehicle belongs in, and how to spread the board across the routes.
 * Those are the same rules the group board runs on, so what somebody learns
 * here holds when they register a group.
 */
export class LocalDispatchBoard {
	vehicles = $state<DispatchVehicle[]>([]);
	solving = $state(false);

	#routes: BoardRoute[] = [];

	/**
	 * True once the saved board has been read back, whatever was in it.
	 *
	 * A plain field rather than `$state`, and it is what stops the read: the
	 * guard used to be "are there vehicles yet", which read the same state
	 * this method writes. An empty saved board then wrote `[]`, which woke the
	 * effect, which found no vehicles and wrote `[]` again — Svelte cut it off
	 * with `effect_update_depth_exceeded` on the first load after Clear board.
	 */
	#restored = false;

	/**
	 * Reads back what was saved, and remembers the routes for naming.
	 *
	 * Safe to call from an effect — it only does anything once — and it has to
	 * be called from the browser, since `localStorage` does not exist while the
	 * page is being rendered on the server.
	 */
	restore(routes: BoardRoute[]) {
		this.#routes = routes;
		if (!browser || this.#restored) return;
		this.#restored = true;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored) as DispatchVehicle[];
			if (Array.isArray(parsed)) this.vehicles = parsed.map((vehicle) => this.#decorate(vehicle));
		} catch {
			// A board that cannot be read back is an empty board, not an error
			// worth showing somebody who has just opened the page.
		}
	}

	/**
	 * Pastes a fresh vehicle list over the board.
	 *
	 * Reconciled rather than replaced, matching the room: vehicles that have
	 * gone from the game are dropped, and the ones still there keep their
	 * route, note and everything else a dispatcher has done to them. Only the
	 * classification is re-read, so a vehicle the game renamed lands in the
	 * right list without the board being cleared.
	 */
	async import(payload: unknown[]) {
		const { data: classified, error } = await api.tools.dispatch.import.post(payload as never);
		if (!classified) throw error;

		const held = new Map(this.vehicles.map((vehicle) => [vehicle.id, vehicle]));
		const removed = this.vehicles.filter(
			(vehicle) => !classified.some((incoming) => incoming.id === vehicle.id)
		).length;

		let added = 0;

		const next = classified.map((incoming) => {
			const existing = held.get(incoming.id);
			if (existing) {
				return this.#decorate({ ...existing, ...incoming });
			}

			added += 1;
			return this.#decorate({
				...incoming,
				route: null,
				routeName: null,
				routeColor: null,
				assigned: false,
				towing: null,
				note: '',
				location: '',
				status: 'AWAITING'
			});
		});

		// A vehicle that has left takes any tow pointing at it with it, or a
		// tow truck keeps pointing at an id nothing resolves.
		const ids = new Set(next.map((vehicle) => vehicle.id));
		for (const vehicle of next) {
			if (vehicle.towing && !ids.has(vehicle.towing)) vehicle.towing = null;
		}

		this.vehicles = next;
		this.#save();

		return { added, removed, total: next.length };
	}

	patch(id: string, patch: Partial<DispatchVehicle>) {
		this.vehicles = this.vehicles.map((vehicle) =>
			vehicle.id === id ? this.#decorate({ ...vehicle, ...patch }) : vehicle
		);
		this.#save();
	}

	remove(id: string) {
		this.vehicles = this.vehicles
			.filter((vehicle) => vehicle.id !== id)
			// The removed vehicle's half of a tow goes with it.
			.map((vehicle) => (vehicle.towing === id ? { ...vehicle, towing: null } : vehicle));
		this.#save();
	}

	clear() {
		this.vehicles = [];
		this.#save();
	}

	/**
	 * Asks the server to place the board.
	 *
	 * The whole board goes up every time, because the solver spreads vehicles
	 * across routes and one it cannot see is one it would fill from empty.
	 * `vehicleIds` narrows what may move, exactly as it does in a room.
	 */
	async solve(options: { includeAssigned?: boolean; vehicleIds?: string[] } = {}) {
		const { data: result, error } = await api.tools.dispatch.solve.post({
			vehicles: this.vehicles.map((vehicle) => ({
				id: vehicle.id,
				ownerId: vehicle.ownerId,
				name: vehicle.name,
				depot: vehicle.depot,
				depotId: vehicle.depotId,
				route: vehicle.route,
				category: vehicle.category
			})),
			includeAssigned: options.includeAssigned,
			vehicleIds: options.vehicleIds
		});

		if (!result) throw error;

		const assigned = new Map(result.assignments.map((item) => [item.vehicleId, item.route]));
		this.vehicles = this.vehicles.map((vehicle) =>
			assigned.has(vehicle.id)
				? this.#decorate({ ...vehicle, route: assigned.get(vehicle.id) ?? null })
				: vehicle
		);
		this.#save();

		return result;
	}

	/** The name and colour the row draws beside the dropdown. */
	#decorate(vehicle: DispatchVehicle): DispatchVehicle {
		const matched =
			vehicle.route && vehicle.route !== NOTE_ROUTE
				? this.#routes.find((route) => route.id === vehicle.route)
				: undefined;

		return {
			...vehicle,
			routeName: matched?.name ?? null,
			routeColor: matched?.color ?? null
		};
	}

	#save() {
		if (!browser) return;

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.vehicles));
		} catch (error) {
			// A full or blocked store loses the board on refresh, which is
			// worth saying once rather than silently.
			toasts.error(errorMessage(error, 'Could not save this board in your browser'));
		}
	}
}
