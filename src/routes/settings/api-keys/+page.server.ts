import { redirect } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// A key acts as an account, so there is nothing here without one. Unlike
	// /settings this keeps the sign-in redirect: somebody who followed a link
	// or a bookmark to their keys wants their keys, not the theme picker.
	if (!event.locals.user) {
		redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	const { data } = await serverApi(event).auth.keys.get();
	return { keys: data ?? [] };
};
