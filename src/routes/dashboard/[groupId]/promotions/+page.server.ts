import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { canAny, PERM } from '$lib/utils/permissions';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!canAny(parent.group.permissions, [PERM.MANAGE_ATTENDANCE, PERM.MANAGE_PROMOTIONS])) {
		error(403, m.api_error_forbidden());
	}
	const month = event.url.searchParams.get('month');
	const standings = await serverApi(event)
		.attendance.groups({ groupId: parent.group.id })
		.standings.get({ query: month && /^\d{4}-\d{2}$/.test(month) ? { month } : {} });
	if (!standings.data) error(standings.error?.status === 422 ? 400 : 502, m.error_could_not_reach_api());
	return { standings: standings.data };
};
