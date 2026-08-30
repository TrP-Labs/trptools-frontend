import type { SignupSheet, SignupUser } from '$lib/api/types';
import { m } from '$lib/paraglide/messages.js';

/**
 * How full an occurrence's sheets are.
 *
 * Counted across only the sheets the viewer was actually served, so the figure
 * always matches what they can see. Someone at driver rank is told how full
 * the driver sheet is, not how full the whole shift is — the rest is not
 * theirs to know.
 */
export function signupTotals(sheets: SignupSheet[]): { filled: number; capacity: number } {
	let filled = 0;
	let capacity = 0;

	for (const sheet of sheets) {
		for (const slot of sheet.slots) {
			filled += slot.signups.length;
			capacity += slot.capacity;
		}
	}

	return { filled, capacity };
}

/** Whether a given person already holds a slot on this occurrence. */
export function findMySlot(sheets: SignupSheet[], userId: string | undefined): string | null {
	if (!userId) return null;

	for (const sheet of sheets) {
		for (const slot of sheet.slots) {
			if (slot.signups.some((signup) => signup.userId === userId)) return slot.id;
		}
	}

	return null;
}

/** What to call someone in a signup list, whichever way they signed up. */
export function signupName(signup: SignupUser): string {
	return (
		signup.displayName ||
		signup.username ||
		(signup.discordId ? m.signup_discord_user() : m.common_unknown())
	);
}
