import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!can(parent.group.permissions, PERM.MANAGE_RANKS)) error(403, m.error_need_manage_access_ranks());

	const rank = await serverApi(event).ranks({ rankId: event.params.rankId }).get();

	if (!rank.data) {
		if (rank.error?.status === 404) error(404, m.error_rank_not_bound_here());
		error(502, m.error_could_not_reach_api());
	}

	return { rank: rank.data };
};
