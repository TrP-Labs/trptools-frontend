import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { data, error: apiError } = await serverApi(event)
		.public.groups({ slug: event.params.slug })
		.shifts({ shiftSlug: event.params.shiftSlug })
		.get();

	if (!data) {
		if (apiError?.status === 404) error(404, 'That shift does not exist');
		error(502, 'Could not reach the API');
	}

	event.setHeaders({ 'cache-control': 'public, max-age=30, s-maxage=120' });

	return data;
};
