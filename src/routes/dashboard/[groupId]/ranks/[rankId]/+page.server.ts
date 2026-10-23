import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

/**
 * A rank opens for whoever may bind ranks or keep its attendance. Somebody
 * holding only the second sees only the Attendance section, so the rank's own
 * record is not asked for — that endpoint wants the first.
 */
export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	const ranks = can(parent.group.permissions, PERM.MANAGE_RANKS);
	const attendance = can(parent.group.permissions, PERM.MANAGE_ATTENDANCE);
	if (!ranks && !attendance) error(403, m.error_need_manage_access_ranks());

	const client = serverApi(event);
	const [rank, settings] = await Promise.all([
		ranks ? client.ranks({ rankId: event.params.rankId }).get() : null,
		attendance ? client.attendance.ranks({ rankId: event.params.rankId }).get() : null
	]);

	if ((ranks && !rank?.data) || (!ranks && !settings?.data)) {
		const status = rank?.error?.status ?? settings?.error?.status;
		if (status === 404 || status === 422) error(404, m.error_rank_not_bound_here());
		error(502, m.error_could_not_reach_api());
	}

	return { rank: rank?.data ?? null, attendance: settings?.data ?? null };
};
