import type { LayoutServerLoad } from './$types';

/**
 * Settings is no longer signed-in-only, because appearance is not.
 *
 * Theme and language live in a cookie and mean exactly as much to somebody
 * who has never signed in — a reader who lands on the English page and wants
 * Russian has nowhere else to go. The account and API-key pages guard
 * themselves instead, so the guard sits with the thing being guarded rather
 * than one level above it.
 */
export const load: LayoutServerLoad = async () => ({});
