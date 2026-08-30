import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

/**
 * The home page is two pages sharing an address.
 *
 * Signed out it explains what TrP Tools is. Signed in it is the overview of
 * every group you work for, which is one request rather than the fan-out the
 * shifts page does — the API gathers the schedule, the review queue and the
 * open rooms together because a card needs all three.
 *
 * A backend that is down leaves the marketing page standing rather than an
 * error page: the dashboard is the part that failed, not the site.
 */
export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) return { dashboard: null };

	try {
		const { data } = await serverApi(event).dashboard.get();
		return { dashboard: data ?? null };
	} catch {
		return { dashboard: null };
	}
};
