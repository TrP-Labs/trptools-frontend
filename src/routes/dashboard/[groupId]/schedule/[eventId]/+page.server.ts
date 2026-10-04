import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async event => {
    const { group } = await event.parent();
    if (!can(group.permissions, PERM.MANAGE_SHIFTS)) error(403, m.error_need_manage_access_shifts());
    const result = await serverApi(event).schedule({ eventId: event.params.eventId }).get();
    if (!result.data || result.data.groupId !== group.id) error(404, m.error_shift_does_not_exist());
    return { schedule: result.data };
};
