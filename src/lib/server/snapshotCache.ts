export type Snapshot<T> = { value: T; expiresAt: number };
export type KeepAlive = (task: Promise<unknown>) => void;

type Options<T> = {
	key: string;
	ttlMs: number;
	fallback: T;
	readCache: () => Promise<Snapshot<T> | undefined>;
	refresh: () => Promise<T>;
	writeCache: (snapshot: Snapshot<T>) => Promise<void>;
	waitUntil?: KeepAlive;
	onError: (error: unknown) => void;
	now?: () => number;
};

/** A stale snapshot stays usable while its owner request refreshes it in the background. */
export function createSnapshotCache<T>() {
	const memory = new Map<string, Snapshot<T>>();
	const pending = new Map<string, Promise<void>>();
	const retryAt = new Map<string, number>();

	return async (options: Options<T>): Promise<T> => {
		const now = options.now ?? Date.now;
		let snapshot = memory.get(options.key);
		if (!snapshot) {
			snapshot = await options.readCache().catch(() => undefined);
			if (snapshot) memory.set(options.key, snapshot);
		}

		if ((!snapshot || snapshot.expiresAt <= now()) &&
			!pending.has(options.key) && now() >= (retryAt.get(options.key) ?? 0)) {
			const task = Promise.resolve()
				.then(options.refresh)
				.then(async (value) => {
					const fresh = { value, expiresAt: now() + options.ttlMs };
					memory.set(options.key, fresh);
					retryAt.delete(options.key);
					await options.writeCache(fresh);
				})
				.catch((error) => {
					// A repository outage must not turn every page load into another retry.
					retryAt.set(options.key, now() + 30_000);
					options.onError(error);
				})
				.finally(() => pending.delete(options.key));
			pending.set(options.key, task);
			options.waitUntil?.(task);
		}

		// Never await another request's in-flight network operation in a Worker.
		return snapshot?.value ?? options.fallback;
	};
}
