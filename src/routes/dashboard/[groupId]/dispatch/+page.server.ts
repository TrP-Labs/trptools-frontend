import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const client = serverApi(event);
	const groupId = event.params.groupId;

	const [room, routes, upcoming] = await Promise.all([
		client.rooms.get({ query: { groupId } }),
		client.routes.get({ query: { groupId } }),
		// The countdown needs dated occurrences, not the recurrence rules — a
		// room is opened for one instance of a shift, not for the series.
		//
		// The window starts a day back because an occurrence is listed by when
		// it *starts*: a shift already under way began in the past, and that is
		// exactly the one a host arriving late wants to open.
		client.schedule.occurrences.get({
			query: {
				groupId,
				from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				limit: '20'
			}
		})
	]);

	return {
		// A 404 from `/rooms` simply means nothing is open right now.
		roomId: room.data?.roomId ?? null,
		routes: routes.data ?? [],
		upcoming: upcoming.data ?? []
	};
};
