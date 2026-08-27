import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

/**
 * The routes and depots the personal board runs.
 *
 * The same seeds every new group is given, so they are identical for every
 * visitor and cacheable. The board's own vehicles never come from here — they
 * live in the browser.
 */
export const load: PageServerLoad = async (event) => {
	const { data } = await serverApi(event).tools.dispatch.setup.get();

	if (!data) error(502, 'Could not reach the API');

	event.setHeaders({ 'cache-control': 'public, max-age=60, s-maxage=600' });

	return data;
};
