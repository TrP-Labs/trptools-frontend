import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

/**
 * The bot page.
 *
 * The backend resolves configuration, channel names, role names and cleanup
 * from one permission check and one concurrent set of Discord reads. The
 * pickers still fetch live when opened for their refresh buttons.
 */
export const load: PageServerLoad = async (event) => {
	const groupId = event.params.groupId;
	const [parent, response] = await Promise.all([
		event.parent(),
		serverApi(event).bot({ groupId }).page.get()
	]);
	if (!can(parent.group.permissions, PERM.MANAGE_BOT)) error(403, m.error_need_manage_access_bot());
	if (!response.data) error(502, m.error_could_not_reach_api());
	return response.data;
};
