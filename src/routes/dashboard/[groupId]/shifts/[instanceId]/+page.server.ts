import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async event => {
    const { group } = await event.parent();
    if (!can(group.permissions, PERM.MANAGE_SHIFTS)) error(403, 'Forbidden');
    const result = await serverApi(event).schedule.instances({ id: event.params.instanceId }).get();
    if (!result.data || result.data.groupId !== group.id) error(404, 'Not Found');
    return { shift: result.data };
};
