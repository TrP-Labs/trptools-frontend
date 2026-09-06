import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, m.error_need_manage_access_routes());

	const client = serverApi(event);
	const groupId = event.params.groupId;

	const [routes, depots] = await Promise.all([
		client.routes.get({ query: { groupId, includeArchived: 'true' } }),
		client.depots.get({ query: { groupId } })
	]);

	return {
		routes: routes.data ?? [],
		depots: depots.data ?? []
	};
};
