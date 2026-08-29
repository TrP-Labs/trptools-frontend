import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, 'You need manage access to run applications');

	const client = serverApi(event);
	const groupId = event.params.groupId;

	// The ranks come along so a new form can be bound to one as it is created:
	// a form with no rank cannot be opened, so asking later would mean making
	// every group take the same second step.
	const [applications, ranks] = await Promise.all([
		client.applications.get({ query: { groupId } }),
		client.ranks.group({ groupId }).get()
	]);

	return {
		applications: applications.data ?? [],
		ranks: ranks.data ?? []
	};
};
