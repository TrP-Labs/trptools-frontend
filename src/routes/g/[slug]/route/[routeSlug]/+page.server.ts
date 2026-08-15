import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { data, error: apiError } = await serverApi(event)
		.public.groups({ slug: event.params.slug })
		.routes({ routeSlug: event.params.routeSlug })
		.get();

	if (!data) {
		if (apiError?.status === 404) error(404, 'That route does not exist');
		error(502, 'Could not reach the API');
	}

	event.setHeaders({ 'cache-control': 'public, max-age=30, s-maxage=120' });

	return data;
};
