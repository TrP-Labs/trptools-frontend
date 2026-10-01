import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) => {
    const parent = await event.parent();
    if (!can(parent.group.permissions, PERM.MANAGE_CLAIMABLES)) error(403, m.api_error_forbidden());
    const client = serverApi(event);
    const query = { groupId: parent.group.id };
    const [claims, ranks, connection] = await Promise.all([
        client.claimables.get({ query }), client.claimables.ranks.get({ query }), client.claimables.connection.get({ query })
    ]);
    if (!claims.data || !ranks.data || !connection.data) error(502, m.error_could_not_reach_api());
    return { claims: claims.data, ranks: ranks.data, connection: connection.data };
};
