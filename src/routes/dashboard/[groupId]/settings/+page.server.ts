import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, 'You need manage access to change settings');

	const { data } = await serverApi(event).groups({ groupId: event.params.groupId }).audit.get();

	return { audit: data ?? [] };
};
