import { replaceState } from '$app/navigation';
import { page } from '$app/state';

/**
 * Announcing an outcome an OAuth callback left in the URL, exactly once.
 *
 * Two flows come back this way — adding the Discord bot to a server, and a
 * member connecting their own Discord account — because both leave the site
 * and return as a fresh navigation carrying no client state. The server has
 * nowhere to put a toast, so it puts a marker in the query string and the page
 * says it instead.
 *
 * There are two traps in doing that, and both cost a release to find:
 *
 * 1. **Announce from `afterNavigate`, never from an effect.** An effect
 *    re-reads `page.url` every time the page data reloads — which is once per
 *    settings toggle on a page with settings — so it announces again on each
 *    one. `afterNavigate` fires per navigation, and `invalidateAll` is not a
 *    navigation.
 * 2. **`replaceState` has to be deferred.** The return is always a cold load,
 *    and SvelteKit runs every navigation callback and mounts every component
 *    *before* marking its router started, so calling it straight from either
 *    throws "Cannot call replaceState(...) before router is initialized" — the
 *    marker survives, and an uncaught error is logged. The microtask lands
 *    just after `started = true`, which is set synchronously a line later.
 *
 * The browser's own `history.replaceState` is not a way around the second: it
 * changes the address bar without touching `page.url`, which is what this
 * reads, so the marker would still be there as far as the page is concerned.
 */
export function consumeUrlMarkers(
	names: string[],
	announce: (values: Record<string, string | null>) => void
): void {
	// Captured rather than re-read in the microtask: what gets cleared should
	// be the URL that was announced from.
	const { pathname, search } = page.url;
	const params = new URLSearchParams(search);

	const values: Record<string, string | null> = {};
	for (const name of names) values[name] = params.get(name);

	if (names.every((name) => values[name] === null)) return;

	announce(values);

	// Only the markers. A page reached with a filter or a tab in the query
	// string keeps it — clearing the whole search would quietly undo that.
	for (const name of names) params.delete(name);
	const rest = params.toString();

	queueMicrotask(() => replaceState(pathname + (rest ? `?${rest}` : ''), {}));
}
