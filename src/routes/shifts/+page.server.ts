import { serverApi } from '$lib/api/server';
import { localized } from '$lib/utils/translations';
import type { PageServerLoad } from './$types';

/**
 * Every upcoming shift across the groups the viewer belongs to.
 *
 * The API is per-group by design, so this fans out and merges. The list of
 * groups a person can act in is small, so a handful of parallel reads is
 * cheaper than adding a cross-group endpoint that would need its own
 * authorization rules.
 */
export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) return { signedIn: false as const, groups: [], occurrences: [] };

	const client = serverApi(event);
	const { data: groups } = await client.groups.get();

	if (!groups || groups.length === 0) {
		return { signedIn: true as const, groups: [], occurrences: [] };
	}

	const results = await Promise.all(
		groups.map(async (group) => {
			const { data } = await client.schedule.occurrences.get({
				query: { groupId: group.id, limit: '20' }
			});

			return (data ?? []).map((occurrence) => ({
				...occurrence,
				groupName: localized(group, 'name'),
				groupSlug: group.slug,
				groupIcon: group.icon
			}));
		})
	);

	const occurrences = results
		.flat()
		.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
		.slice(0, 60);

	return { signedIn: true as const, groups, occurrences };
};
