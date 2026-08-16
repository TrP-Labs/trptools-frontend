import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const client = serverApi(event);

	const { data, error: apiError } = await client.public
		.groups({ slug: event.params.slug })
		.shifts({ shiftSlug: event.params.shiftSlug })
		.get();

	if (!data) {
		if (apiError?.status === 404) error(404, 'That shift does not exist');
		error(502, 'Could not reach the API');
	}

	// Sign-up sheets are rank-gated and personal, so they come from the
	// session-aware endpoint rather than the public page payload — which is why
	// the caching header below only goes on when nobody is signed in.
	const occurrences = event.locals.user
		? ((
				await client.schedule.occurrences.get({
					query: { groupId: data.group.id, eventId: data.shift.eventId, limit: '20' }
				})
			).data ?? [])
		: [];

	if (!event.locals.user) {
		event.setHeaders({ 'cache-control': 'public, max-age=30, s-maxage=120' });
	}

	return { ...data, occurrences: data.occurrences, signupOccurrences: occurrences };
};
