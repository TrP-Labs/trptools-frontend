import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Promotions and demotions became two tabs of the Attendance page in 3.5;
// links and bookmarks to the old address land on the matching tab.
export const load: PageServerLoad = ({ params, url }) => {
	const next = new URLSearchParams(url.searchParams);
	const month = next.get('month');
	next.delete('month');
	if (month) next.set('period', month);
	if (!next.has('section')) next.set('section', 'promotions');
	redirect(301, `/dashboard/${params.groupId}/attendance?${next}`);
};
