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
 * nothing. Successful lookups are remembered — including
 * the ones that come back with nothing, or a room full of accounts the site
 * has never seen would ask about them again on every frame.
 *
 * Names are a nicety: a failed lookup leaves the id on screen, with retries
 * delayed so incoming frames cannot hammer an unavailable API.
 */
export class OwnerDirectory {
	profiles = $state<Record<string, OwnerProfile>>({});

	#asked = new Set<string>();
	#retryAt = new Map<string, number>();

	/** Owner 0 is the game itself, and has no profile to find. */
	resolve(ownerIds: string[]) {
		const missing = [
			...new Set(ownerIds.filter((id) => id && id !== '0' && !this.#asked.has(id) && (this.#retryAt.get(id) ?? 0) <= Date.now()))
		];

		if (missing.length === 0) return;
		missing.forEach((id) => this.#asked.add(id));

		// Imports accept 500 vehicles; profile resolution accepts 200 IDs.
		for (let start = 0; start < missing.length; start += 200) {
			const batch = missing.slice(start, start + 200);
			api.users.roblox.resolve
			.post({ robloxIds: batch })
			.then(({ data, error }) => {
				if (error || !data) throw error ?? new Error('Profile lookup failed');
				for (const id of batch) this.#retryAt.delete(id);

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
				for (const id of batch) {
					this.#asked.delete(id);
					this.#retryAt.set(id, Date.now() + 30_000);
				}
			});
		}
	}
}
