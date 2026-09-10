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
	const sheetId = event.params.sheetId;

	const [sheet, ranks, bot] = await Promise.all([
		client.signups({ sheetId }).get(),
		client.signups.ranks.get({ query: { groupId } }),
		client.bot({ groupId }).get()
	]);

	if (!sheet.data) {
		if (sheet.error?.status === 404) error(404, m.error_sheet_does_not_exist());
		error(502, m.error_could_not_reach_api());
	}

	const connected = Boolean(bot.data?.connected);

	// Only worth resolving names when there is a guild to resolve them against.
	const [channels, roles] = connected
		? await Promise.all([client.bot({ groupId }).channels.get(), client.bot({ groupId }).roles.get()])
		: [{ data: [] }, { data: [] }];

	return {
		sheet: sheet.data,
		ranks: ranks.data ?? [],
		botConnected: connected,
		channelNames: Object.fromEntries((channels.data ?? []).map((channel) => [channel.id, channel.name])),
		roleNames: Object.fromEntries((roles.data ?? []).map((role) => [role.id, role.name]))
	};
};
