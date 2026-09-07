import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, m.error_need_manage_access_depots());

	const { data } = await serverApi(event).depots.get({
		query: { groupId: event.params.groupId, includeArchived: 'true' }
	});

	return { depots: data ?? [] };
};
