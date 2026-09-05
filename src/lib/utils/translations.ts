import { getLocale } from '$lib/paraglide/runtime.js';

/**
 * A group's own words, in the languages it wrote them in.
 *
 * The API ships these alongside the source text rather than resolving them
 * server-side: public reads never consult the session so they stay
 * CDN-cacheable, and resolving there would mean a cache entry per language on
 * every one of them. The site already knows which language it is drawing in.
 */
export type Translations = Record<string, Record<string, string>>;

/**
 * The version of a field to show this reader.
 *
 * Falls back to the source text — the words the group actually typed, in
 * whatever language it writes in — rather than to English. A group that runs
 * in Ukrainian and has not translated a route name should show the Ukrainian
 * name to a French reader, not nothing and not a language nobody involved
 * chose.
 *
 * Works during SSR as well as in the browser: `getLocale()` resolves from the
 * cookie and `Accept-Language` in `hooks.server.ts`, which is the same answer
 * the page will settle on once it hydrates. A field with no translation costs
 * two property lookups, so this is called inline wherever text is drawn rather
 * than pre-resolved into a parallel object nobody would remember to update.
 */
export function localized<T extends { translations?: Translations | null }>(
	entity: T | null | undefined,
	field: Extract<keyof T, string>
): string {
	if (!entity) return '';

	const source = entity[field];
	const translated = entity.translations?.[field]?.[getLocale()];

	return translated || (typeof source === 'string' ? source : '');
}

/**
 * The same, for a choice on an application question.
 *
 * Choices are stored as an array and translated by position — there is nothing
 * else stable to key them by — so this is the one field whose name is built
 * rather than being the column's own.
 */
export function localizedOption(
	entity: { options: string[]; translations?: Translations | null },
	index: number
): string {
	return entity.translations?.[`option:${index}`]?.[getLocale()] || (entity.options[index] ?? '');
}

/**
 * Whether a field has anything written in a given language.
 *
 * Used to mark which languages an editor already holds a version in, so
 * somebody filling a form in can see at a glance what is still missing.
 */
export function hasTranslation(
	translations: Translations | null | undefined,
	field: string,
	locale: string
): boolean {
	return Boolean(translations?.[field]?.[locale]?.trim());
}

/**
 * The name of the group a card belongs to.
 *
 * The dashboard mixes several groups' shifts and review queues into one list,
 * so each row carries its group's name and translations flattened alongside
 * its own — `groupName` rather than a nested group. Without this the group's
 * name on a shift row and its name on its own status card, in the same view,
 * would be in different languages.
 */
export function localizedGroup(row: {
	groupName: string;
	groupTranslations?: Translations | null;
}): string {
	return row.groupTranslations?.name?.[getLocale()] || row.groupName;
}
