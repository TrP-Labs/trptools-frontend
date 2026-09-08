import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { canAny, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!canAny(parent.group.permissions, [PERM.MANAGE_APPLICATIONS, PERM.REVIEW_APPLICATIONS])) error(403, m.error_need_manage_access_applications());

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
