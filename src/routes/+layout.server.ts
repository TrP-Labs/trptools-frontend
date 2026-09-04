import { policyLinks } from '$lib/server/policies';
import type { LayoutServerLoad } from './$types';

/** The session and theme are resolved in hooks.server.ts once per request. */
export const load: LayoutServerLoad = async ({ locals }) => ({
	user: locals.user,
	theme: locals.theme,
	locale: locals.locale,
	localeSource: locals.localeSource,
	// The footer bar is whatever the policies directory holds, so a link never
	// lands on a document this deployment does not publish.
	policies: policyLinks
});
