import { serverApi } from '$lib/api/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { data } = await serverApi(event).auth.keys.get();
	return { keys: data ?? [] };
};
