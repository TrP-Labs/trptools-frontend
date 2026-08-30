import { browser } from '$app/environment';
import { api, errorMessage } from '$lib/api/client';
import { toasts } from '$lib/stores/toast.svelte';
import { m } from '$lib/paraglide/messages.js';

export type RoutePreference = 'FAVORITE' | 'DISLIKE';

/** Everything a button needs to identify what it is marking. */
export interface MarkableRoute {
	id: string;
	name: string;
	/** One of the routes the game ships with — the same route in every group. */
	builtIn: boolean;
}

/**
 * The signed-in person's favourite and disliked routes, held once for the tab.
 *
 * A group page can draw thirty of these buttons and a route may appear on
 * several pages at once, so the list is fetched a single time and every button
 * reads the same state — marking a route on the group page has to be visible
 * on the route's own page without a reload.
 *
 * Two indexes, because there are two kinds of answer. A custom route is marked
 * by id: that route, in that group, and nowhere else. A built-in is marked by
 * **name** and means the route itself, so favouriting route 6 on one group's
 * page lights up route 6 on every other group's page in the same tab — which
 * is exactly what the server has stored.
 *
 * Writes are optimistic. Nothing on screen depends on the round trip, and a
 * thumb that waits for the server before moving feels broken; a failure puts
 * the old value back and says so.
 */
class RoutePreferenceStore {
	/** routeId → mark, for custom routes. */
	byRoute = $state<Record<string, RoutePreference>>({});
	/** Route name → mark, for the built-in routes, in every group at once. */
	byName = $state<Record<string, RoutePreference>>({});
	/** False until the list has been fetched, so buttons can hold still. */
	loaded = $state(false);

	#requested = false;

	/**
	 * Fetches the list on first use.
	 *
	 * Called from every button rather than from a page load: the buttons are
	 * the only thing that needs it, and a signed-out visitor never triggers
	 * the request at all.
	 *
	 * Browser only. A component's script also runs during SSR, where this
	 * module is one object shared by every request being rendered — a fetch
	 * from there would be made without the caller's cookies and would put one
	 * visitor's answer where the next one's belongs.
	 */
	load() {
		if (!browser || this.#requested) return;
		this.#requested = true;

		api.users.me.routes
			.get()
			.then(({ data }) => {
				if (!data) return;

				const byRoute: Record<string, RoutePreference> = {};
				const byName: Record<string, RoutePreference> = {};

				for (const item of data) {
					if (item.global) byName[item.name] = item.preference;
					else if (item.routeId) byRoute[item.routeId] = item.preference;
				}

				this.byRoute = byRoute;
				this.byName = byName;
			})
			.catch(() => {
				// A profile with no preferences and one we could not read look
				// the same from here, and neither is worth a message.
			})
			.finally(() => {
				this.loaded = true;
			});
	}

	get(route: MarkableRoute): RoutePreference | null {
		return (route.builtIn ? this.byName[route.name] : this.byRoute[route.id]) ?? null;
	}

	async set(route: MarkableRoute, preference: RoutePreference | null) {
		const previous = this.get(route);
		if (previous === preference) return;

		this.#write(route, preference);

		try {
			// Addressed by the id of the copy the person was looking at either
			// way; the server decides that a built-in is answered for good.
			const { error } = await api.users.me
				.routes({ routeId: route.id })
				.put({ preference: preference ?? 'NONE' });
			if (error) throw error;
		} catch (error) {
			this.#write(route, previous);
			toasts.error(errorMessage(error, m.stores_routes_could_not_save_preference()));
		}
	}

	#write(route: MarkableRoute, preference: RoutePreference | null) {
		if (route.builtIn) {
			const next = { ...this.byName };
			if (preference) next[route.name] = preference;
			else delete next[route.name];
			this.byName = next;
			return;
		}

		const next = { ...this.byRoute };
		if (preference) next[route.id] = preference;
		else delete next[route.id];
		this.byRoute = next;
	}
}

export const routePreferences = new RoutePreferenceStore();
