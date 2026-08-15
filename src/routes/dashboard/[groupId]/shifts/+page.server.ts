import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const client = serverApi(event);
	const groupId = event.params.groupId;

	const [shifts, occurrences] = await Promise.all([
		client.schedule.get({ query: { groupId } }),
		client.schedule.occurrences.get({ query: { groupId, limit: '25' } })
	]);

	return {
		shifts: shifts.data ?? [],
		occurrences: occurrences.data ?? []
	};
};
