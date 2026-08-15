import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

/** Access is settled by the portal's layout load. */
export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams.get('q') ?? '';
	const status = (event.url.searchParams.get('status') ?? 'ALL') as 'ALL' | 'BANNED';

	const { data } = await serverApi(event).admin.users.get({ query: { q, status } });

	return { users: data ?? [], q, status };
};
