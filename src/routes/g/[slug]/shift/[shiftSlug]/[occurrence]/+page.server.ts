import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';
export const load: PageServerLoad = async event => {
    const millis = Number(event.params.occurrence);
    if (!Number.isSafeInteger(millis) || !Number.isFinite(new Date(millis).getTime())) error(404, m.shifts_occurrence_not_found());
    const client = serverApi(event);
    const result = await client.schedule.instance.get({ query: { groupId: event.params.slug, slug: event.params.shiftSlug, occurrence: new Date(millis) } });
    if (!result.data) error(result.error?.status === 404 || result.error?.status === 400 ? 404 : 502, m.shifts_occurrence_not_found());
    // This endpoint carries personal voting and staff visibility; never CDN-cache it.
    event.setHeaders({ 'cache-control': 'private, no-store' });
    return { shift: result.data, groupSlug: event.params.slug };
};
