import { redirect } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(303, '/login?next=/dashboard');

	if (event.locals.dashboardGroups) return { groups: event.locals.dashboardGroups };
	const { data } = await serverApi(event).groups.get();
	return { groups: data ?? [] };
};
