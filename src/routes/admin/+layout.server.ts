import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** The whole portal is admins only, so the guard sits above every page in it. */
export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	if (event.locals.user.siteRank !== 'admin') error(403, 'This area is for site administrators');
};
