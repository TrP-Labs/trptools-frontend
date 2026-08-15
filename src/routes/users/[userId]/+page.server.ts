import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { data, error: apiError } = await serverApi(event).users({ userId: event.params.userId }).get();

	if (!data) {
		if (apiError?.status === 404) error(404, 'That profile is not available');
		error(502, 'Could not reach the API');
	}

	return { profile: data };
};
