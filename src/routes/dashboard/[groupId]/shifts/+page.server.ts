import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	// This page is about scheduling shifts, not about staffing them. Signing
	// up moved to the group's public shift page, so the two questions no
	// longer share a screen and this one asks only for the grant that answers
	// it — a dispatcher who came here to take a slot has nothing to do here.
	const parent = await event.parent();
	if (!can(parent.group.permissions, PERM.MANAGE_SHIFTS)) error(403, m.error_need_manage_access_shifts());

	const client = serverApi(event);
	const groupId = event.params.groupId;

	const [shifts, occurrences] = await Promise.all([
		client.schedule.get({ query: { groupId } }),
		client.schedule.occurrences.get({ query: { groupId, limit: '25' } })
	]);

	return {
		shifts: shifts.data ?? [],
		occurrences: occurrences.data ?? []
	};
};
