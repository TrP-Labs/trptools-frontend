import { serverApi } from '$lib/api/server';
import { localized } from '$lib/utils/translations';
import type { PageServerLoad } from './$types';

/** Identity, groups and permission-filtered counts arrive together during SSR. */
export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) return { signedIn: false as const, groups: [], occurrences: [] };
	const data = event.locals.shiftsPage ?? (await serverApi(event).dashboard.shifts.get()).data;
	return {
		signedIn: true as const,
		groups: data?.groups ?? [],
		occurrences: (data?.occurrences ?? []).map((occurrence) => ({
			...occurrence,
			groupName: localized({ name: occurrence.groupName, translations: occurrence.groupTranslations }, 'name')
		}))
	};
};
