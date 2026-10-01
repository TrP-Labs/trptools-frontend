import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) => {
    const client = serverApi(event);
    const endpoint = client.public.groups({ slug: event.params.slug });
    const [claim, group] = await Promise.all([
        endpoint.claimables({ claimSlug: event.params.claimSlug }).get(), endpoint.get()
    ]);
    if (!claim.data) {
        if (claim.error?.status === 404) error(404, m.claimables_unavailable());
        error(502, m.error_could_not_reach_api());
    }
    if (!group.data) error(404, m.error_group_does_not_exist());
    const standing = event.locals.user ? (await client.claimables({ claimId: claim.data.id }).me.get()).data ?? null : null;
    event.setHeaders({ 'cache-control': 'private, no-store' });
    return { claim: claim.data, group: group.data, standing };
};
