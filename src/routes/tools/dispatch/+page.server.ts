import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

/**
 * The routes and depots the personal board runs.
 *
 * The same seeds every new group is given, so they are identical for every
 * visitor and cacheable. The board's own vehicles never come from here — they
 * live in the browser.
 */
export const load: PageServerLoad = async (event) => {
	const { data } = await serverApi(event).tools.dispatch.setup.get();

	if (!data) error(502, m.error_could_not_reach_api());

	event.setHeaders({ 'cache-control': 'public, max-age=60, s-maxage=600' });

	return data;
};
