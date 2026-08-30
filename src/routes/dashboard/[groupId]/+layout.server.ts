import { error, redirect } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { LayoutServerLoad } from './$types';

/**
 * Loads the group once for every page beneath it, and carries the caller's
 * permission level down so each screen can hide what it cannot do. The server
 * enforces the same levels independently — this only shapes the UI.
 */
export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) redirect(303, `/login?next=/dashboard/${event.params.groupId}`);

	const { data, error: apiError } = await serverApi(event)
		.groups({ groupId: event.params.groupId })
		.get();

	if (!data) {
		if (apiError?.status === 404) error(404, 'That group does not exist');
		error(502, 'Could not reach the API');
	}

	// `adminMode`, not `siteRank`: the API already reports MANAGE to an
	// elevated admin, so this only has to agree with it. An admin who has
	// turned the mode off is refused here exactly as the API refuses them.
	if (data.permissionLevel < 1 && !event.locals.user.adminMode) {
		error(403, 'You do not have access to this group');
	}

	return { group: data };
};
