/**
 * Presentation helpers shared across the app.
 *
 * Every `Intl` call takes `getLocale()` rather than `undefined`. Left
 * undefined, `Intl` reads the runtime's own default — the server's, during
 * SSR — so a page rendered for a German reader arrived with English month
 * names and only corrected itself on hydration.
 */

import { getLocale } from '$lib/paraglide/runtime.js';
import { m } from '$lib/paraglide/messages.js';

export function formatDateTime(value: Date | string, timezone?: string): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat(getLocale(), {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: timezone || undefined
	}).format(date);
}

export function formatTime(value: Date | string, timezone?: string): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat(getLocale(), {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: timezone || undefined
	}).format(date);
}

export function formatDate(value: Date | string, timezone?: string): string {
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat(getLocale(), {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: timezone || undefined
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

/** The viewer's IANA timezone, for defaulting the preference. */
export function detectTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}
