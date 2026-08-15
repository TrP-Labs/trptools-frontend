import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

/**
 * Rendered on the server so a shared link produces real HTML for crawlers and
 * embeds. The backend marks these responses cacheable and they never vary by
 * viewer, so the same cache headers are echoed here.
 */
export const load: PageServerLoad = async (event) => {
	const { data, error: apiError } = await serverApi(event).public.groups({ slug: event.params.slug }).get();

	if (!data) {
		if (apiError?.status === 404) error(404, 'That group page does not exist');
		error(502, 'Could not reach the API');
	}

	event.setHeaders({ 'cache-control': 'public, max-age=30, s-maxage=120' });

	return { group: data };
};
