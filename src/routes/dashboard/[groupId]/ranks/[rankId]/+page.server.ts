import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!can(parent.group.permissions, PERM.MANAGE_RANKS)) error(403, m.error_need_manage_access_ranks());

	const client = serverApi(event);
	const rankId = event.params.rankId;

	const [rank, signup, bot] = await Promise.all([
		client.ranks({ rankId }).get(),
		client.ranks({ rankId }).signup.get(),
		client.bot({ groupId: event.params.groupId }).get()
	]);

	if (!rank.data) {
		if (rank.error?.status === 404) error(404, m.error_rank_not_bound_here());
		error(502, m.error_could_not_reach_api());
	}

	const connected = Boolean(bot.data?.connected);

	// Only worth resolving names when there is a guild to resolve them against.
	const [channels, roles] = connected
		? await Promise.all([
				client.bot({ groupId: event.params.groupId }).channels.get(),
				client.bot({ groupId: event.params.groupId }).roles.get()
			])
		: [{ data: [] }, { data: [] }];

	return {
		rank: rank.data,
		signup: signup.data ?? null,
		botConnected: connected,
		channelNames: Object.fromEntries((channels.data ?? []).map((channel) => [channel.id, channel.name])),
		roleNames: Object.fromEntries((roles.data ?? []).map((role) => [role.id, role.name]))
	};
};
