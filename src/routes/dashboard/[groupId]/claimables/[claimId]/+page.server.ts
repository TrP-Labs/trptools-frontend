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
    const [claim, ranks, connection] = await Promise.all([
        client.claimables({ claimId: event.params.claimId }).get(), client.claimables.ranks.get({ query }), client.claimables.connection.get({ query })
    ]);
    if (!claim.data || claim.data.groupId !== parent.group.id) error(404, m.claimables_unavailable());
    if (!ranks.data || !connection.data) error(502, m.error_could_not_reach_api());
    return { claim: claim.data, ranks: ranks.data, connection: connection.data };
};
