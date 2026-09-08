import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!can(parent.group.permissions, PERM.MANAGE_ROUTES)) error(403, m.error_need_manage_access_routes());

	const client = serverApi(event);

	const [route, depots] = await Promise.all([
		client.routes({ routeId: event.params.routeId }).get(),
		client.depots.get({ query: { groupId: event.params.groupId } })
	]);

	if (!route.data) {
		if (route.error?.status === 404) error(404, m.error_route_does_not_exist());
		error(502, m.error_could_not_reach_api());
	}

	return { route: route.data, depots: depots.data ?? [] };
};
