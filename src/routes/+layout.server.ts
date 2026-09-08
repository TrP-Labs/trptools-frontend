import { policyLinks } from '$lib/server/policies';
import type { LayoutServerLoad } from './$types';

/** The session and theme are resolved in hooks.server.ts once per request. */
export const load: LayoutServerLoad = async ({ locals }) => ({
	user: locals.user,
	theme: locals.theme,
	// On the root layout so `utils/format` can read it from `page.data` on
	// every page, rather than each one remembering to pass it down.
	timezone: locals.timezone,
	locale: locals.locale,
	localeSource: locals.localeSource,
	// The footer bar is whatever the policies directory holds, so a link never
	// lands on a document this deployment does not publish.
	policies: policyLinks
});
