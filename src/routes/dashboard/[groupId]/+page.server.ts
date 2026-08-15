import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const client = serverApi(event);
	const groupId = event.params.groupId;

	const [routes, depots, shifts, occurrences, room] = await Promise.all([
		client.routes.get({ query: { groupId } }),
		client.depots.get({ query: { groupId } }),
		client.schedule.get({ query: { groupId } }),
		client.schedule.occurrences.get({ query: { groupId, limit: '5' } }),
		client.rooms.get({ query: { groupId } })
	]);

	return {
		routes: routes.data ?? [],
		depots: depots.data ?? [],
		shifts: shifts.data ?? [],
		upcoming: occurrences.data ?? [],
		// A 404 here simply means no room is open right now.
		openRoomId: room.data?.roomId ?? null
	};
};
