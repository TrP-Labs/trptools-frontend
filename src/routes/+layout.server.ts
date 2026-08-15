import { legalAvailable } from '$lib/server/legal';
import type { LayoutServerLoad } from './$types';

/** The session and theme are resolved in hooks.server.ts once per request. */
export const load: LayoutServerLoad = async ({ locals }) => ({
	user: locals.user,
	theme: locals.theme,
	// The footer only offers documents this deployment actually ships, so a
	// link never lands on a 404.
	legal: legalAvailable
});
