import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const { data, error: apiError } = await serverApi(event)
		.public.groups({ slug: event.params.slug })
		.routes({ routeSlug: event.params.routeSlug })
		.get();

	if (!data) {
		if (apiError?.status === 404) error(404, m.error_route_does_not_exist());
		error(502, m.error_could_not_reach_api());
	}

	event.setHeaders({ 'cache-control': 'public, max-age=30, s-maxage=120' });

	return data;
};
