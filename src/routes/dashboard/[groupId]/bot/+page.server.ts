import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

/**
 * The bot page.
 *
 * Channels and roles are loaded here as well as inside the pickers. The page
 * needs them to name what each setting currently points at, and doing it once
 * up front stops eight setting rows each resolving separately and flickering
 * as they land. The pickers still fetch live when opened, which is what makes
 * their refresh button meaningful.
 */
export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (parent.group.permissionLevel < 3) error(403, 'You need manage access to configure the bot');

	const client = serverApi(event);
	const groupId = event.params.groupId;

	const { data: overview } = await client.bot({ groupId }).get();

	if (!overview?.connected) {
		return {
			overview: overview ?? { connected: false, available: true, config: null, guild: null },
			channelNames: {} as Record<string, string>,
			roleNames: {} as Record<string, string>,
			cleanup: null
		};
	}

	const [channels, roles, cleanup] = await Promise.all([
		client.bot({ groupId }).channels.get(),
		client.bot({ groupId }).roles.get(),
		// Whether the end-of-shift cleanup can actually run. Loaded with the
		// rest so the page can say so before a shift, rather than the group
		// finding out hours after one when nothing was tidied up.
		client.bot({ groupId }).cleanup.get()
	]);

	return {
		overview,
		channelNames: Object.fromEntries((channels.data ?? []).map((c) => [c.id, c.name])),
		roleNames: Object.fromEntries((roles.data ?? []).map((r) => [r.id, r.name])),
		cleanup: cleanup.data ?? null
	};
};
