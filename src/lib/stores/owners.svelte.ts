import { api } from '$lib/api/client';

export interface OwnerProfile {
	displayName: string | null;
	username: string | null;
	avatar: string | null;
}

/**
 * Roblox ids resolved to people.
 *
 * The game reports a vehicle's owner as a bare id, which tells a dispatcher
 * nothing. Ids are looked up in batches and never looked up twice — including
 * the ones that come back with nothing, or a room full of accounts the site
 * has never seen would ask about them again on every frame.
 *
 * Names are a nicety: a failed lookup leaves the id on screen and is not worth
 * a message.
 */
export class OwnerDirectory {
	profiles = $state<Record<string, OwnerProfile>>({});

	#asked = new Set<string>();

	/** Owner 0 is the game itself, and has no profile to find. */
	resolve(ownerIds: string[]) {
		const missing = [
			...new Set(ownerIds.filter((id) => id && id !== '0' && !this.#asked.has(id)))
		];

		if (missing.length === 0) return;
		missing.forEach((id) => this.#asked.add(id));

		api.users.roblox.resolve
			.post({ robloxIds: missing })
			.then(({ data }) => {
				if (!data) return;

				const next = { ...this.profiles };
				for (const profile of data) {
					next[profile.robloxId] = {
						displayName: profile.displayName,
						username: profile.username,
						avatar: profile.avatar
					};
				}
				this.profiles = next;
			})
			.catch(() => {
				// Ids still render.
			});
	}
}
