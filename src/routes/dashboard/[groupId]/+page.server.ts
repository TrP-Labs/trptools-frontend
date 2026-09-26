import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	await event.parent();
	if (event.locals.groupDashboard) return event.locals.groupDashboard.overview;
	const { data } = await serverApi(event).dashboard.group({ groupId: event.params.groupId }).get();
	if (!data) error(502, m.error_could_not_reach_api());
	return data.overview;
};
