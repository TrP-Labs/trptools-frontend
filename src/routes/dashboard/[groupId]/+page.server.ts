import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	const client = serverApi(event);
	const groupId = event.params.groupId;

	// Who is waiting on a decision, for whoever may make one. Asked for only
	// then — the endpoint answers 403 otherwise, and one card's 403 must not
	// take down an overview the rest of which they can read.
	const reviewer = can(parent.group.permissions, PERM.REVIEW_APPLICATIONS);

	const [routes, depots, shifts, occurrences, room, applicants] = await Promise.all([
		client.routes.get({ query: { groupId } }),
		client.depots.get({ query: { groupId } }),
		client.schedule.get({ query: { groupId } }),
		client.schedule.occurrences.get({ query: { groupId, limit: '5' } }),
		client.rooms.get({ query: { groupId } }),
		reviewer
			? client.applications.pending.get({ query: { groupId, limit: '6' } })
			: Promise.resolve({ data: [] })
	]);

	return {
		routes: routes.data ?? [],
		depots: depots.data ?? [],
		shifts: shifts.data ?? [],
		upcoming: occurrences.data ?? [],
		applicants: applicants.data ?? [],
		// A 404 here simply means no room is open right now.
		openRoomId: room.data?.roomId ?? null
	};
};
