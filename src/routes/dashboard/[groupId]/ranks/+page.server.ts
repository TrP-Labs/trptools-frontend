import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { RankSignup } from '$lib/api/types';
import { can, PERM } from '$lib/utils/permissions';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async (event) => {
	const parent = await event.parent();
	if (!can(parent.group.permissions, PERM.MANAGE_RANKS)) error(403, m.error_need_manage_access_ranks());

	const client = serverApi(event);
	const groupId = event.params.groupId;

	const [ranks, creatable] = await Promise.all([
		client.ranks.group({ groupId }).get(),
		client.ranks.group({ groupId }).creatable.get()
	]);

	const bound = ranks.data ?? [];

	// Sheets are read per rank rather than in one call: the sheet is a
	// sub-resource of the rank, and a group has a handful of ranks at most.
	// The list only needs to know whether there is one — everything that edits
	// a sheet lives on the rank's own page.
	const sheets = await Promise.all(
		bound.map(
			async (rank) =>
				[rank.id, (await client.ranks({ rankId: rank.id }).signup.get()).data ?? null] as const
		)
	);

	return {
		ranks: bound,
		creatable: creatable.data ?? [],
		signups: Object.fromEntries(sheets) as Record<string, RankSignup | null>
	};
};
