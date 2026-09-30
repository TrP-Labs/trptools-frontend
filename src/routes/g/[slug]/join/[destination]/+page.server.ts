import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) => {
    const destination = event.params.destination;
    if (destination !== 'roblox' && destination !== 'discord') error(404, m.join_unavailable());
    const { data, error: apiError } = await serverApi(event).public.groups({ slug: event.params.slug }).join({ destination }).get();
    if (!data) error(apiError?.status === 404 ? 404 : 502, m.join_unavailable());
    // This is a personal preference; never cache the redirect for another reader.
    event.setHeaders({ 'cache-control': 'private, no-store' });
    return { join: data, instant: event.locals.user?.instantRedirects ?? false };
};
