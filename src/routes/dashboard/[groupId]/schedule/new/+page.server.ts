import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async event => {
    const { group } = await event.parent();
    if (!can(group.permissions, PERM.MANAGE_SHIFTS)) error(403, m.error_need_manage_access_shifts());
};
