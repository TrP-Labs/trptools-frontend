import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, 'You need manage access to run applications');

	const client = serverApi(event);
	const applicationId = event.params.applicationId;

	const [application, ranks, pending, approved, denied] = await Promise.all([
		client.applications({ applicationId }).get(),
		client.ranks.group({ groupId: event.params.groupId }).get(),
		client.applications({ applicationId }).submissions.get({ query: { status: 'PENDING' } }),
		client.applications({ applicationId }).submissions.get({ query: { status: 'APPROVED' } }),
		client.applications({ applicationId }).submissions.get({ query: { status: 'DENIED' } })
	]);

	if (!application.data) {
		if (application.error?.status === 404) error(404, 'That application does not exist');
		error(502, 'Could not reach the API');
	}

	return {
		application: application.data,
		ranks: ranks.data ?? [],
		pending: pending.data ?? [],
		approved: approved.data ?? [],
		denied: denied.data ?? []
	};
};
