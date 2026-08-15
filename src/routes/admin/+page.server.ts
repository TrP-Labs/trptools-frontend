import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

/** Access is settled by the portal's layout load. */
export const load: PageServerLoad = async (event) => {
	const client = serverApi(event);
	const status = (event.url.searchParams.get('status') ?? 'OPEN') as 'OPEN' | 'UPHELD' | 'DISMISSED';

	const [overview, reports] = await Promise.all([
		client.admin.overview.get(),
		client.admin.reports.get({ query: { status } })
	]);

	return {
		overview: overview.data ?? { openReports: 0, hiddenContent: 0, groups: 0, users: 0 },
		reports: reports.data ?? [],
		status
	};
};
