import { error } from '@sveltejs/kit';
import { policyDocument } from '$lib/server/policies';
import type { PageServerLoad } from './$types';

/** A policy exists only while its file does, so a removed file 404s. */
export const load: PageServerLoad = async ({ params }) => {
	const policy = policyDocument(params.slug);
	if (!policy) error(404, 'This deployment does not publish that document');

	return policy;
};
