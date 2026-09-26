import { policies, policyLinks } from '$lib/server/policies';
import type { LayoutServerLoad } from './$types';

/** The session and theme are resolved in hooks.server.ts once per request. */
export const load: LayoutServerLoad = async ({ locals, fetch, platform }) => {
	const entries = await policies(fetch, platform?.caches?.default,
		platform?.context ? (task) => platform.context.waitUntil(task) : undefined);
	return {
		user: locals.user,
		theme: locals.theme,
		// On the root layout so `utils/format` can read it from `page.data` on
		// every page, rather than each one remembering to pass it down.
		timezone: locals.timezone,
		locale: locals.locale,
		localeSource: locals.localeSource,
		policies: policyLinks(entries)
	};
};
