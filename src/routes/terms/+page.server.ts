import { error } from '@sveltejs/kit';
import { legalDocument } from '$lib/server/legal';
import type { PageServerLoad } from './$types';

/** Without a TERMS.md there is no page, and the footer does not link to one. */
export const load: PageServerLoad = async () => {
	const document = legalDocument('terms');
	if (!document) error(404, 'This deployment does not publish terms of service');

	return { document };
};
