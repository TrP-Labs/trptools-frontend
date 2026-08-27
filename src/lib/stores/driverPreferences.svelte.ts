import { api } from '$lib/api/client';

export interface DriverPreference {
	favorite: string[];
	disliked: string[];
}

/**
 * What the drivers in a room have asked for, keyed by Roblox id.
 *
 * The same answers the solver uses, fetched once for the board so a dispatcher
 * choosing a route by hand can see them. A vehicle carries its owner's Roblox
 * id and a TrPTools account carries the same id, so a driver who has never
 * opened the dashboard still shows up here as long as they have an account.
 *
 * Refetched when the room's set of owners changes — an import brings new
 * drivers in — and not otherwise: a board with a stable crew asks once.
 */
export class DriverPreferences {
	byOwner = $state<Record<string, DriverPreference>>({});

	#signature = '';

	load(roomId: string | null, ownerIds: string[]) {
		if (!roomId) {
			this.#signature = '';
			this.byOwner = {};
			return;
		}

		// Owner "0" is the game itself — scenery has nobody's opinion on it.
		const owners = [...new Set(ownerIds.filter((id) => id && id !== '0'))].sort();
		const signature = `${roomId}|${owners.join(',')}`;
		if (signature === this.#signature) return;

		this.#signature = signature;
		if (owners.length === 0) {
			this.byOwner = {};
			return;
		}

		api
			.dispatch({ roomId })
			.preferences.get()
			.then(({ data }) => {
				if (!data) return;

				const next: Record<string, DriverPreference> = {};
				for (const entry of data) {
					next[entry.robloxId] = { favorite: entry.favorite, disliked: entry.disliked };
				}
				this.byOwner = next;
			})
			.catch(() => {
				// The board works without the colours; a failed lookup is not
				// worth interrupting a shift over.
			});
	}
}
