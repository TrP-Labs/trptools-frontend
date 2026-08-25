import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, 'You need manage access to change settings');

	const client = serverApi(event);

	const [audit, vehicleTypes] = await Promise.all([
		client.groups({ groupId: event.params.groupId }).audit.get(),
		client.groups({ groupId: event.params.groupId })['vehicle-types'].get()
	]);

	return { audit: audit.data ?? [], vehicleTypes: vehicleTypes.data ?? [] };
};
