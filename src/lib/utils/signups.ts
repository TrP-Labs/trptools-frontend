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

/**
 * Whether one of these rows is this reader, whichever way it was taken.
 *
 * A slot filled from a Discord sheet before that account was connected carries
 * only a Discord id, so matching on the TrPTools id alone would leave somebody
 * looking at their own name beside a live Sign up button — and the API would
 * then refuse the press. Connecting an account adopts those rows, so this is
 * the window between the two rather than a permanent state.
 */
export function isMine(
	signup: SignupUser,
	userId: string | undefined,
	discordId?: string | null
): boolean {
	if (userId && signup.userId === userId) return true;
	if (discordId && signup.discordId === discordId) return true;
	return false;
}

/**
 * The slot this person holds on this occurrence, across every sheet.
 *
 * One slot per shift, which is the rule both the API and the Discord menu
 * enforce — so this looks at all the sheets the reader was served rather than
 * at one of them.
 */
export function findMySlot(
	sheets: SignupSheet[],
	userId: string | undefined,
	discordId?: string | null
): string | null {
	if (!userId && !discordId) return null;

	for (const sheet of sheets) {
		for (const slot of sheet.slots) {
			if (slot.signups.some((signup) => isMine(signup, userId, discordId))) return slot.id;
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
