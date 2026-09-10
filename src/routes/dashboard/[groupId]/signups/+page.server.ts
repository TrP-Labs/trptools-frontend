import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!can(parent.group.permissions, PERM.MANAGE_SIGNUPS)) error(403, m.error_need_manage_access_signups());

	const client = serverApi(event);
	const groupId = event.params.groupId;

	// The rank list travels with the sheets so a card can name who a sheet is
	// for. It is the same call the editor makes, and a group has a handful of
	// ranks at most.
	const [sheets, ranks] = await Promise.all([
		client.signups.get({ query: { groupId } }),
		client.signups.ranks.get({ query: { groupId } })
	]);

	return {
		sheets: sheets.data ?? [],
		ranks: ranks.data ?? []
	};
};
