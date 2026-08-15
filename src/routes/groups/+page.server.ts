import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const search = event.url.searchParams.get('search') ?? '';

	const { data, error } = await serverApi(event).public.groups.get({
		query: search ? { search } : {}
	});

	return {
		groups: data ?? [],
		search,
		failed: Boolean(error)
	};
};
