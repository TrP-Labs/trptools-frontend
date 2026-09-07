import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const { data, error: apiError } = await serverApi(event).users({ userId: event.params.userId }).get();

	if (!data) {
		if (apiError?.status === 404) error(404, m.error_profile_not_available());
		error(502, m.error_could_not_reach_api());
	}

	return { profile: data };
};
