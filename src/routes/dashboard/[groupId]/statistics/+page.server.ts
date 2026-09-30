import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async event => {
    const selected = event.url.searchParams.get('days');
    const days = selected === '7' || selected === '90' ? selected : '30';
    const { data, error: apiError } = await serverApi(event).statistics.groups({ groupId: event.params.groupId }).get({ query: { days } });
    if (!data) error(apiError?.status === 403 ? 403 : 502, m.error_could_not_reach_api());
    return { statistics: data };
};
