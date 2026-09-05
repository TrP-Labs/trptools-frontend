import { error } from '@sveltejs/kit';
import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const client = serverApi(event);

	const { data, error: apiError } = await client.public
		.groups({ slug: event.params.slug })
		.applications({ applicationSlug: event.params.applicationSlug })
		.get();

	if (!data) {
		if (apiError?.status === 404) error(404, 'That application does not exist');
		error(502, 'Could not reach the API');
	}

	// The group header is not part of the form payload, which is deliberately
	// identical for every caller — so it comes from the group page, which is
	// cached anyway.
	const group = (await client.public.groups({ slug: event.params.slug }).get()).data;
	if (!group) error(404, 'That group does not exist');

	/**
	 * Where this viewer stands is the one part that varies by caller: their
	 * last application, the rank they already hold, and whether the server
	 * would accept a submission at all. It decides everything the page shows
	 * below the form, which is why the page is only cacheable while nobody is
	 * signed in.
	 */
	const standing = event.locals.user
		? ((await client.applications({ applicationId: data.id }).me.get()).data ?? null)
		: null;

	if (!event.locals.user) {
		event.setHeaders({ 'cache-control': 'public, max-age=30, s-maxage=120' });
	}

	return {
		application: data,
		group: {
			id: group.id,
			slug: group.slug,
			name: group.name,
			icon: group.icon,
			tagline: group.tagline,
			sourceLocale: group.sourceLocale,
			translations: group.translations,
			accentColor: group.accentColor
		},
		standing
	};
};
