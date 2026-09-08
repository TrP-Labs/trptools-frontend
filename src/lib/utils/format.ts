/**
 * Presentation helpers shared across the app.
 *
 * Every `Intl` call takes `getLocale()` rather than `undefined`. Left
 * undefined, `Intl` reads the runtime's own default — the server's, during
 * SSR — so a page rendered for a German reader arrived with English month
 * names and only corrected itself on hydration.
 */

import { page } from '$app/state';
import { getLocale } from '$lib/paraglide/runtime.js';
import { m } from '$lib/paraglide/messages.js';

/**
 * Whether a string is a zone `Intl` will actually accept.
 *
 * The preference is free text — an IANA name typed or pasted into a box — so
 * a stale or misspelt one has to fall back rather than throw. `Intl` raises a
 * `RangeError` on an unknown zone, and one bad value would otherwise take out
 * every date on the page rather than just its own.
 */
const zoneChecks = new Map<string, boolean>();

function usableZone(zone: string): boolean {
	const known = zoneChecks.get(zone);
	if (known !== undefined) return known;

	let ok = true;
	try {
		new Intl.DateTimeFormat('en', { timeZone: zone });
	} catch {
		ok = false;
	}

	zoneChecks.set(zone, ok);
	return ok;
}

/**
 * The zone every date on the page is drawn in, unless a caller names one.
 *
 * Read from the page data rather than passed down through every component:
 * the preference belongs to the reader, not to any one date, and threading it
 * through would mean a call site that forgot it silently rendered in the
 * server's zone instead. `null` there means nobody has chosen, and `Intl`
 * falls back to the runtime's own — the browser's, after hydration.
 *
 * On the server `page.data` is bound to the request through component context,
 * so it is only readable while a component is rendering. Everything below is
 * called from a template, but the guard is what keeps a helper that is one day
 * called from a `load` function returning a date instead of throwing.
 */
function viewerTimezone(): string | undefined {
	try {
		const zone = page.data.timezone;
		return typeof zone === 'string' && zone && usableZone(zone) ? zone : undefined;
	} catch {
		return undefined;
	}
}

/** A caller's explicit zone, this reader's, or the runtime's — in that order. */
function resolveZone(timezone?: string): string | undefined {
	if (timezone && usableZone(timezone)) return timezone;
	return viewerTimezone();
}

export function formatDateTime(value: Date | string, timezone?: string): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat(getLocale(), {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: resolveZone(timezone)
	}).format(date);
}

export function formatTime(value: Date | string, timezone?: string): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat(getLocale(), {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: resolveZone(timezone)
	}).format(date);
}

export function formatDate(value: Date | string, timezone?: string): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat(getLocale(), {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: resolveZone(timezone)
	}).format(date);
}

/** "in 2 hours", "3 days ago". */
export function formatRelative(value: Date | string): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '—';

	const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
	const formatter = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });

	const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
		[60, 'second'],
		[60, 'minute'],
		[24, 'hour'],
		[7, 'day'],
		[4.34524, 'week'],
		[12, 'month'],
		[Number.POSITIVE_INFINITY, 'year']
	];

	let duration = deltaSeconds;
	for (const [amount, unit] of divisions) {
		if (Math.abs(duration) < amount) return formatter.format(Math.round(duration), unit);
		duration /= amount;
	}

	return formatter.format(Math.round(duration), 'year');
}

/**
 * A ticking wait, as a clock rather than a rounded phrase.
 *
 * "in 2 hours" is right for a list; a countdown someone is watching has to
 * move every second, and to stop showing seconds once the wait is measured in
 * days, where a ticking last digit is only noise.
 */
export function formatCountdown(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const days = Math.floor(total / 86_400);
	const hours = Math.floor((total % 86_400) / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;

	if (days > 0) return m.format_countdown_days({ days, hours, minutes });

	const pad = (value: number) => value.toString().padStart(2, '0');
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function formatDuration(minutes: number): string {
	if (minutes < 60) return m.format_duration_minutes({ minutes });
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0
		? m.format_duration_hours({ hours })
		: m.format_duration_hours_minutes({ hours, minutes: rest });
}

export function formatNumber(value: number): string {
	return new Intl.NumberFormat(getLocale()).format(value);
}

/**
 * A route's target share, to at most two decimal places.
 *
 * Shares are stored as floating point so they can be set precisely, which
 * means a stored 33.33 can read back as 33.329999999999998 and a total of
 * three of them as 99.99999999999999. Trailing zeroes are dropped so a whole
 * share still shows as "20" rather than "20.00".
 */
export function formatShare(value: number): string {
	return String(Math.round(value * 100) / 100);
}

/**
 * The viewer's IANA timezone, for defaulting the preference.
 *
 * Called during SSR as well, where it answers with the *server's* zone — but
 * a component's state initialiser runs again on hydration, so the browser's
 * answer replaces it before anybody can act on the page. It is worth knowing
 * that the first painted frame can say something else.
 */
export function detectTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

/** Whether a zone somebody typed is one dates can actually be drawn in. */
export function isValidTimezone(zone: string): boolean {
	return usableZone(zone);
}
