import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) => {
	const { group } = await event.parent();
	if (!can(group.permissions, PERM.START_ROOM))
		error(403, m.api_error_forbidden());
	const client = serverApi(event);
	const [room, upcoming] = await Promise.all([
		client.rooms.get({ query: { groupId: group.id } }),
		client.schedule.occurrences.get({
			query: {
				groupId: group.id,
				from: new Date(Date.now() - 86400000).toISOString(),
				limit: '20',
			},
		}),
	]);
	const roomId = room.data?.roomId ?? null;
	const snapshot = roomId ? await client.host({ roomId }).get() : null;
	return {
		roomId,
		hostSnapshot: snapshot?.data ?? null,
		upcoming: upcoming.data ?? [],
	};
};
