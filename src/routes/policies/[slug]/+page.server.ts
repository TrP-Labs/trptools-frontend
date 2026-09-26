import { error } from '@sveltejs/kit';
import { policies, policyDocument } from '$lib/server/policies';
import type { PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

/** A policy exists only while its file does, so a removed file 404s. */
export const load: PageServerLoad = async ({ params, fetch, platform }) => {
	const entries = await policies(fetch, platform?.caches?.default,
		platform?.context ? (task) => platform.context.waitUntil(task) : undefined);
	const policy = policyDocument(entries, params.slug);
	if (!policy) error(404, m.error_deployment_does_not_publish_document());

	return policy;
};
