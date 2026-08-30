import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * The whole portal is admins only, so the guard sits above every page in it.
 *
 * It asks for the *elevation*, not the standing: an admin with admin mode off
 * is an ordinary account everywhere, and the API refuses them here too. The
 * message says where the switch is, because being refused by your own account
 * is otherwise baffling.
 */
export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);

	if (!event.locals.user.adminMode) {
		error(
			403,
			event.locals.user.siteRank === 'admin'
				? 'Admin mode is off for this session. Turn it on in Settings → Account.'
				: 'This area is for site administrators'
		);
	}
};
