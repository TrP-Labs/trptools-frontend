import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { canAny, PERM } from '$lib/utils/permissions';
import { isPeriod, PERIOD_COOKIE, periodOf } from '$lib/utils/attendancePeriod';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!canAny(parent.group.permissions, [PERM.MANAGE_ATTENDANCE, PERM.MANAGE_PROMOTIONS])) {
		error(403, m.api_error_forbidden());
	}
	// Only `period` is read from the address, so moving between tabs
	// (`?section=`) does not work the whole period out again.
	const asked = event.url.searchParams.get('period');
	const period = isPeriod(asked)
		? asked
		: event.cookies.get(PERIOD_COOKIE) === 'QUARTER'
			? periodOf(new Date(), 'QUARTER')
			: undefined;
	const standings = await serverApi(event)
		.attendance.groups({ groupId: parent.group.id })
		.standings.get({ query: period ? { period } : {} });
	if (!standings.data) error(standings.error?.status === 422 ? 400 : 502, m.error_could_not_reach_api());
	return { standings: standings.data };
};
