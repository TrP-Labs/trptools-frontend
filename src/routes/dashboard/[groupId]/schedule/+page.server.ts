import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async event => {
    const { group } = await event.parent();
    if (!can(group.permissions, PERM.MANAGE_SHIFTS)) error(403, m.error_need_manage_access_shifts());
    const result = await serverApi(event).schedule.get({ query: { groupId: group.id } });
    if (!result.data) error(502, m.error_could_not_reach_api());
    return { schedules: result.data };
};
