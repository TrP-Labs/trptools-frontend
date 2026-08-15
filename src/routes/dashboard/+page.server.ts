import { redirect } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(303, '/login?next=/dashboard');

	const client = serverApi(event);

	const [groups, creatable] = await Promise.all([
		client.groups.get(),
		client.groups.creatable.get()
	]);

	return {
		groups: groups.data ?? [],
		creatable: creatable.data ?? []
	};
};
