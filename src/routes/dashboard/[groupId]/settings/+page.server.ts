import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, canAny, PERM } from '$lib/utils/permissions';
import { SETTINGS_GRANTS } from '$lib/utils/settingsSections';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	const permissions = parent.group.permissions;

	if (!canAny(permissions, SETTINGS_GRANTS)) error(403, m.error_need_manage_access_settings());

	const client = serverApi(event);
	const groupId = event.params.groupId;

	// Only what the viewer's own sections need. Asking for the audit log
	// without the grant to read it answers 403, which would take the whole
	// page down for somebody who came to edit the vehicle table.
	const [audit, vehicleTypes] = await Promise.all([
		can(permissions, PERM.VIEW_AUDIT_LOG)
			? client.groups({ groupId }).audit.get()
			: Promise.resolve({ data: [] }),
		can(permissions, PERM.MANAGE_VEHICLES)
			? client.groups({ groupId })['vehicle-types'].get()
			: Promise.resolve({ data: [] })
	]);

	return { audit: audit.data ?? [], vehicleTypes: vehicleTypes.data ?? [] };
};
