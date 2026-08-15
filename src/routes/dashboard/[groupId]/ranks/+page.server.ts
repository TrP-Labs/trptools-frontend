import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, 'You need manage access to edit ranks');

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
