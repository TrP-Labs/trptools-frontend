import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, 'You need manage access to edit ranks');

	const client = serverApi(event);
	const rankId = event.params.rankId;

	const [rank, signup, bot] = await Promise.all([
		client.ranks({ rankId }).get(),
		client.ranks({ rankId }).signup.get(),
		client.bot({ groupId: event.params.groupId }).get()
	]);

	if (!rank.data) {
		if (rank.error?.status === 404) error(404, 'That rank is not bound here');
		error(502, 'Could not reach the API');
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
