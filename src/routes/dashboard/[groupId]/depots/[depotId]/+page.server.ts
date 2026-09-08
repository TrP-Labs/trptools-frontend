import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!can(parent.group.permissions, PERM.MANAGE_DEPOTS)) error(403, m.error_need_manage_access_depots());

	const depot = await serverApi(event).depots({ depotId: event.params.depotId }).get();

	if (!depot.data) {
		if (depot.error?.status === 404) error(404, m.error_depot_does_not_exist());
		error(502, m.error_could_not_reach_api());
	}

	return { depot: depot.data };
};
