import { error } from '@sveltejs/kit';
import { legalDocument } from '$lib/server/legal';
import type { PageServerLoad } from './$types';

/** Without a PRIVACY.md there is no page, and the footer does not link to one. */
export const load: PageServerLoad = async () => {
	const document = legalDocument('privacy');
	if (!document) error(404, 'This deployment does not publish a privacy policy');

	return { document };
};
