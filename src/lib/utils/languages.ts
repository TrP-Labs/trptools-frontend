import { locales, type Locale } from '$lib/paraglide/runtime.js';

/**
 * What each shipped language calls itself.
 *
 * Endonyms, and deliberately not run through the message files: a reader
 * looking for their own language needs to recognize it while the interface is
 * still in one they cannot read. That is true on the appearance page, where
 * they are switching the site's own language, and it is true in the flag
 * dropdown beside a text box, where they are picking which language they are
 * about to type in.
 *
 * Keyed by language tag rather than derived from `Intl.DisplayNames`, which
 * names a language in the *reader's* language — "Ukrainian" to an English
 * reader — and so answers a different question from the one being asked here.
 */
export const LANGUAGE_NAMES: Record<string, string> = {
	en: 'English',
	cs: 'Čeština',
	de: 'Deutsch',
	fr: 'Français',
	pl: 'Polski',
	ru: 'Русский',
	uk: 'Українська'
};

/**
 * Every language this build of the site ships, in a stable order.
 *
 * `locales` comes from the compiled Paraglide runtime, so it is exactly what
 * `project.inlang/settings.json` lists — the switch that decides a translation
 * is complete enough to put in front of people. Anything offering a language
 * picker asks here rather than keeping its own list, so adding a language is
 * still one line in that file.
 *
 * Sorted by endonym rather than by tag: somebody scanning for their own
 * language is reading the names.
 */
export const SITE_LOCALES: Locale[] = [...locales].sort((a, b) =>
	languageName(a).localeCompare(languageName(b))
);

/**
 * Languages shipped before their translation covers the whole site.
 *
 * Listing a locale in `project.inlang/settings.json` reads as a promise that
 * picking it gives you the site in that language. German keeps about two fifths
 * of that promise today: every key it has not reached falls back to English,
 * and a half-English page looks like something broken rather than like a
 * translation still being written. Saying so under the language is the
 * difference between the two.
 *
 * Take a language off this list when its translation reaches the whole
 * catalogue. Nothing checks that for you — in the same way nothing checks that
 * a locale in the inlang settings is finished enough to ship at all. Both are
 * one human decision, and this is the second half of it.
 */
export const PARTLY_TRANSLATED: readonly string[] = ['de'];

/** Whether a language ships without covering the whole interface. */
export function isPartlyTranslated(locale: string): boolean {
	return PARTLY_TRANSLATED.includes(locale);
}

/** A language's own name for itself, falling back to its tag. */
export function languageName(locale: string): string {
	return LANGUAGE_NAMES[locale] ?? LANGUAGE_NAMES[locale.split('-')[0]] ?? locale;
}
