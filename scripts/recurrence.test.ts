import { expect, mock, test } from 'bun:test';

// West of Greenwich, an evening start is the next day in UTC — the case that
// was broken. CI runs in UTC, where it can never show, so the zone is pinned.
process.env.TZ = process.env.RECURRENCE_TZ ?? 'America/New_York';

// The module labels describeRule's fallback with a message; nothing here reads it.
mock.module('$lib/paraglide/messages.js', () => ({ m: { recurrence_custom: () => 'Custom' } }));
const { buildRule, parseRule } = await import('../src/lib/utils/recurrence');
const { rrulestr } = await import('rrule');

// The API expands rules in UTC with the shift's start as DTSTART.
function next(rule: string, start: Date, count: number) {
	return rrulestr(rule, { dtstart: start }).all((_, index) => index < count);
}

test('ticked days are the manager’s own weekdays, whatever their offset', () => {
	const start = new Date(2026, 9, 19, 20, 0); // Monday 20:00 local
	const rule = buildRule({ repeat: 'WEEKLY', days: [0, 2] }, start);
	const days = next(rule, start, 4).map((date) => date.getDay());
	expect(days).toEqual([1, 3, 1, 3]);
	expect(parseRule(rule, start)).toEqual({ repeat: 'WEEKLY', days: [0, 2] });
});

test('the first occurrence is the start itself', () => {
	const start = new Date(2026, 9, 19, 23, 30);
	const rule = buildRule({ repeat: 'WEEKLY', days: [0] }, start);
	expect(next(rule, start, 1)[0]?.getTime()).toBe(start.getTime());
});

test('weekday and weekend presets follow the local calendar', () => {
	const start = new Date(2026, 9, 19, 21, 0);
	const weekdays = buildRule({ repeat: 'WEEKDAYS', days: [] }, start);
	expect(next(weekdays, start, 5).map((date) => date.getDay())).toEqual([1, 2, 3, 4, 5]);
	expect(parseRule(weekdays, start).repeat).toBe('WEEKDAYS');
	const saturday = new Date(2026, 9, 24, 21, 0);
	const weekends = buildRule({ repeat: 'WEEKENDS', days: [] }, saturday);
	expect(next(weekends, saturday, 2).map((date) => date.getDay())).toEqual([6, 0]);
	expect(parseRule(weekends, saturday).repeat).toBe('WEEKENDS');
});
