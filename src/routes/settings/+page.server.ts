import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * `/settings` is the account page, so signed out there is nothing on it.
 *
 * Sent to appearance rather than to the sign-in screen: it is the one settings
 * page that works without an account, and it is what the sidebar beside this
 * is offering. Bouncing to /login would be a dead end for somebody who only
 * wanted to change the language.
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/settings/appearance');

	return {};
};
