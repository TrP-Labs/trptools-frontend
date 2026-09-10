import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!can(parent.group.permissions, PERM.MANAGE_RANKS)) error(403, m.error_need_manage_access_ranks());

	const client = serverApi(event);
	const groupId = event.params.groupId;

	const [ranks, creatable] = await Promise.all([
		client.ranks.group({ groupId }).get(),
		client.ranks.group({ groupId }).creatable.get()
	]);

	return {
		ranks: ranks.data ?? [],
		creatable: creatable.data ?? []
	};
};
